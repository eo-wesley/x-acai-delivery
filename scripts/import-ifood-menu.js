#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const COMMAND = args[0] && !args[0].startsWith('--') ? args[0] : null;

function getArg(name) {
    const index = args.indexOf(name);
    return index !== -1 ? args[index + 1] : null;
}

const PHASE = getArg('--phase') || (COMMAND === 'run' ? 'all' : 'normalize');
const STORE_URL = process.env.IFOOD_STORE_URL
    || process.env.IFOOD_URL
    || 'https://www.ifood.com.br/delivery/sao-paulo-sp/x-acai-cidade-moncoes/79f3b413-0d12-4d26-a46c-42f65af3759b';
const PORTAL_URL = process.env.IFOOD_PORTAL_URL || 'https://portal.ifood.com.br/menu/list';
const PORTAL_API_BASE = process.env.IFOOD_PORTAL_API_BASE || 'https://portal-api.ifood.com.br/partner-catalog-bff';
const FRONTEND_URL = process.env.XACAI_FRONTEND_URL || 'https://x-acai-delivery.vercel.app';
const FRONTEND_HOST = new URL(FRONTEND_URL).host;
const ADMIN_URL = process.env.XACAI_ADMIN_URL || `${FRONTEND_URL}/admin/menu?slug=default`;
const API_URL = process.env.XACAI_API_URL || getArg('--api-url') || 'https://x-acai-production-backend.onrender.com';
const ADMIN_TOKEN = process.env.XACAI_ADMIN_TOKEN || getArg('--token') || '';
const SLUG = process.env.XACAI_SLUG || process.env.XACAI_TENANT_SLUG || getArg('--slug') || 'default';
const SNAPSHOT_PATH = process.env.IFOOD_SNAPSHOT || getArg('--snapshot') || path.join(__dirname, '../tmp/ifood-snapshot.json');
const NORMALIZED_PATH = path.join(__dirname, '../tmp/ifood-normalized.json');
const AUGMENTED_NORMALIZED_PATH = path.join(__dirname, '../apps/backend/ifood-normalized-augmented.json');
const DEBUG_PORT = Number(process.env.IFOOD_IMPORT_DEBUG_PORT || 9222);
const PROFILE_DIR = process.env.IFOOD_IMPORT_PROFILE_DIR || path.join(os.tmpdir(), 'xacai-ifood-import-profile');
const CAPTURE_WAIT_MS = Number(process.env.IFOOD_IMPORT_CAPTURE_WAIT_MS || 15000);
const DETAILS_WAIT_MS = Number(process.env.IFOOD_IMPORT_DETAILS_WAIT_MS || 2500);
const TARGET_WAIT_MS = Number(process.env.IFOOD_IMPORT_TARGET_WAIT_MS || 30000);
const DRY_RUN = args.includes('--dry-run');
const ALLOW_EXISTING_MENU = args.includes('--allow-existing') || process.env.IFOOD_IMPORT_ALLOW_EXISTING === '1';
const ALLOW_MISSING_DETAILS = args.includes('--allow-missing-details') || process.env.IFOOD_IMPORT_ALLOW_MISSING_DETAILS === '1';
const DEFAULT_RECONCILE_CATEGORIES = ['Açaí Monte O Seu', 'Açaí Copos da Promoção'];
const CATEGORY_FILTERS = (() => {
    const raw = process.env.IFOOD_IMPORT_CATEGORIES || getArg('--categories') || '';
    if (!raw) return DEFAULT_RECONCILE_CATEGORIES;
    return raw
        .split(',')
        .map(value => cleanText(value))
        .filter(Boolean);
})();

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function timestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}

function cleanText(value) {
    if (!value) return '';
    return String(value).replace(/\s+/g, ' ').trim();
}

function normalizeKey(value) {
    return cleanText(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function extractUuid(value) {
    const match = String(value || '').match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    return match ? match[0] : null;
}

function parseOwnerIdFromStoreUrl() {
    return extractUuid(STORE_URL);
}

function parseOptionalNumber(...values) {
    for (const value of values) {
        if (value === null || value === undefined || value === '') continue;
        const numeric = Number(value);
        if (Number.isFinite(numeric)) return numeric;
    }
    return null;
}

function parsePriceToCents(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') {
        if (Number.isInteger(value) && value >= 100) return value;
        return Math.round(value * 100);
    }
    const normalized = cleanText(value)
        .replace(/R\$/gi, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim();
    const numeric = Number(normalized);
    if (Number.isNaN(numeric)) return null;
    if (Number.isInteger(numeric) && numeric >= 100) return numeric;
    return Math.round(numeric * 100);
}

function firstString(source, keys) {
    for (const key of keys) {
        const value = source?.[key];
        if (typeof value === 'string' && cleanText(value)) {
            return cleanText(value);
        }
    }
    return null;
}

function firstArray(source, keys) {
    for (const key of keys) {
        if (Array.isArray(source?.[key])) return source[key];
    }
    return null;
}

function firstPrice(source) {
    const keys = ['unitPrice', 'price', 'unitMinPrice', 'promotionalPrice', 'minimumPromotionalPrice', 'additionalPrice', 'originalValue', 'value'];
    for (const key of keys) {
        const parsed = parsePriceToCents(source?.[key]);
        if (parsed !== null) return parsed;
    }
    return null;
}

function findChromeExecutable() {
    const candidates = [
        process.env.CHROME_PATH,
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    ].filter(Boolean);

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
    }

    throw new Error('Chrome/Edge nao encontrado. Defina CHROME_PATH se necessario.');
}

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} ao acessar ${url}`);
    }
    return response.json();
}

async function waitForDebugger(port, timeoutMs = TARGET_WAIT_MS) {
    const startedAt = Date.now();
    let lastError = null;
    while (Date.now() - startedAt < timeoutMs) {
        try {
            await fetchJson(`http://127.0.0.1:${port}/json/version`);
            return;
        } catch (error) {
            lastError = error;
            await sleep(500);
        }
    }
    throw new Error(`DevTools nao respondeu na porta ${port}: ${lastError?.message || 'timeout'}`);
}

class CdpClient {
    constructor(webSocketUrl) {
        this.webSocketUrl = webSocketUrl;
        this.ws = null;
        this.id = 0;
        this.pending = new Map();
        this.listeners = new Map();
    }

    async connect() {
        this.ws = new WebSocket(this.webSocketUrl);
        this.ws.onmessage = event => {
            const message = JSON.parse(event.data.toString());
            if (message.id && this.pending.has(message.id)) {
                const { resolve, reject } = this.pending.get(message.id);
                this.pending.delete(message.id);
                if (message.error) reject(new Error(message.error.message || 'CDP error'));
                else resolve(message.result);
                return;
            }
            const handlers = this.listeners.get(message.method) || [];
            for (const handler of handlers) handler(message.params);
        };

        await new Promise((resolve, reject) => {
            this.ws.onopen = resolve;
            this.ws.onerror = reject;
        });
    }

    send(method, params = {}) {
        if (!this.ws) throw new Error('CDP websocket nao conectado');
        return new Promise((resolve, reject) => {
            const messageId = ++this.id;
            this.pending.set(messageId, { resolve, reject });
            this.ws.send(JSON.stringify({ id: messageId, method, params }));
        });
    }

    on(method, handler) {
        const list = this.listeners.get(method) || [];
        list.push(handler);
        this.listeners.set(method, list);
        return () => {
            const current = this.listeners.get(method) || [];
            const next = current.filter(candidate => candidate !== handler);
            if (next.length === 0) this.listeners.delete(method);
            else this.listeners.set(method, next);
        };
    }
}

