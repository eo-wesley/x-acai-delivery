import { randomUUID } from 'crypto';
import { getDb } from '../db/db.client';
import { RouteService } from './route.service';

export interface DeliveryAddressInput {
    cep: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state?: string;
    complement?: string;
}

export interface VerifiedDeliveryAddress {
    cep: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    complement?: string;
    latitude: number;
    longitude: number;
    distanceKm: number;
    feeCents: number;
    estimatedMinutes: number;
    quoteId: string;
    expiresAt: string;
}

export class DeliveryQuoteError extends Error {
    constructor(
        message: string,
        public readonly statusCode = 422,
    ) {
        super(message);
        this.name = 'DeliveryQuoteError';
    }
}

type ViaCepAddress = {
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
    erro?: boolean;
};

type GeocodedPoint = {
    latitude: number;
    longitude: number;
};

const routeService = new RouteService();
const geocodeCache = new Map<string, { point: GeocodedPoint; expiresAt: number }>();
const GEOCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const QUOTE_TTL_MS = 10 * 60 * 1000;

function clean(value: unknown): string {
    return String(value ?? '').trim();
}

function normalize(value: unknown): string {
    return clean(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

function addressesMatch(input: string, canonical: string): boolean {
    const a = normalize(input);
    const b = normalize(canonical);
    if (!a || !b) return false;
    const withoutType = (value: string) => value.replace(/^(rua|r|avenida|av|alameda|al|travessa|tv|estrada|rodovia)\s+/, '');
    const aShort = withoutType(a);
    const bShort = withoutType(b);
    return a === b || a.includes(b) || b.includes(a)
        || aShort === bShort || aShort.includes(bShort) || bShort.includes(aShort);
}

function validNumber(value: string): boolean {
    // Accepts normal house numbers and forms such as 12-A or 12/14, but not a
    // blank value or "s/n". The number is needed for house-level geocoding.
    return /^[0-9]+[a-zA-Z]?(?:[-/][0-9a-zA-Z]+)?$/.test(value);
}

async function fetchJson<T>(url: string, init: RequestInit, label: string): Promise<T> {
    try {
        const response = await fetch(url, { ...init, signal: AbortSignal.timeout(7000) });
        if (!response.ok) throw new Error(`${label} respondeu HTTP ${response.status}`);
        return await response.json() as T;
    } catch (error: any) {
        console.error(`[DeliveryQuote] ${label}:`, error?.message || error);
        throw new DeliveryQuoteError(
            'Não foi possível confirmar o endereço agora. Confira os dados e tente novamente.',
            503,
        );
    }
}

async function lookupCep(cep: string): Promise<Required<Pick<ViaCepAddress, 'logradouro' | 'bairro' | 'localidade' | 'uf'>>> {
    const data = await fetchJson<ViaCepAddress>(
        `https://viacep.com.br/ws/${cep}/json/`,
        { headers: { Accept: 'application/json' } },
        'ViaCEP',
    );

    if (data.erro || !data.logradouro || !data.bairro || !data.localidade || !data.uf) {
        throw new DeliveryQuoteError('CEP não encontrado. Confira o CEP informado.');
    }

    return {
        logradouro: data.logradouro,
        bairro: data.bairro,
        localidade: data.localidade,
        uf: data.uf,
    };
}

async function geocode(query: string): Promise<GeocodedPoint> {
    const key = normalize(query);
    const cached = geocodeCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.point;

    const baseUrl = process.env.DELIVERY_GEOCODER_URL || 'https://nominatim.openstreetmap.org/search';
    const url = `${baseUrl}?format=jsonv2&addressdetails=1&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`;
    const data = await fetchJson<Array<{ lat?: string; lon?: string }>>(
        url,
        {
            headers: {
                Accept: 'application/json',
                'User-Agent': process.env.DELIVERY_GEOCODER_USER_AGENT || 'X-Acai-Delivery/1.0 (address verification)',
            },
        },
        'Geocodificador',
    );

    const result = data[0];
    const latitude = Number(result?.lat);
    const longitude = Number(result?.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new DeliveryQuoteError('Não consegui localizar esse número nessa rua. Confira rua, número e CEP.');
    }

    const point = { latitude, longitude };
    geocodeCache.set(key, { point, expiresAt: Date.now() + GEOCODE_CACHE_TTL_MS });
    return point;
}

function round(value: number, digits = 1): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function formatAddress(address: DeliveryAddressInput, canonical: ViaCepAddress): string {
    const complement = clean(address.complement);
    return `${canonical.logradouro}, ${address.number}${complement ? ` - ${complement}` : ''}, ${canonical.bairro} - ${canonical.localidade}/${canonical.uf} (CEP: ${address.cep})`;
}

export class DeliveryQuoteService {
    async calculate(tenantId: string, input: DeliveryAddressInput): Promise<VerifiedDeliveryAddress> {
        const cep = clean(input.cep).replace(/\D/g, '');
        const street = clean(input.street);
        const number = clean(input.number);
        const neighborhood = clean(input.neighborhood);
        const city = clean(input.city);

        if (cep.length !== 8) throw new DeliveryQuoteError('Informe um CEP válido com 8 dígitos.');
        if (!street) throw new DeliveryQuoteError('Informe a rua ou avenida.');
        if (!validNumber(number)) throw new DeliveryQuoteError('Informe um número de endereço válido.');
        if (!neighborhood) throw new DeliveryQuoteError('Informe o bairro.');
        if (!city) throw new DeliveryQuoteError('Informe a cidade.');

        const cepAddress = await lookupCep(cep);
        if (!addressesMatch(street, cepAddress.logradouro)) {
            throw new DeliveryQuoteError(`A rua não corresponde ao CEP. O CEP indica: ${cepAddress.logradouro}.`);
        }
        if (!addressesMatch(neighborhood, cepAddress.bairro)) {
            throw new DeliveryQuoteError(`O bairro não corresponde ao CEP. O CEP indica: ${cepAddress.bairro}.`);
        }
        if (!addressesMatch(city, cepAddress.localidade)) {
            throw new DeliveryQuoteError(`A cidade não corresponde ao CEP. O CEP indica: ${cepAddress.localidade}.`);
        }
        if (input.state && !addressesMatch(input.state, cepAddress.uf)) {
            throw new DeliveryQuoteError(`O estado não corresponde ao CEP. O CEP indica: ${cepAddress.uf}.`);
        }

        const db = await getDb();
        const restaurant = await db.get<{
            address?: string;
            city?: string;
            prep_time_minutes?: number;
            delivery_fee_cents?: number;
            delivery_included_km?: number;
            delivery_fee_per_km_cents?: number;
            delivery_max_distance_km?: number;
            delivery_origin_lat?: number;
            delivery_origin_lng?: number;
        }>(
            `SELECT address, city, prep_time_minutes, delivery_fee_cents,
                    delivery_included_km, delivery_fee_per_km_cents,
                    delivery_max_distance_km, delivery_origin_lat, delivery_origin_lng
             FROM restaurants WHERE id = ?`,
            [tenantId],
        );

        if (!restaurant) throw new DeliveryQuoteError('Loja não encontrada.', 404);

        const destination = await geocode(
            `${cepAddress.logradouro}, ${number}, ${cepAddress.bairro}, ${cepAddress.localidade}, ${cepAddress.uf}, Brazil`,
        );

        let origin: GeocodedPoint;
        if (Number.isFinite(Number(restaurant.delivery_origin_lat)) && Number.isFinite(Number(restaurant.delivery_origin_lng))) {
            origin = {
                latitude: Number(restaurant.delivery_origin_lat),
                longitude: Number(restaurant.delivery_origin_lng),
            };
        } else {
            const storeAddress = clean(restaurant.address);
            const storeCity = clean(restaurant.city) || cepAddress.localidade;
            if (!storeAddress || !storeCity) {
                throw new DeliveryQuoteError('A localização da loja ainda não foi configurada. Fale com o estabelecimento.', 503);
            }
            origin = await geocode(`${storeAddress}, ${storeCity}, Brazil`);
        }

        const route = await routeService.getRoute(
            [origin.latitude, origin.longitude],
            [destination.latitude, destination.longitude],
        );
        if (!route || !Number.isFinite(route.distance) || !Number.isFinite(route.duration)) {
            throw new DeliveryQuoteError('Não foi possível calcular a rota até esse endereço agora. Tente novamente.', 503);
        }

        const distanceKm = round(route.distance / 1000, 1);
        const maxDistanceKm = Number(process.env.DELIVERY_MAX_DISTANCE_KM ?? restaurant.delivery_max_distance_km ?? 8);
        if (Number.isFinite(maxDistanceKm) && maxDistanceKm > 0 && distanceKm > maxDistanceKm) {
            throw new DeliveryQuoteError(`Esse endereço está fora da área de entrega (máximo ${round(maxDistanceKm, 1)} km).`);
        }

        const baseFeeCents = Math.max(0, Math.round(Number(restaurant.delivery_fee_cents ?? 500)));
        const includedKm = Math.max(0, Number(restaurant.delivery_included_km ?? 3));
        const perKmCents = Math.max(0, Math.round(Number(restaurant.delivery_fee_per_km_cents ?? 150)));
        const feeCents = Math.round(baseFeeCents + Math.max(0, distanceKm - includedKm) * perKmCents);
        const prepMinutes = Math.max(0, Math.round(Number(restaurant.prep_time_minutes ?? 30)));
        const routeMinutes = Math.max(1, Math.ceil(route.duration / 60 * 1.2));
        const expiresAt = new Date(Date.now() + QUOTE_TTL_MS).toISOString();

        return {
            cep,
            street: cepAddress.logradouro,
            number,
            neighborhood: cepAddress.bairro,
            city: cepAddress.localidade,
            state: cepAddress.uf,
            complement: clean(input.complement) || undefined,
            latitude: destination.latitude,
            longitude: destination.longitude,
            distanceKm,
            feeCents,
            estimatedMinutes: prepMinutes + routeMinutes,
            quoteId: randomUUID(),
            expiresAt,
        };
    }

    formatAddress(address: VerifiedDeliveryAddress): string {
        return formatAddress(address, {
            logradouro: address.street,
            bairro: address.neighborhood,
            localidade: address.city,
            uf: address.state,
        });
    }
}

export const deliveryQuoteService = new DeliveryQuoteService();
