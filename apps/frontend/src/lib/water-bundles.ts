import { buildCartKey, type CartItem, type SelectedOption } from '../components/CartContext';

export type BundleMode = 'water' | 'two-waters';

export interface WaterBundleProduct {
    id: string;
    name: string;
    category?: string | null;
    price_cents: number;
    image_url?: string | null;
    hidden?: number | boolean | null;
    available?: number | boolean | null;
    out_of_stock?: number | boolean | null;
}

export interface WaterBundle<T extends WaterBundleProduct = WaterBundleProduct> {
    baseProduct: T;
    waterProduct: T;
    waterQty: 1 | 2;
    title: string;
    description: string;
    price_cents: number;
    href: string;
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const validPrice = (value: number) => Number.isSafeInteger(value) && value >= 0;

function isActive(product: WaterBundleProduct): boolean {
    return Boolean(product.id.trim()) && validPrice(product.price_cents)
        && product.hidden !== true && product.hidden !== 1
        && product.available !== false && product.available !== 0
        && product.out_of_stock !== true && product.out_of_stock !== 1;
}

function isStillWater(product: WaterBundleProduct): boolean {
    const name = normalize(product.name);
    return /\bbebidas?\b/.test(normalize(product.category || ''))
        && /\bagua\b/.test(name) && /\bsem gas\b/.test(name) && /\b500\s*ml\b/.test(name)
        && !/\bcom gas\b/.test(name);
}

function isBaseForMode(product: WaterBundleProduct, mode: BundleMode): boolean {
    const category = normalize(product.category || '');
    const name = normalize(product.name);
    if (/\b(marmitex|barca|litrao|roleta)\b/.test(name)) return false;
    if (mode === 'water') {
        return /\bmonte\b/.test(category)
            && /\b(?:acai|copo)(?: de)? 500\s*ml\b/.test(name);
    }
    return /\bcombos?\b/.test(category)
        && (/\bacai 300\s*ml escolha 2 opcoes\b/.test(name)
            || /\b2 copos(?: de)? 300\s*ml\b/.test(name));
}

/** Composes existing catalog entries; it never creates a product or fixes a price. */
export function getWaterBundle<T extends WaterBundleProduct>(
    menu: readonly T[], productId: string, mode: string | null,
): WaterBundle<T> | null {
    if (mode !== 'water' && mode !== 'two-waters') return null;
    const baseProduct = menu.find(product => product.id === productId);
    if (!baseProduct || !isActive(baseProduct) || !isBaseForMode(baseProduct, mode)) return null;
    const waterProduct = menu.find(product => isActive(product) && isStillWater(product));
    if (!waterProduct || waterProduct.id === baseProduct.id) return null;
    const waterQty = mode === 'water' ? 1 : 2;
    const price_cents = baseProduct.price_cents + waterQty * waterProduct.price_cents;
    if (!validPrice(price_cents)) return null;
    return {
        baseProduct,
        waterProduct,
        waterQty,
        title: mode === 'water'
            ? 'Monte o Seu 500 ml + água 500 ml'
            : 'Dupla X-Açaí — 2 copos de 300 ml + 2 águas de 500 ml',
        description: mode === 'water'
            ? '1 copo de 500 ml com 3 complementos + 1 água sem gás de 500 ml. Personalize o açaí; adicionais somados à parte.'
            : '2 copos de 300 ml, com os sabores do combo, + 2 águas sem gás de 500 ml. Personalize os copos; adicionais somados à parte.',
        price_cents,
        href: `/product/${encodeURIComponent(baseProduct.id)}?bundle=${mode}`,
    };
}

/** Checkout sends real menuItemIds, options and notes; water is a separate item. */
export function buildBundleCartItems(
    bundle: WaterBundle, selectedOptions: SelectedOption[], qty: number, notes: string,
): CartItem[] {
    if (!Number.isSafeInteger(qty) || qty < 1 || !Number.isSafeInteger(qty * bundle.waterQty)
        || !isActive(bundle.baseProduct) || !isActive(bundle.waterProduct)) return [];

    // Drink groups are hidden in the bundle UI. Ignore any stale drink selections too.
    const options = selectedOptions.filter(option =>
        !/\bbebidas?\b|drink/.test(normalize(option.groupName))
        && option.optionId !== bundle.waterProduct.id
        && !( /\bagua\b/.test(normalize(option.optionName)) && /\bsem gas\b/.test(normalize(option.optionName)) ),
    );
    if (options.some(option => !validPrice(option.price_cents))) return [];
    const baseUnitPrice = bundle.baseProduct.price_cents + options.reduce((sum, option) => sum + option.price_cents, 0);
    const total = (baseUnitPrice + bundle.waterQty * bundle.waterProduct.price_cents) * qty;
    if (!validPrice(baseUnitPrice) || !validPrice(total)) return [];

    const baseNotes = [
        `Pacote: ${bundle.title}. Bebida em item separado: ${bundle.waterQty} × ${bundle.waterProduct.name}.`,
        notes.trim(),
    ].filter(Boolean).join('\n');
    const waterNotes = `Bebida do pacote: ${bundle.title}.`;
    return [
        {
            cartKey: buildCartKey(bundle.baseProduct.id, options, baseNotes),
            menuItemId: bundle.baseProduct.id,
            name: bundle.baseProduct.name,
            base_price_cents: bundle.baseProduct.price_cents,
            price_cents: baseUnitPrice,
            qty,
            notes: baseNotes,
            selected_options: options,
        },
        {
            cartKey: buildCartKey(bundle.waterProduct.id, [], waterNotes),
            menuItemId: bundle.waterProduct.id,
            name: bundle.waterProduct.name,
            base_price_cents: bundle.waterProduct.price_cents,
            price_cents: bundle.waterProduct.price_cents,
            qty: qty * bundle.waterQty,
            notes: waterNotes,
            selected_options: [],
        },
    ];
}