async function getTargets() {
    return fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json`);
}

async function connectToBrowserRoot() {
    const version = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
    const client = new CdpClient(version.webSocketDebuggerUrl);
    await client.connect();
    return client;
}

async function waitForTarget(predicate, timeoutMs = TARGET_WAIT_MS) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        const targets = await getTargets();
        const target = targets.find(predicate);
        if (target) return target;
        await sleep(500);
    }
    throw new Error('Target nao encontrado no Chrome remoto.');
}

async function connectToTarget(predicate) {
    const target = await waitForTarget(predicate);
    const client = new CdpClient(target.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Network.enable');
    return client;
}

async function evaluate(client, fn, argsList = []) {
    const expression = `(${fn}).apply(null, ${JSON.stringify(argsList)})`;
    const result = await client.send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
    });

    if (result.exceptionDetails) {
        const details = result.exceptionDetails.text || result.exceptionDetails.exception?.description || 'Runtime evaluation failed';
        throw new Error(details);
    }

    return result.result?.value;
}

function launchBrowser() {
    ensureDir(PROFILE_DIR);
    const executable = findChromeExecutable();
    const browserArgs = [
        `--remote-debugging-port=${DEBUG_PORT}`,
        '--remote-allow-origins=*',
        `--user-data-dir=${PROFILE_DIR}`,
        '--no-first-run',
        '--new-window',
        PORTAL_URL,
        STORE_URL,
        ADMIN_URL,
    ];

    spawn(executable, browserArgs, {
        detached: true,
        stdio: 'ignore',
    }).unref();
}

function isPortalTargetUrl(url) {
    return typeof url === 'string' && url.includes('portal.ifood.com.br/menu/');
}

function isPortalListTargetUrl(url) {
    return typeof url === 'string' && url.includes('portal.ifood.com.br/menu/list');
}

function isStoreTargetUrl(url) {
    return typeof url === 'string' && url.includes('ifood.com.br/delivery/');
}

function isAnyIfoodTargetUrl(url) {
    return typeof url === 'string' && url.includes('ifood.com.br');
}

async function connectToBestIfoodTarget() {
    const targets = await getTargets();
    const target = targets.find(candidate => isPortalListTargetUrl(candidate.url))
        || targets.find(candidate => isPortalTargetUrl(candidate.url))
        || targets.find(candidate => isStoreTargetUrl(candidate.url))
        || targets.find(candidate => isAnyIfoodTargetUrl(candidate.url));

    if (!target) {
        throw new Error('Nao encontrei aba autenticada do iFood no Chrome remoto. Abra o portal.ifood.br/menu-list ou a loja publica antes de rodar a importacao.');
    }

    const client = new CdpClient(target.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Network.enable');

    return {
        client,
        targetUrl: target.url,
        source: isPortalTargetUrl(target.url) ? 'portal' : (isStoreTargetUrl(target.url) ? 'storefront' : 'ifood'),
    };
}

function portalGroupRequired(group) {
    return Number(group?.min ?? group?.min_select ?? 0) > 0;
}

function extractPortalOptionPrice(option) {
    const extensionPayloads = Object.values(option?.extensions || {});
    for (const extension of extensionPayloads) {
        const parsed = parsePriceToCents(extension?.price);
        if (parsed !== null) return parsed;
    }

    return parsePriceToCents(
        option?.price
        ?? option?.additionalPrice
        ?? option?.product?.price
        ?? option?.product?.unitPrice
        ?? 0,
    ) ?? 0;
}

function normalizePortalOption(option, optionIndex) {
    const extensionPayloads = Object.values(option?.extensions || {});
    const availabilitySource = extensionPayloads.find(Boolean) || option || {};
    return {
        name: cleanText(option?.product?.name || option?.name || option?.description || `Opcao ${optionIndex + 1}`),
        price: extractPortalOptionPrice(option),
        available: cleanText(availabilitySource.status || option?.status || 'AVAILABLE') !== 'UNAVAILABLE',
        sort_order: parseOptionalNumber(option?.sequence, option?.sortOrder, option?.order, optionIndex) ?? optionIndex,
    };
}

function normalizePortalGroup(group, groupIndex) {
    const rawOptions = Array.isArray(group?.options) ? group.options : [];
    return {
        name: cleanText(group?.name || `Grupo ${groupIndex + 1}`),
        min_select: parseOptionalNumber(group?.min, group?.min_select, 0) ?? 0,
        max_select: parseOptionalNumber(group?.max, group?.max_select, rawOptions.length) ?? rawOptions.length,
        required: portalGroupRequired(group),
        sort_order: parseOptionalNumber(group?.sequence, group?.sortOrder, group?.order, groupIndex) ?? groupIndex,
        options: rawOptions.map((option, optionIndex) => normalizePortalOption(option, optionIndex)),
    };
}

function portalImageToUrl(imageResource) {
    if (!imageResource) return null;
    const direct = firstString(imageResource, ['url', 'imageUrl', 'path', 'uri']);
    if (!direct) return null;
    if (/^https?:\/\//i.test(direct)) return direct;
    return `https://static.ifood-static.com.br/image/upload/t_high/${direct.replace(/^\/+/, '')}`;
}

function normalizePortalProduct(detail, listingItem) {
    return {
        source_code: cleanText(detail?.id || listingItem?.source_code || ''),
        name: cleanText(detail?.name || listingItem?.name || ''),
        description: cleanText(detail?.description || listingItem?.description || '') || null,
        price: parsePriceToCents(detail?.price ?? detail?.unitPrice ?? listingItem?.price ?? 0) ?? 0,
        category: listingItem?.category || null,
        sort_order: Number(listingItem?.sort_order ?? 0),
        image: portalImageToUrl(detail?.imageResource) || listingItem?.image || null,
        optionGroups: (detail?.optionGroups || []).map((group, groupIndex) => normalizePortalGroup(group, groupIndex)),
    };
}

async function extractPortalListing(client) {
    const listing = await evaluate(client, async () => {
        const sleepInPage = ms => new Promise(resolve => window.setTimeout(resolve, ms));
        const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();

        let previousHeight = -1;
        for (let attempt = 0; attempt < 12; attempt += 1) {
            window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' });
            await sleepInPage(250);
            const nextHeight = document.documentElement.scrollHeight;
            if (Math.abs(nextHeight - previousHeight) < 4) break;
            previousHeight = nextHeight;
        }
        window.scrollTo({ top: 0, behavior: 'auto' });
        await sleepInPage(150);

        const headers = Array.from(document.querySelectorAll('button[aria-label="Edite o nome da categoria"]'));
        const productLinks = Array.from(document.querySelectorAll('a[href*="/menu/catalog/product/"]'))
            .map(link => ({
                name: normalize(link.textContent || ''),
                href: link.href,
            }))
            .filter(entry => entry.name && entry.href);

        const sections = headers.map((header, index) => {
            const rawText = normalize(header.textContent || '');
            const countMatch = rawText.match(/\((\d+)\s*iten/i);
            const count = countMatch ? Number(countMatch[1]) : null;
            const name = normalize(rawText.replace(/\(\d+\s*iten.*$/i, ''));
            return { index, name, count };
        });

        return {
            pageUrl: window.location.href,
            title: document.title,
            sections,
            productLinks,
        };
    });

    if (!listing || !Array.isArray(listing.sections) || listing.sections.length === 0) {
        throw new Error('Nao consegui ler as categorias do portal iFood aberto.');
    }

    if (!Array.isArray(listing.productLinks) || listing.productLinks.length === 0) {
        throw new Error('Nao consegui ler os produtos do portal iFood aberto.');
    }

    const categories = [];
    let cursor = 0;
    let globalSort = 0;

    for (const section of listing.sections) {
        const count = Number(section.count || 0);
        const slice = listing.productLinks.slice(cursor, cursor + count);
        cursor += count;

        categories.push({
            name: section.name,
            items: slice.map((entry, index) => ({
                source_code: extractUuid(entry.href),
                name: entry.name,
                href: entry.href,
                category: section.name,
                category_sort_order: index,
                sort_order: globalSort++,
            })),
        });
    }

    const extras = listing.productLinks.slice(cursor);
    if (extras.length > 0) {
        const fallbackName = 'Sem categoria';
        categories.push({
            name: fallbackName,
            items: extras.map((entry, index) => ({
                source_code: extractUuid(entry.href),
                name: entry.name,
                href: entry.href,
                category: fallbackName,
                category_sort_order: index,
                sort_order: globalSort++,
            })),
        });
    }

    return {
        targetUrl: listing.pageUrl,
        categories,
        totalProducts: categories.reduce((sum, category) => sum + category.items.length, 0),
    };
}

async function capturePortalAuthorizationHeader(productUrl) {
    const browser = await connectToBrowserRoot();
    const { targetId } = await browser.send('Target.createTarget', { url: productUrl });

    try {
        const target = await waitForTarget(candidate => candidate.id === targetId, 10000);
        const page = new CdpClient(target.webSocketDebuggerUrl);
        await page.connect();
        await page.send('Page.enable');
        await page.send('Network.enable');

        let authorization = null;
        const removeListener = page.on('Network.requestWillBeSent', params => {
            const requestUrl = String(params.request?.url || '');
            const header = params.request?.headers?.Authorization;
            if (!authorization && requestUrl.includes(`${PORTAL_API_BASE}/product/`) && header) {
                authorization = header;
            }
        });

        const startedAt = Date.now();
        while (!authorization && Date.now() - startedAt < TARGET_WAIT_MS) {
            await sleep(250);
        }

        removeListener();
        page.ws.close();

        if (!authorization) {
            throw new Error('Nao consegui capturar o token de autorizacao do Partner Portal.');
        }

        return authorization;
    } finally {
        try {
            await browser.send('Target.closeTarget', { targetId });
        } catch {
            // ignore close failures
        }
        browser.ws.close();
    }
}

async function fetchPortalProductDetail(productId, ownerId, authorization) {
    const response = await fetch(`${PORTAL_API_BASE}/product/${productId}?ownerId=${ownerId}`, {
        headers: {
            Authorization: authorization,
            Accept: 'application/json, text/plain, */*',
            Referer: 'https://portal.ifood.com.br/',
        },
    });

    if (!response.ok) {
        throw new Error(`Partner Portal respondeu ${response.status} para o produto ${productId}.`);
    }

    return response.json();
}

async function buildPortalSnapshot(ifoodClient, metadata = {}) {
    const ownerId = parseOwnerIdFromStoreUrl();
    if (!ownerId) {
        throw new Error('Nao consegui identificar o ownerId da loja a partir da URL configurada.');
    }

    const listing = await extractPortalListing(ifoodClient);
    const firstProduct = listing.categories.flatMap(category => category.items).find(item => item.source_code && item.href);
    if (!firstProduct) {
        throw new Error('Nenhum produto com link valido foi encontrado no portal.');
    }

    const authorization = await capturePortalAuthorizationHeader(firstProduct.href);
    const rawProducts = [];
    const categories = [];

    for (const category of listing.categories) {
        const items = [];
        for (const listingItem of category.items) {
            if (!listingItem.source_code) {
                throw new Error(`Produto sem id no portal: ${listingItem.name}`);
            }
            const detail = await fetchPortalProductDetail(listingItem.source_code, ownerId, authorization);
            rawProducts.push(detail);
            items.push(normalizePortalProduct(detail, listingItem));
        }
        categories.push({ name: category.name, items });
    }

    return {
        generated_at: new Date().toISOString(),
        ifood_url: STORE_URL,
        ifood_capture_url: listing.targetUrl || metadata.targetUrl || PORTAL_URL,
        ifood_capture_source: 'portal',
        raw_response_count: rawProducts.length,
        categories,
        detail_capture: {
            attempted: listing.totalProducts,
            clicked: listing.totalProducts,
            missed: [],
            portal_fetch_count: rawProducts.length,
        },
        portal: {
            owner_id: ownerId,
            source_url: listing.targetUrl || metadata.targetUrl || PORTAL_URL,
        },
        raw_products: rawProducts,
    };
}

function normalizeNetworkOptionGroups(source) {
    const groups = [];
    const groupArrays = [
        source?.garnishChoices,
        source?.optionGroups,
        source?.optionsGroups,
        source?.modifierGroups,
        source?.complementGroups,
        source?.complementsGroups,
        source?.additionGroups,
        source?.groups,
    ].filter(Array.isArray);

    for (const groupArray of groupArrays) {
        for (let index = 0; index < groupArray.length; index += 1) {
            const group = groupArray[index];
            const optionArray = firstArray(group, ['garnishItens', 'garnishItems', 'items', 'options', 'modifierOptions', 'complements']) || [];
            const options = optionArray
                .map((option, optionIndex) => {
                    const name = firstString(option, ['description', 'name', 'title']);
                    if (!name) return null;
                    return {
                        name,
                        price: firstPrice(option) || 0,
                        available: option.available !== false,
                        sort_order: parseOptionalNumber(option.sort_order, option.sortOrder, option.order, optionIndex) ?? optionIndex,
                    };
                })
                .filter(Boolean);

            if (options.length === 0) continue;

            const minSelect = parseOptionalNumber(
                group.min_select,
                group.minSelect,
                group.min,
                group.minChoice,
                group.minimum,
                group.minimumSelections,
                group.minimumQuantity,
            ) ?? 0;
            const maxSelect = parseOptionalNumber(
                group.max_select,
                group.maxSelect,
                group.max,
                group.maxChoice,
                group.maximum,
                group.maximumSelections,
                group.maximumQuantity,
                group.limit,
            ) ?? Math.max(1, options.length);

            groups.push({
                name: firstString(group, ['name', 'description', 'title', 'groupName']) || `Grupo ${index + 1}`,
                required: Boolean(group.required) || minSelect > 0,
                min_select: Number.isFinite(minSelect) ? minSelect : 0,
                max_select: Number.isFinite(maxSelect) ? maxSelect : Math.max(1, options.length),
                sort_order: parseOptionalNumber(group.sort_order, group.sortOrder, group.order, index) ?? index,
                options,
            });
        }
    }

    return groups;
}

function normalizeNetworkItem(source, fallback) {
    const name = firstString(source, ['description', 'name', 'title']);
    const price = firstPrice(source);
    if (!name || price === null) return null;

    return {
        source_code: String(source.code ?? source.id ?? fallback?.source_code ?? '').trim() || null,
        name,
        description: firstString(source, ['details', 'subtitle', 'info', 'longDescription']) || fallback?.description || null,
        price,
        category: fallback?.category || null,
        sort_order: Number(fallback?.sort_order ?? 0),
        image: firstString(source, ['logoUrl', 'imageUrl', 'photoUrl', 'image']) || fallback?.image || null,
        optionGroups: normalizeNetworkOptionGroups(source),
    };
}

function extractCatalogCandidates(payload, responseUrl) {
    const candidates = [];

    function visit(node, trace = 'root') {
        if (!node || typeof node !== 'object') return;

        if (Array.isArray(node)) {
            if (node.length > 0 && node.every(entry => entry && typeof entry === 'object')) {
                const categoryItems = [];
                let sortOrder = 0;

                for (const entry of node) {
                    const nestedItems = firstArray(entry, ['itens', 'items', 'products', 'menuItems']);
                    if (!nestedItems || nestedItems.length === 0) continue;

                    const categoryName = firstString(entry, ['name', 'title', 'label']) || null;

                    for (const item of nestedItems) {
                        const normalized = normalizeNetworkItem(item, {
                            category: categoryName,
                            sort_order: sortOrder,
                            source_code: item.code ?? item.id ?? null,
                        });
                        if (normalized) {
                            normalized.sort_order = sortOrder;
                            categoryItems.push(normalized);
                            sortOrder += 1;
                        }
                    }
                }

                if (categoryItems.length > 0) {
                    candidates.push({
                        kind: 'catalog',
                        url: responseUrl,
                        trace,
                        items: categoryItems,
                    });
                }

                const flatItems = [];
                for (let index = 0; index < node.length; index += 1) {
                    const normalized = normalizeNetworkItem(node[index], { sort_order: index });
                    if (normalized) {
                        normalized.sort_order = index;
                        flatItems.push(normalized);
                    }
                }

                if (flatItems.length > 0) {
                    candidates.push({
                        kind: 'flat-items',
                        url: responseUrl,
                        trace,
                        items: flatItems,
                    });
                }
            }

            node.forEach((entry, index) => visit(entry, `${trace}[${index}]`));
            return;
        }

        const singleItem = normalizeNetworkItem(node, {});
        if (singleItem && singleItem.optionGroups.length > 0) {
            candidates.push({
                kind: 'details',
                url: responseUrl,
                trace,
                items: [singleItem],
            });
        }

        for (const [key, value] of Object.entries(node)) {
            visit(value, `${trace}.${key}`);
        }
    }

    visit(payload);
    return candidates;
}

function buildBrowserSnapshot(responses, metadata = {}) {
    const parsedResponses = responses
        .map(response => {
            try {
                return {
                    ...response,
                    json: JSON.parse(response.body),
                };
            } catch {
                return null;
            }
        })
        .filter(Boolean);

    const candidates = parsedResponses.flatMap(response => extractCatalogCandidates(response.json, response.url));
    if (candidates.length === 0) {
        throw new Error('Nenhum candidato de catalogo foi encontrado nas respostas do iFood.');
    }

    candidates.sort((left, right) => right.items.length - left.items.length);
    const base = candidates[0];

    const richItemMap = new Map();
    for (const candidate of candidates) {
        for (const item of candidate.items) {
            const key = item.source_code ? `code:${item.source_code}` : `name:${item.name.toLowerCase()}`;
            const existing = richItemMap.get(key);
            const existingScore = existing
                ? existing.optionGroups.length * 10 + (existing.description ? existing.description.length : 0)
                : -1;
            const candidateScore = item.optionGroups.length * 10 + (item.description ? item.description.length : 0);
            if (!existing || candidateScore >= existingScore) {
                richItemMap.set(key, item);
            }
        }
    }

    const items = base.items.map((item, index) => {
        const key = item.source_code ? `code:${item.source_code}` : `name:${item.name.toLowerCase()}`;
        const rich = richItemMap.get(key) || {};
        return {
            source_code: item.source_code,
            name: item.name,
            description: rich.description || item.description || null,
            price: rich.price || item.price,
            category: item.category || rich.category || null,
            sort_order: index,
            image: rich.image || item.image || null,
            optionGroups: Array.isArray(rich.optionGroups) && rich.optionGroups.length > 0
                ? rich.optionGroups
                : item.optionGroups || [],
        };
    });

    const categoryMap = new Map();
    for (const item of items) {
        const categoryName = item.category || 'Sem categoria';
        if (!categoryMap.has(categoryName)) categoryMap.set(categoryName, []);
        categoryMap.get(categoryName).push(item);
    }

    return {
        generated_at: new Date().toISOString(),
        ifood_url: STORE_URL,
        ifood_capture_url: metadata.targetUrl || null,
        ifood_capture_source: metadata.source || null,
        raw_response_count: responses.length,
        categories: Array.from(categoryMap.entries()).map(([name, categoryItems]) => ({
            name,
            items: categoryItems,
        })),
    };
}

async function captureNetworkResponses(client, onBeforeCapture, settleMs = CAPTURE_WAIT_MS) {
    const requestMeta = new Map();
    const captured = [];
    const capturedIds = new Set();

    const removeResponseReceived = client.on('Network.responseReceived', params => {
        const response = params.response;
        const captureByMime = (response.mimeType || '').includes('json');
        const captureByType = params.type === 'XHR' || params.type === 'Fetch';
        const captureByUrl = (response.url || '').includes('ifood');
        if (!captureByMime && !captureByType && !captureByUrl) return;

        requestMeta.set(params.requestId, {
            url: response.url,
            status: response.status,
            mimeType: response.mimeType,
        });
    });

    const removeLoadingFinished = client.on('Network.loadingFinished', async params => {
        if (!requestMeta.has(params.requestId) || capturedIds.has(params.requestId)) return;
        capturedIds.add(params.requestId);

        try {
            const body = await client.send('Network.getResponseBody', { requestId: params.requestId });
            const rawBody = body.base64Encoded ? Buffer.from(body.body, 'base64').toString('utf8') : body.body;
            captured.push({
                ...requestMeta.get(params.requestId),
                body: rawBody,
            });
        } catch {
            // Alguns responses nao ficam disponiveis apos redirect ou navegacao.
        }
    });

    if (onBeforeCapture) await onBeforeCapture();

    await sleep(settleMs);
    removeResponseReceived();
    removeLoadingFinished();
    return captured;
}

async function clickMenuItemDetails(client, item) {
    return evaluate(client, async target => {
        const normalize = value => String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
        const sleepInPage = ms => new Promise(resolve => window.setTimeout(resolve, ms));
        const isVisible = element => {
            if (!element || !(element instanceof HTMLElement)) return false;
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none'
                && style.visibility !== 'hidden'
                && rect.width > 20
                && rect.height > 20;
        };

        const targetName = normalize(target.name);
        const targetDescription = normalize(target.description || '');
        const selectors = 'button, a, [role="button"], article, li, div';
        let previousScrollTop = -1;

        const getCandidates = () => {
            const seen = new Set();

            return Array.from(document.querySelectorAll(selectors))
                .map(node => node.closest('button, a, [role="button"]') || node)
                .filter(element => {
                    if (!element || seen.has(element) || !isVisible(element)) return false;
                    seen.add(element);
                    return true;
                })
                .map(element => {
                    const rawText = element.innerText || element.textContent || '';
                    const text = normalize(rawText);
                    if (!text || !text.includes(targetName)) return null;

                    const hasPrice = /r\$\s*\d/i.test(rawText);
                    const hasImage = Boolean(element.querySelector('img'));
                    const includesDescription = targetDescription ? text.includes(targetDescription) : false;
                    const textDelta = Math.abs(text.length - targetName.length);

                    return {
                        element,
                        text: rawText.replace(/\s+/g, ' ').trim(),
                        score: (text === targetName ? 500 : 0)
                            + (text.startsWith(targetName) ? 240 : 0)
                            + (text.includes(targetName) ? 150 : 0)
                            + (includesDescription ? 30 : 0)
                            + (hasPrice ? 40 : 0)
                            + (hasImage ? 20 : 0)
                            - textDelta,
                    };
                })
                .filter(Boolean)
                .sort((left, right) => right.score - left.score);
        };

        for (let attempt = 0; attempt < 40; attempt += 1) {
            const candidates = getCandidates();
            if (candidates.length > 0) {
                const best = candidates[0];
                best.element.scrollIntoView({ block: 'center', inline: 'center' });
                await sleepInPage(150);
                best.element.click();
                return {
                    clicked: true,
                    attempt,
                    score: best.score,
                    text: best.text.slice(0, 220),
                };
            }

            const nextScrollTop = Math.min(
                window.scrollY + Math.max(window.innerHeight * 0.8, 480),
                document.documentElement.scrollHeight,
            );

            if (Math.abs(nextScrollTop - previousScrollTop) < 4) break;

            previousScrollTop = nextScrollTop;
            window.scrollTo({ top: nextScrollTop, behavior: 'auto' });
            await sleepInPage(250);
        }

        return { clicked: false, reason: 'not_found' };
    }, [item]);
}

async function closeMenuItemDetails(client) {
    const pageCloseResult = await evaluate(client, async () => {
        const normalize = value => String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
        const sleepInPage = ms => new Promise(resolve => window.setTimeout(resolve, ms));
        const isVisible = element => {
            if (!element || !(element instanceof HTMLElement)) return false;
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none'
                && style.visibility !== 'hidden'
                && rect.width > 20
                && rect.height > 20;
        };

        const selectors = 'button, a, [role="button"], [aria-label]';
        const candidates = Array.from(document.querySelectorAll(selectors))
            .filter(isVisible)
            .map(element => ({
                element,
                label: normalize(
                    element.getAttribute('aria-label')
                    || element.getAttribute('title')
                    || element.innerText
                    || element.textContent,
                ),
            }))
            .filter(candidate => candidate.label
                && (
                    candidate.label === 'x'
                    || candidate.label.includes('fechar')
                    || candidate.label.includes('close')
                    || candidate.label.includes('voltar')
                ))
            .sort((left, right) => left.label.length - right.label.length);

        if (candidates[0]) {
            candidates[0].element.click();
            await sleepInPage(150);
            return { closed: true, method: 'button', label: candidates[0].label };
        }

        return { closed: false };
    });

    if (pageCloseResult?.closed) {
        await sleep(500);
        return pageCloseResult;
    }

    await client.send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: 'Escape',
        code: 'Escape',
        windowsVirtualKeyCode: 27,
        nativeVirtualKeyCode: 27,
    });
    await client.send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: 'Escape',
        code: 'Escape',
        windowsVirtualKeyCode: 27,
        nativeVirtualKeyCode: 27,
    });
    await sleep(500);

    return { closed: true, method: 'escape' };
}

async function captureMenuItemDetails(client, items) {
    await evaluate(client, async () => {
        window.scrollTo({ top: 0, behavior: 'auto' });
        await new Promise(resolve => window.setTimeout(resolve, 300));
        return true;
    });

    const details = {
        attempted: items.length,
        clicked: 0,
        missed: [],
    };

    for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        const clickResult = await clickMenuItemDetails(client, {
            name: item.name,
            description: item.description,
        });

        if (!clickResult?.clicked) {
            details.missed.push({
                index,
                name: item.name,
                reason: clickResult?.reason || 'not_found',
            });
            continue;
        }

        details.clicked += 1;
        await sleep(DETAILS_WAIT_MS);
        await closeMenuItemDetails(client);
        await sleep(350);
    }

    return details;
}

async function captureBrowserSnapshot() {
    const ifoodTarget = await connectToBestIfoodTarget();
    const ifoodClient = ifoodTarget.client;
    let adminContext = {
        token: ADMIN_TOKEN || null,
        slug: SLUG,
        href: null,
    };

    try {
        const adminClient = await connectToTarget(target => (target.url || '').includes(FRONTEND_HOST));
        adminContext = await evaluate(adminClient, () => ({
            token: window.localStorage.getItem('admin_token'),
            slug: window.localStorage.getItem('admin_slug') || 'default',
            href: window.location.href,
        }));
    } catch (error) {
        if (!ADMIN_TOKEN) {
            throw new Error(`Nao encontrei aba do admin do X-Acai no Chrome remoto e tambem nao recebi XACAI_ADMIN_TOKEN. ${error.message}`);
        }
        console.warn(`\n[WARN] Aba do admin nao encontrada no Chrome remoto. Vou usar o token fornecido por ambiente para continuar: ${error.message}`);
    }

    if (!adminContext?.token) {
        if (!ADMIN_TOKEN) {
            throw new Error('Nao encontrei admin_token no frontend. Faca login no admin do X-Acai antes de rodar a importacao.');
        }
        adminContext = {
            token: ADMIN_TOKEN,
            slug: SLUG,
            href: null,
        };
    }

    let snapshot = null;
    let rawPath = null;
    let archivedSnapshotPath = null;

    if (ifoodTarget.source === 'portal') {
        snapshot = await buildPortalSnapshot(ifoodClient, ifoodTarget);
    } else {
        const catalogResponses = await captureNetworkResponses(ifoodClient, async () => {
            await ifoodClient.send('Page.reload', { ignoreCache: true });
        });

        if (catalogResponses.length === 0) {
            throw new Error('Nenhuma resposta de rede relevante foi capturada do iFood. Garanta que o menu da loja esteja visivel no navegador.');
        }

        const initialSnapshot = buildBrowserSnapshot(catalogResponses, ifoodTarget);
        let detailStats = null;
        const detailResponses = await captureNetworkResponses(ifoodClient, async () => {
            detailStats = await captureMenuItemDetails(
                ifoodClient,
                initialSnapshot.categories.flatMap(category => category.items || []),
            );
        }, 1500);
        const mergedResponses = [...catalogResponses, ...detailResponses];
        snapshot = buildBrowserSnapshot(mergedResponses, ifoodTarget);
        snapshot.detail_capture = {
            attempted: detailStats.attempted,
            clicked: detailStats.clicked,
            missed: detailStats.missed,
            initial_response_count: catalogResponses.length,
            detail_response_count: detailResponses.length,
            merged_response_count: mergedResponses.length,
        };

        const stamp = timestamp();
        rawPath = path.join(path.dirname(SNAPSHOT_PATH), `ifood-browser-raw-${stamp}.json`);
        archivedSnapshotPath = path.join(path.dirname(SNAPSHOT_PATH), `ifood-browser-snapshot-${stamp}.json`);
        fs.writeFileSync(rawPath, JSON.stringify(mergedResponses, null, 2), 'utf8');
        fs.writeFileSync(archivedSnapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');
    }

    snapshot.admin = {
        slug: adminContext.slug || SLUG,
        href: adminContext.href,
    };

    ensureDir(path.dirname(SNAPSHOT_PATH));
    const stamp = timestamp();
    if (!rawPath) {
        rawPath = path.join(path.dirname(SNAPSHOT_PATH), `ifood-browser-raw-${stamp}.json`);
        fs.writeFileSync(rawPath, JSON.stringify(snapshot.raw_products || [], null, 2), 'utf8');
    }
    if (!archivedSnapshotPath) {
        archivedSnapshotPath = path.join(path.dirname(SNAPSHOT_PATH), `ifood-browser-snapshot-${stamp}.json`);
        fs.writeFileSync(archivedSnapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');
    }
    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), 'utf8');

    return {
        rawPath,
        snapshotPath: SNAPSHOT_PATH,
        archivedSnapshotPath,
        snapshot,
        adminToken: adminContext.token,
        slug: adminContext.slug || SLUG,
    };
}

function isNormalizedItemsArray(raw) {
    return Array.isArray(raw)
        && raw.length > 0
        && raw.every(item => item && typeof item === 'object' && typeof item.name === 'string' && Object.prototype.hasOwnProperty.call(item, 'price_cents'));
}

function summarizeNormalizedMenu(normalizedItems) {
    const categoryMap = new Map();
    let totalGroups = 0;
    let totalOptions = 0;

    for (const item of normalizedItems) {
        const category = item.category || 'Sem categoria';
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
        const groups = Array.isArray(item.option_groups) ? item.option_groups : [];
        totalGroups += groups.length;
        totalOptions += groups.reduce((count, group) => count + ((group.options || []).length), 0);
    }

    console.log(`  OK Categorias encontradas : ${categoryMap.size}`);
    console.log(`  OK Produtos encontrados   : ${normalizedItems.length}`);
    console.log(`  OK Grupos de opcao        : ${totalGroups}`);
    console.log(`  OK Itens de opcao         : ${totalOptions}`);

    return {
        totalItems: normalizedItems.length,
        totalGroups,
        totalOptions,
        totalCategories: categoryMap.size,
    };
}

function validateCaptureCompleteness(rawSnapshot, stats) {
    if (!rawSnapshot || typeof rawSnapshot !== 'object') return;

    const captureUrl = rawSnapshot.ifood_capture_url || rawSnapshot.ifood_url || '(desconhecida)';
    const captureSource = rawSnapshot.ifood_capture_source || 'snapshot';
    console.log(`  OK Origem capturada       : ${captureSource}`);
    console.log(`  OK URL capturada          : ${captureUrl}`);

    const details = rawSnapshot.detail_capture || null;
    if (details) {
        console.log(`  OK Detalhes clicados      : ${details.clicked}/${details.attempted}`);
        if (!ALLOW_MISSING_DETAILS && Number(details.attempted) > 0 && Number(details.clicked) === 0) {
            throw new Error('A captura nao abriu nenhum item de detalhe no iFood. Abortei a importacao para evitar menu sem complementos. Use --allow-missing-details apenas se tiver certeza do snapshot.');
        }
    }

    if (!ALLOW_MISSING_DETAILS && stats.totalItems > 0 && stats.totalGroups === 0) {
        throw new Error('O snapshot nao trouxe grupos de opcao/complementos. Abortei a importacao para evitar catalogo incompleto. Use --allow-missing-details apenas se esse cardapio realmente nao tiver adicionais.');
    }
}

function extractAndValidate(raw) {
    console.log('\n[FASE 1] Validando snapshot iFood...');

    if (!raw || typeof raw !== 'object') {
        throw new Error('Snapshot invalido: precisa ser um objeto JSON.');
    }

    let categories = [];

    if (Array.isArray(raw)) categories = raw;
    else if (Array.isArray(raw.categories)) categories = raw.categories;
    else if (Array.isArray(raw.catalog)) categories = raw.catalog;
    else if (Array.isArray(raw.data)) categories = raw.data;
    else if (raw.code !== undefined && raw.data && raw.data.menu) {
        const menuEntries = Array.isArray(raw.data.menu) ? raw.data.menu : Object.values(raw.data.menu);
        categories = menuEntries.map(category => ({
            name: category.name || category.code || 'Categoria',
            items: (category.itens || category.items || []).map(item => ({
                ...item,
                name: item.description || item.name || '',
                description: item.details || null,
                price: item.unitPrice || item.unitMinPrice || 0,
                image: item.logoUrl || null,
                optionGroups: item.complementsCategories || [],
            })),
        }));
        console.log('  [!] Extraido de: data.menu (formato /v1/merchant/catalog)');
    } else if (raw.props && raw.props.initialState) {
        const initialState = raw.props.initialState;
        if (Array.isArray(initialState.restaurant?.categories) && initialState.restaurant.categories.length > 0) {
            categories = initialState.restaurant.categories;
            console.log('  [!] Extraido de: props.initialState.restaurant.categories');
        } else if (Array.isArray(initialState.catalogCategory?.items) && initialState.catalogCategory.items.length > 0) {
            categories = initialState.catalogCategory.items;
            console.log('  [!] Extraido de: props.initialState.catalogCategory.items');
        } else if (Array.isArray(initialState.restaurant?.filteredCatalog) && initialState.restaurant.filteredCatalog.length > 0) {
            categories = initialState.restaurant.filteredCatalog;
            console.log('  [!] Extraido de: props.initialState.restaurant.filteredCatalog');
        } else {
            const capturedPage = raw.page || '(desconhecida)';
            const restaurantName = initialState.restaurant?.details?.name || '(vazio)';
            throw new Error(
                `Snapshot do iFood capturado mas sem cardapio.\n`
                + `  Pagina capturada: ${capturedPage}\n`
                + `  Restaurante nos dados: "${restaurantName}"`,
            );
        }
    } else if (raw.merchantId && Array.isArray(raw.sections)) {
        categories = raw.sections
            .map(section => ({
                name: section.title || section.name || 'Categoria',
                items: (section.items || section.cards || []).map(card => card.item || card),
            }))
            .filter(category => category.items.length > 0);
        console.log('  [!] Extraido de: formato API v2/home/catalog');
    } else {
        throw new Error(`Snapshot iFood nao reconhecido. Chaves encontradas: ${Object.keys(raw).join(', ')}`);
    }

    if (categories.length === 0) {
        throw new Error('Snapshot sem categorias. Verifique se o cardapio estava visivel antes de capturar.');
    }

    let totalItems = 0;
    let totalGroups = 0;
    let totalOptions = 0;

    for (const category of categories) {
        const items = category.items || category.products || category.itens || [];
        totalItems += items.length;
        for (const item of items) {
            const groups = item.optionGroups || item.option_groups || item.choices || item.complementsCategories || item.modifierGroups || [];
            totalGroups += groups.length;
            for (const group of groups) {
                totalOptions += (group.options || group.optionItems || group.items || group.complements || group.modifierOptions || []).length;
            }
        }
    }

    console.log(`  OK Categorias encontradas : ${categories.length}`);
    console.log(`  OK Produtos encontrados   : ${totalItems}`);
    console.log(`  OK Grupos de opcao        : ${totalGroups}`);
    console.log(`  OK Itens de opcao         : ${totalOptions}`);

    if (totalItems === 0) {
        throw new Error('Snapshot sem produtos. Verifique se a sessao do iFood estava autenticada e a loja visivel.');
    }

    return { categories, stats: { totalItems, totalGroups, totalOptions } };
}

function normalizeName(raw) {
    if (!raw || typeof raw !== 'string') return '';
    return raw.trim();
}

function applyExactChoiceHeuristic(group) {
    const groupName = normalizeName(group?.name || '');
    const exactChoiceMatch = groupName.match(/escolha\s+(\d+)/i);
    if (!exactChoiceMatch) {
        return {
            ...group,
            min_select: Number(group?.min_select ?? 0),
            max_select: Number(group?.max_select ?? 0),
            required: Boolean(group?.required),
        };
    }

    const exactCount = Number(exactChoiceMatch[1]);
    if (!Number.isFinite(exactCount) || exactCount <= 0) {
        return {
            ...group,
            min_select: Number(group?.min_select ?? 0),
            max_select: Number(group?.max_select ?? 0),
            required: Boolean(group?.required),
        };
    }

    return {
        ...group,
        min_select: exactCount,
        max_select: exactCount,
        required: true,
    };
}

function applySelectionHeuristics(normalizedItems) {
    return normalizedItems.map(item => ({
        ...item,
        option_groups: (item.option_groups || []).map(group => applyExactChoiceHeuristic(group)),
    }));
}

function normalizePrice(raw) {
    if (raw === null || raw === undefined) return 0;
    const numeric = Number(raw);
    if (Number.isNaN(numeric)) return 0;
    if (!Number.isInteger(numeric)) return Math.round(numeric * 100);
    if (numeric >= 100) return Math.round(numeric);
    return Math.round(numeric * 100);
}

function normalizeItem(rawItem, itemIndex) {
    const name = normalizeName(rawItem.name || rawItem.description || rawItem.title || '');
    if (!name) {
        throw new Error(`Item sem nome na posicao ${itemIndex}: ${JSON.stringify(rawItem).substring(0, 120)}`);
    }

    const price_cents = normalizePrice(rawItem.unitPrice ?? rawItem.price ?? rawItem.originalValue ?? rawItem.value ?? 0);
    const image_url = rawItem.logoUrl || rawItem.image || rawItem.imageUrl || rawItem.logo || null;
    const description = normalizeName(rawItem.details || rawItem.subtitle || rawItem.description || '') || null;
    const rawGroups = rawItem.optionGroups
        || rawItem.option_groups
        || rawItem.choices
        || rawItem.complementsCategories
        || rawItem.modifierGroups
        || [];

    const option_groups = rawGroups.map((group, groupIndex) => {
        const groupName = normalizeName(group.name || group.category || group.title || `Grupo ${groupIndex + 1}`);
        const rawOptions = group.options || group.optionItems || group.items || group.complements || group.modifierOptions || [];
        const minQty = parseOptionalNumber(
            group.min_select,
            group.minSelect,
            group.min,
            group.minChoice,
            group.minimumSelections,
            group.minimumQuantity,
        ) ?? 0;
        const maxQty = parseOptionalNumber(
            group.max_select,
            group.maxSelect,
            group.max,
            group.maxChoice,
            group.maximumSelections,
            group.maximumQuantity,
            group.limit,
        ) ?? Math.max(1, rawOptions.length);

        return {
            name: groupName,
            min_select: minQty,
            max_select: maxQty,
            required: Boolean(group.required) || minQty > 0,
            sort_order: parseOptionalNumber(group.sort_order, group.sortOrder, group.order, groupIndex) ?? groupIndex,
            options: rawOptions.map((option, optionIndex) => ({
                name: normalizeName(option.name || option.description || `Opcao ${optionIndex + 1}`),
                price_cents: normalizePrice(option.price ?? option.additionalPrice ?? option.unitPrice ?? option.value ?? 0),
                sort_order: parseOptionalNumber(option.sort_order, option.sortOrder, option.order, optionIndex) ?? optionIndex,
                available: option.available !== false,
            })),
        };
    });

    return {
        name,
        description,
        price_cents,
        image_url,
        available: rawItem.available !== false,
        option_groups,
    };
}

function normalizeMenu({ categories }) {
    console.log('\n[FASE 2] Normalizando cardapio iFood para schema X-Acai...');

    const normalized = [];
    let globalItemIndex = 0;

    for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex += 1) {
        const category = categories[categoryIndex];
        const categoryName = normalizeName(category.name || category.category || category.title || `Categoria ${categoryIndex + 1}`);
        const rawItems = category.items || category.products || category.itens || [];

        console.log(`  Categoria [${categoryIndex}] "${categoryName}": ${rawItems.length} produto(s)`);

        for (let itemIndex = 0; itemIndex < rawItems.length; itemIndex += 1) {
            const item = normalizeItem(rawItems[itemIndex], globalItemIndex);
            item.category = categoryName;
            item.sort_order = globalItemIndex;
            normalized.push(item);
            globalItemIndex += 1;
        }
    }

    console.log(`\n  OK Total normalizado: ${normalized.length} produto(s)`);
    return normalized;
}

async function apiRequest(method, route, token, slug, body) {
    const url = `${API_URL}/api${route}?slug=${encodeURIComponent(slug)}`;
    const response = await fetch(url, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text().catch(() => '');
    let parsed = null;
    try {
        parsed = text ? JSON.parse(text) : null;
    } catch {
        parsed = text;
    }

    if (!response.ok) {
        throw new Error(`${method} ${url} falhou (${response.status}): ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`);
    }

    return parsed;
}

async function writeToXacai(normalizedItems, runtimeToken, runtimeSlug) {
    console.log('\n[FASE 3] Escrevendo cardapio em producao via API oficial do X-Acai...');

    if (!runtimeToken) {
        throw new Error('XACAI_ADMIN_TOKEN nao definido. Defina a variavel de ambiente, use --token, ou rode pelo modo autenticado do navegador.');
    }

    const existingMenu = await apiRequest('GET', '/admin/menu', runtimeToken, runtimeSlug);
    if (Array.isArray(existingMenu) && existingMenu.length > 0 && !ALLOW_EXISTING_MENU) {
        throw new Error('O menu de producao nao esta vazio. Use --allow-existing ou IFOOD_IMPORT_ALLOW_EXISTING=1 somente se quiser importar sobre um catalogo ja existente.');
    }

    const results = { created: [], failed: [] };

    for (let index = 0; index < normalizedItems.length; index += 1) {
        const item = normalizedItems[index];
        process.stdout.write(`  [${index + 1}/${normalizedItems.length}] ${item.name}...`);

        if (DRY_RUN) {
            console.log(' (DRY RUN, pulando)');
            continue;
        }

        try {
            const itemFailures = [];
            const created = await apiRequest('POST', '/admin/menu', runtimeToken, runtimeSlug, {
                name: item.name,
                description: item.description,
                price_cents: item.price_cents,
                category: item.category,
                image_url: item.image_url,
                available: item.available,
                sort_order: item.sort_order,
                tags: [],
            });

            const menuItemId = created?.id;
            if (!menuItemId) {
                throw new Error('API nao retornou id do produto');
            }

            for (const group of item.option_groups) {
                let groupResponse = null;
                try {
                    groupResponse = await apiRequest('POST', `/admin/menu/${menuItemId}/options/groups`, runtimeToken, runtimeSlug, {
                        name: group.name,
                        min_select: group.min_select,
                        max_select: group.max_select,
                        required: group.required,
                        sort_order: group.sort_order,
                    });
                } catch (error) {
                    console.warn(`\n    [WARN] Falha ao criar grupo "${group.name}": ${error.message}`);
                    itemFailures.push(`grupo ${group.name}: ${error.message}`);
                    continue;
                }

                const groupId = groupResponse?.id;
                if (!groupId) {
                    console.warn(`\n    [WARN] Grupo "${group.name}" nao retornou id, pulando opcoes.`);
                    itemFailures.push(`grupo ${group.name}: sem id retornado`);
                    continue;
                }

                for (const option of group.options) {
                    try {
                        await apiRequest('POST', `/admin/menu/options/groups/${groupId}/items`, runtimeToken, runtimeSlug, {
                            name: option.name,
                            price_cents: option.price_cents,
                            sort_order: option.sort_order,
                            available: option.available,
                        });
                    } catch (error) {
                        console.warn(`\n    [WARN] Falha ao criar opcao "${option.name}": ${error.message}`);
                        itemFailures.push(`opcao ${option.name}: ${error.message}`);
                    }
                }
            }

            if (itemFailures.length > 0) {
                results.failed.push({ name: item.name, error: itemFailures.join(' | ') });
                console.log(` WARN ${itemFailures.length} divergencia(s) detectada(s)`);
                continue;
            }

            results.created.push({ id: menuItemId, name: item.name });
            console.log(` OK (id: ${menuItemId})`);
        } catch (error) {
            results.failed.push({ name: item.name, error: error.message });
            console.log(` FAIL ${error.message}`);
        }
    }

    console.log('\n--- RESULTADO DA ESCRITA ---');
    console.log(`  OK Criados com sucesso : ${results.created.length}`);
    console.log(`  FAIL Falhas            : ${results.failed.length}`);

    if (results.failed.length > 0) {
        console.log('\n  ITENS COM FALHA:');
        results.failed.forEach(result => console.log(`    - ${result.name}: ${result.error}`));
    }

    return results;
}

function buildItemKey(item) {
    return `${cleanText(item.category || 'Sem categoria')}|||${cleanText(item.name)}`.toLowerCase();
}

function buildGroupKey(group) {
    return cleanText(group?.name || '').toLowerCase();
}

function buildOptionKey(option) {
    return cleanText(option?.name || '').toLowerCase();
}

function isSelectedCategory(category, selectedCategories = CATEGORY_FILTERS) {
    const normalizedCategory = cleanText(category);
    return selectedCategories.some(entry => cleanText(entry) === normalizedCategory);
}

function filterNormalizedItemsByCategories(normalizedItems, selectedCategories = CATEGORY_FILTERS) {
    return normalizedItems.filter(item => isSelectedCategory(item.category, selectedCategories));
}

function normalizeAvailability(value) {
    return value === false || value === 0 ? 0 : 1;
}

function normalizeRequired(value) {
    return value === true || value === 1 ? 1 : 0;
}

function summarizeGroup(group) {
    const options = group.options || [];
    return `${group.name}:${options.length}`;
}

function findBestGroupMatch(desiredGroup, currentGroups, matchedIds) {
    const byName = currentGroups.find(group => !matchedIds.has(group.id) && buildGroupKey(group) === buildGroupKey(desiredGroup));
    if (byName) return byName;
    return currentGroups.find(group => !matchedIds.has(group.id) && Number(group.sort_order ?? -1) === Number(desiredGroup.sort_order ?? -2)) || null;
}

function findBestOptionMatch(desiredOption, currentOptions, matchedIds) {
    const byName = currentOptions.find(option => !matchedIds.has(option.id) && buildOptionKey(option) === buildOptionKey(desiredOption));
    if (byName) return byName;
    return currentOptions.find(option => !matchedIds.has(option.id) && Number(option.sort_order ?? -1) === Number(desiredOption.sort_order ?? -2)) || null;
}

async function deleteGroupWithOptions(group, runtimeToken, runtimeSlug) {
    const options = Array.isArray(group.options) ? group.options : [];
    for (const option of options) {
        await apiRequest('DELETE', `/admin/menu/options/items/${option.id}`, runtimeToken, runtimeSlug);
    }
    await apiRequest('DELETE', `/admin/menu/options/groups/${group.id}`, runtimeToken, runtimeSlug);
}

async function reconcileGroupOptions(currentGroup, desiredGroup, runtimeToken, runtimeSlug, stats) {
    const currentOptions = Array.isArray(currentGroup.options) ? currentGroup.options : [];
    const matchedOptionIds = new Set();

    for (const desiredOption of desiredGroup.options || []) {
        const existingOption = findBestOptionMatch(desiredOption, currentOptions, matchedOptionIds);

        if (!existingOption) {
            if (!DRY_RUN) {
                await apiRequest('POST', `/admin/menu/options/groups/${currentGroup.id}/items`, runtimeToken, runtimeSlug, {
                    name: desiredOption.name,
                    price_cents: desiredOption.price_cents,
                    sort_order: desiredOption.sort_order,
                    available: desiredOption.available,
                });
            }
            stats.createdOptions += 1;
            continue;
        }

        matchedOptionIds.add(existingOption.id);
        const needsUpdate =
            cleanText(existingOption.name) !== cleanText(desiredOption.name)
            || Number(existingOption.price_cents ?? 0) !== Number(desiredOption.price_cents ?? 0)
            || Number(existingOption.sort_order ?? 0) !== Number(desiredOption.sort_order ?? 0)
            || normalizeAvailability(existingOption.available) !== normalizeAvailability(desiredOption.available);

        if (needsUpdate) {
            if (!DRY_RUN) {
                await apiRequest('PUT', `/admin/menu/options/items/${existingOption.id}`, runtimeToken, runtimeSlug, {
                    name: desiredOption.name,
                    price_cents: desiredOption.price_cents,
                    sort_order: desiredOption.sort_order,
                    available: desiredOption.available,
                });
            }
            stats.updatedOptions += 1;
        } else {
            stats.skippedOptions += 1;
        }
    }

    const extraOptions = currentOptions.filter(option => !matchedOptionIds.has(option.id));
    for (const extraOption of extraOptions) {
        if (!DRY_RUN) {
            await apiRequest('DELETE', `/admin/menu/options/items/${extraOption.id}`, runtimeToken, runtimeSlug);
        }
        stats.deletedOptions += 1;
    }
}

async function reconcileMenuOptions(normalizedItems, runtimeToken, runtimeSlug, selectedCategories = CATEGORY_FILTERS) {
    console.log(`\n[FASE 5] Reconciliando grupos/opcoes em producao para: ${selectedCategories.join(' | ')}`);

    if (!runtimeToken) {
        throw new Error('XACAI_ADMIN_TOKEN nao definido para reconciliar grupos/opcoes.');
    }

    const targetItems = filterNormalizedItemsByCategories(normalizedItems, selectedCategories);
    if (targetItems.length === 0) {
        throw new Error('Nenhum item alvo encontrado no snapshot normalizado para reconciliacao.');
    }

    const currentMenu = await apiRequest('GET', '/admin/menu', runtimeToken, runtimeSlug);
    const currentMenuByKey = new Map(currentMenu.map(item => [buildItemKey(item), item]));
    const stats = {
        createdGroups: 0,
        updatedGroups: 0,
        deletedGroups: 0,
        skippedGroups: 0,
        createdOptions: 0,
        updatedOptions: 0,
        deletedOptions: 0,
        skippedOptions: 0,
        missingItems: [],
    };

    for (const desiredItem of targetItems) {
        const currentItem = currentMenuByKey.get(buildItemKey(desiredItem));
        if (!currentItem) {
            stats.missingItems.push(`${desiredItem.category} / ${desiredItem.name}`);
            continue;
        }

        const currentGroups = await apiRequest('GET', `/admin/menu/${currentItem.id}/options`, runtimeToken, runtimeSlug);
        const matchedGroupIds = new Set();

        for (const desiredGroup of desiredItem.option_groups || []) {
            const existingGroup = findBestGroupMatch(desiredGroup, currentGroups, matchedGroupIds);

            if (!existingGroup) {
                let groupId = null;
                if (!DRY_RUN) {
                    const createdGroup = await apiRequest('POST', `/admin/menu/${currentItem.id}/options/groups`, runtimeToken, runtimeSlug, {
                        name: desiredGroup.name,
                        min_select: desiredGroup.min_select,
                        max_select: desiredGroup.max_select,
                        required: desiredGroup.required,
                        sort_order: desiredGroup.sort_order,
                    });
                    groupId = createdGroup?.id;
                    if (!groupId) {
                        throw new Error(`Falha ao criar grupo ${desiredGroup.name} para ${desiredItem.name}: sem id retornado.`);
                    }
                    for (const desiredOption of desiredGroup.options || []) {
                        await apiRequest('POST', `/admin/menu/options/groups/${groupId}/items`, runtimeToken, runtimeSlug, {
                            name: desiredOption.name,
                            price_cents: desiredOption.price_cents,
                            sort_order: desiredOption.sort_order,
                            available: desiredOption.available,
                        });
                    }
                }
                stats.createdGroups += 1;
                stats.createdOptions += (desiredGroup.options || []).length;
                continue;
            }

            matchedGroupIds.add(existingGroup.id);
            const needsGroupUpdate =
                cleanText(existingGroup.name) !== cleanText(desiredGroup.name)
                || Number(existingGroup.min_select ?? 0) !== Number(desiredGroup.min_select ?? 0)
                || Number(existingGroup.max_select ?? 0) !== Number(desiredGroup.max_select ?? 0)
                || Number(existingGroup.sort_order ?? 0) !== Number(desiredGroup.sort_order ?? 0)
                || normalizeRequired(existingGroup.required) !== normalizeRequired(desiredGroup.required);

            if (needsGroupUpdate) {
                if (!DRY_RUN) {
                    await apiRequest('PUT', `/admin/menu/options/groups/${existingGroup.id}`, runtimeToken, runtimeSlug, {
                        name: desiredGroup.name,
                        min_select: desiredGroup.min_select,
                        max_select: desiredGroup.max_select,
                        sort_order: desiredGroup.sort_order,
                        required: desiredGroup.required,
                    });
                }
                stats.updatedGroups += 1;
            } else {
                stats.skippedGroups += 1;
            }

            await reconcileGroupOptions(existingGroup, desiredGroup, runtimeToken, runtimeSlug, stats);
        }

        const refreshedGroups = await apiRequest('GET', `/admin/menu/${currentItem.id}/options`, runtimeToken, runtimeSlug);
        const retainedGroupIds = new Set();

        for (const desiredGroup of desiredItem.option_groups || []) {
            const matchedGroup = findBestGroupMatch(desiredGroup, refreshedGroups, retainedGroupIds);
            if (matchedGroup) {
                retainedGroupIds.add(matchedGroup.id);
            }
        }

        const extraGroups = refreshedGroups.filter(group => !retainedGroupIds.has(group.id));
        for (const extraGroup of extraGroups) {
            if (!DRY_RUN) {
                await deleteGroupWithOptions(extraGroup, runtimeToken, runtimeSlug);
            }
            stats.deletedGroups += 1;
            stats.deletedOptions += (extraGroup.options || []).length;
        }
    }

    console.log(`  OK Grupos criados       : ${stats.createdGroups}`);
    console.log(`  OK Grupos atualizados   : ${stats.updatedGroups}`);
    console.log(`  OK Grupos removidos     : ${stats.deletedGroups}`);
    console.log(`  OK Opcoes criadas       : ${stats.createdOptions}`);
    console.log(`  OK Opcoes atualizadas   : ${stats.updatedOptions}`);
    console.log(`  OK Opcoes removidas     : ${stats.deletedOptions}`);
    console.log(`  OK Itens ausentes       : ${stats.missingItems.length}`);

    if (stats.missingItems.length > 0) {
        stats.missingItems.forEach(entry => console.warn(`    [WARN] Item ausente no menu atual: ${entry}`));
    }

    return stats;
}

async function verifyMenuOptions(normalizedItems, runtimeToken, runtimeSlug, selectedCategories = CATEGORY_FILTERS) {
    console.log(`\n[FASE 6] Verificando diff final das categorias: ${selectedCategories.join(' | ')}`);

    if (!runtimeToken) {
        throw new Error('XACAI_ADMIN_TOKEN nao definido para verificar grupos/opcoes.');
    }

    const targetItems = filterNormalizedItemsByCategories(normalizedItems, selectedCategories);
    const currentMenu = await apiRequest('GET', '/admin/menu', runtimeToken, runtimeSlug);
    const currentMenuByKey = new Map(currentMenu.map(item => [buildItemKey(item), item]));
    const mismatches = [];

    for (const desiredItem of targetItems) {
        const currentItem = currentMenuByKey.get(buildItemKey(desiredItem));
        if (!currentItem) {
            mismatches.push({
                category: desiredItem.category,
                name: desiredItem.name,
                reason: 'item_missing',
            });
            continue;
        }

        const currentGroups = await apiRequest('GET', `/admin/menu/${currentItem.id}/options`, runtimeToken, runtimeSlug);
        const normalizedCurrentGroups = (currentGroups || []).map(group => ({
            name: cleanText(group.name),
            min_select: Number(group.min_select ?? 0),
            max_select: Number(group.max_select ?? 0),
            required: normalizeRequired(group.required),
            sort_order: Number(group.sort_order ?? 0),
            options: (group.options || []).map(option => ({
                name: cleanText(option.name),
                price_cents: Number(option.price_cents ?? 0),
                sort_order: Number(option.sort_order ?? 0),
                available: normalizeAvailability(option.available),
            })).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
        })).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

        const normalizedDesiredGroups = (desiredItem.option_groups || []).map(group => ({
            name: cleanText(group.name),
            min_select: Number(group.min_select ?? 0),
            max_select: Number(group.max_select ?? 0),
            required: normalizeRequired(group.required),
            sort_order: Number(group.sort_order ?? 0),
            options: (group.options || []).map(option => ({
                name: cleanText(option.name),
                price_cents: Number(option.price_cents ?? 0),
                sort_order: Number(option.sort_order ?? 0),
                available: normalizeAvailability(option.available),
            })).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
        })).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

        if (JSON.stringify(normalizedCurrentGroups) !== JSON.stringify(normalizedDesiredGroups)) {
            mismatches.push({
                category: desiredItem.category,
                name: desiredItem.name,
                current: normalizedCurrentGroups.map(summarizeGroup).join(' || '),
                expected: normalizedDesiredGroups.map(summarizeGroup).join(' || '),
            });
        }
    }

    console.log(`  OK Mismatches finais    : ${mismatches.length}`);
    mismatches.forEach(mismatch => {
        console.warn(`    [WARN] ${mismatch.category} / ${mismatch.name}`);
        console.warn(`           atual    : ${mismatch.current || mismatch.reason}`);
        console.warn(`           esperado : ${mismatch.expected || mismatch.reason}`);
    });

    return { mismatches };
}

async function syncMenuSortOrder(normalizedItems, runtimeToken, runtimeSlug) {
    console.log('\n[FASE 4] Sincronizando sort_order dos itens importados...');

    if (!runtimeToken) {
        throw new Error('XACAI_ADMIN_TOKEN nao definido para sincronizar sort_order.');
    }

    const currentMenu = await apiRequest('GET', '/admin/menu', runtimeToken, runtimeSlug);
    if (!Array.isArray(currentMenu) || currentMenu.length === 0) {
        throw new Error('Nao encontrei itens no menu atual para sincronizar sort_order.');
    }

    const desiredByKey = new Map(normalizedItems.map(item => [buildItemKey(item), item]));
    const results = { updated: 0, skipped: 0, missing: [] };

    for (const currentItem of currentMenu) {
        const desired = desiredByKey.get(buildItemKey(currentItem));
        if (!desired) {
            results.missing.push({ id: currentItem.id, name: currentItem.name, category: currentItem.category });
            continue;
        }

        const currentSort = Number(currentItem.sort_order ?? 0);
        const desiredSort = Number(desired.sort_order ?? 0);
        if (currentSort === desiredSort) {
            results.skipped += 1;
            continue;
        }

        if (!DRY_RUN) {
            await apiRequest('PUT', `/admin/menu/${currentItem.id}`, runtimeToken, runtimeSlug, {
                sort_order: desiredSort,
            });
        }

        results.updated += 1;
    }

    console.log(`  OK Atualizados          : ${results.updated}`);
    console.log(`  OK Ja corretos          : ${results.skipped}`);
    console.log(`  OK Sem correspondencia  : ${results.missing.length}`);

    if (results.missing.length > 0) {
        results.missing.slice(0, 10).forEach(item => {
            console.warn(`    [WARN] Item sem match no snapshot: ${item.category} / ${item.name}`);
        });
    }

    return results;
}

function printSnapshotInstructions() {
    console.error(`\nSnapshot nao encontrado: ${SNAPSHOT_PATH}`);
    console.error('\nCaminhos disponiveis para capturar o catalogo do iFood:');
    console.error('  1. Recomendado: node scripts/import-ifood-menu.js open');
    console.error('     - faca login no iFood e no admin do X-Acai');
    console.error('     - depois rode: node scripts/import-ifood-menu.js run');
    console.error('  2. Fallback manual: gerar tmp/ifood-snapshot.json e usar --phase normalize/write');
    console.error(`  3. Reconciliacao em menu ja importado: node scripts/import-ifood-menu.js reconcile-options --snapshot "${AUGMENTED_NORMALIZED_PATH}"`);
}

async function main() {
    console.log('===============================================================');
    console.log('  X-Acai - Importador de Cardapio iFood');
    console.log(`  Comando: ${COMMAND || 'snapshot'} | Fase: ${PHASE.toUpperCase()} | Alvo: ${API_URL} | Slug: ${SLUG}`);
    if (DRY_RUN) console.log('  [WARN] DRY RUN ativo - nada sera gravado em producao');
    console.log('===============================================================');

    if (COMMAND === 'open') {
        launchBrowser();
        await waitForDebugger(DEBUG_PORT);
        console.log(`Chrome remoto aberto na porta ${DEBUG_PORT}.`);
        console.log(`Portal iFood: ${PORTAL_URL}`);
        console.log(`iFood: ${STORE_URL}`);
        console.log(`Admin: ${ADMIN_URL}`);
        console.log('Faca login no iFood e no admin do X-Acai nessas abas, deixe o portal/menu ou a loja visivel e depois rode:');
        console.log('  node scripts/import-ifood-menu.js run');
        return;
    }

    let raw = null;
    let runtimeToken = ADMIN_TOKEN;
    let runtimeSlug = SLUG;

    if (COMMAND === 'run') {
        await waitForDebugger(DEBUG_PORT);
        const capture = await captureBrowserSnapshot();
        raw = capture.snapshot;
        runtimeToken = capture.adminToken || runtimeToken;
        runtimeSlug = capture.slug || runtimeSlug;

        console.log(`Snapshot salvo em: ${capture.snapshotPath}`);
        console.log(`Snapshot arquivado em: ${capture.archivedSnapshotPath}`);
        console.log(`Respostas cruas salvas em: ${capture.rawPath}`);
        console.log(`Categorias capturadas: ${(capture.snapshot.categories || []).length}`);
        console.log(`Produtos capturados: ${(capture.snapshot.categories || []).reduce((total, category) => total + (category.items || []).length, 0)}`);
        console.log(`Detalhes clicados: ${capture.snapshot.detail_capture?.clicked || 0}/${capture.snapshot.detail_capture?.attempted || 0}`);
    } else {
        const fallbackSnapshotPath = COMMAND === 'reconcile-options' && fs.existsSync(AUGMENTED_NORMALIZED_PATH)
            ? AUGMENTED_NORMALIZED_PATH
            : null;
        const resolvedSnapshotPath = fs.existsSync(SNAPSHOT_PATH) ? SNAPSHOT_PATH : fallbackSnapshotPath;

        if (!resolvedSnapshotPath) {
            printSnapshotInstructions();
            process.exit(1);
        }
        raw = JSON.parse(fs.readFileSync(resolvedSnapshotPath, 'utf8'));
    }

    let extracted = null;
    let normalized = null;
    let stats = null;

    if (isNormalizedItemsArray(raw)) {
        console.log('\n[FASE 1] Snapshot ja esta normalizado. Pulando extracao bruta...');
        normalized = applySelectionHeuristics(raw);
        stats = summarizeNormalizedMenu(normalized);
    } else {
        extracted = extractAndValidate(raw);
        stats = extracted.stats;
        if (PHASE === 'extract') {
            console.log('\nOK Fase extract concluida. Snapshot valido.');
            return;
        }
        normalized = applySelectionHeuristics(normalizeMenu(extracted));
    }

    validateCaptureCompleteness(raw, stats);

    ensureDir(path.dirname(NORMALIZED_PATH));
    fs.writeFileSync(NORMALIZED_PATH, JSON.stringify(normalized, null, 2), 'utf8');
    console.log(`\nSnapshot normalizado salvo em: ${NORMALIZED_PATH}`);

    if (COMMAND === 'sync-sort-order') {
        await syncMenuSortOrder(normalized, runtimeToken, runtimeSlug);
        console.log('\nOK Sincronizacao de sort_order concluida com sucesso.');
        return;
    }

    if (COMMAND === 'reconcile-options') {
        await reconcileMenuOptions(normalized, runtimeToken, runtimeSlug, CATEGORY_FILTERS);
        const verification = await verifyMenuOptions(normalized, runtimeToken, runtimeSlug, CATEGORY_FILTERS);
        if (verification.mismatches.length > 0) {
            throw new Error(`Reconciliacao concluida, mas ainda restaram ${verification.mismatches.length} mismatch(es).`);
        }
        console.log('\nOK Reconciliacao de grupos/opcoes concluida com sucesso.');
        return;
    }

    if (PHASE === 'normalize') {
        console.log('\nOK Fase normalize concluida.');
        return;
    }

    if (PHASE === 'write' || PHASE === 'all') {
        const results = await writeToXacai(normalized, runtimeToken, runtimeSlug);
        await syncMenuSortOrder(normalized, runtimeToken, runtimeSlug);
        await reconcileMenuOptions(normalized, runtimeToken, runtimeSlug, CATEGORY_FILTERS);
        const verification = await verifyMenuOptions(normalized, runtimeToken, runtimeSlug, CATEGORY_FILTERS);
        if (results.failed.length > 0 || verification.mismatches.length > 0) {
            console.log(`\n[WARN] Importacao concluiu com ${results.failed.length} falha(s) de escrita e ${verification.mismatches.length} mismatch(es) finais.`);
            process.exit(1);
        }
        console.log('\nOK Importacao concluida com sucesso.');
        return;
    }

    throw new Error(`Fase nao suportada: ${PHASE}`);
}

main().catch(error => {
    console.error(`\nErro fatal: ${error.message}`);
    process.exit(1);
});
