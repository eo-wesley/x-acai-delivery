const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const DEFAULT_IFOOD_URL = process.env.IFOOD_STORE_URL || process.env.IFOOD_URL || 'https://www.ifood.com.br/delivery/sao-paulo-sp/x-acai-cidade-moncoes/79f3b413-0d12-4d26-a46c-42f65af3759b';
const DEFAULT_FRONTEND_URL = process.env.XACAI_FRONTEND_URL || 'https://x-acai-delivery.vercel.app';
const DEFAULT_ADMIN_URL = process.env.XACAI_ADMIN_URL || `${DEFAULT_FRONTEND_URL}/admin/menu?slug=default`;
const DEFAULT_API_URL = process.env.XACAI_API_URL || 'https://x-acai-production-backend.onrender.com';
const DEFAULT_SLUG = process.env.XACAI_TENANT_SLUG || 'default';
const DEBUG_PORT = Number(process.env.IFOOD_IMPORT_DEBUG_PORT || 9222);
const PROFILE_DIR = process.env.IFOOD_IMPORT_PROFILE_DIR || path.join(os.tmpdir(), 'xacai-ifood-import-profile');
const OUTPUT_DIR = process.env.IFOOD_IMPORT_OUTPUT_DIR || path.join(process.cwd(), 'tmp', 'ifood-import');
const CAPTURE_WAIT_MS = Number(process.env.IFOOD_IMPORT_CAPTURE_WAIT_MS || 15000);
const CLICK_DETAILS_WAIT_MS = Number(process.env.IFOOD_IMPORT_DETAILS_WAIT_MS || 2500);
const MAX_TARGET_WAIT_MS = Number(process.env.IFOOD_IMPORT_TARGET_WAIT_MS || 30000);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function timestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
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

async function waitForDebugger(port, timeoutMs = MAX_TARGET_WAIT_MS) {
    const started = Date.now();
    let lastError = null;

    while (Date.now() - started < timeoutMs) {
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
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.ws = null;
        this.id = 0;
        this.pending = new Map();
        this.listeners = new Map();
    }

    async connect() {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onmessage = event => {
            const message = JSON.parse(event.data.toString());

            if (message.id && this.pending.has(message.id)) {
                const { resolve, reject } = this.pending.get(message.id);
                this.pending.delete(message.id);
                if (message.error) {
                    reject(new Error(message.error.message || 'CDP error'));
                } else {
                    resolve(message.result);
                }
                return;
            }

            const handlers = this.listeners.get(message.method) || [];
            for (const handler of handlers) {
                handler(message.params);
            }
        };

        await new Promise((resolve, reject) => {
            this.ws.onopen = resolve;
            this.ws.onerror = reject;
        });
    }

    send(method, params = {}) {
        if (!this.ws) {
            throw new Error('CDP websocket nao conectado');
        }

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
    }

    async close() {
        if (!this.ws) return;
        await new Promise(resolve => {
            this.ws.onclose = resolve;
            this.ws.close();
        });
    }
}

async function getTargets() {
    return fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json`);
}

async function waitForTarget(predicate, timeoutMs = MAX_TARGET_WAIT_MS) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
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

async function evaluate(client, fn, args = []) {
    const expression = `(${fn}).apply(null, ${JSON.stringify(args)})`;
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
    const args = [
        `--remote-debugging-port=${DEBUG_PORT}`,
        '--remote-allow-origins=*',
        `--user-data-dir=${PROFILE_DIR}`,
        '--no-first-run',
        '--new-window',
        DEFAULT_IFOOD_URL,
        DEFAULT_ADMIN_URL,
    ];

    spawn(executable, args, {
        detached: true,
        stdio: 'ignore',
    }).unref();
}

function cleanText(value) {
    if (!value) return '';
    return String(value).replace(/\s+/g, ' ').trim();
}

function parsePriceToCents(value) {
    if (value === null || value === undefined || value === '') return null;

    if (typeof value === 'number') {
        if (Number.isInteger(value) && value >= 100) return value;
        return Math.round(value * 100);
    }

    const text = cleanText(value);
    if (!text) return null;
    const normalized = text
        .replace(/R\$/gi, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim();

    const numeric = Number(normalized);
    if (!Number.isNaN(numeric)) {
        if (Number.isInteger(numeric) && numeric >= 100) return numeric;
        return Math.round(numeric * 100);
    }

    return null;
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
    const keys = ['unitPrice', 'price', 'unitMinPrice', 'promotionalPrice', 'minimumPromotionalPrice', 'value'];
    for (const key of keys) {
        const parsed = parsePriceToCents(source?.[key]);
        if (parsed !== null) return parsed;
    }
    return null;
}

function isProductLike(node) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return false;
    const name = firstString(node, ['description', 'name', 'title']);
    const price = firstPrice(node);
    return Boolean(name && price !== null);
}

function normalizeOptionGroups(source) {
    const groups = [];
    const groupArrays = [
        ...[source?.garnishChoices, source?.optionGroups, source?.optionsGroups, source?.modifierGroups].filter(Array.isArray),
    ];

    for (const groupArray of groupArrays) {
        for (let index = 0; index < groupArray.length; index += 1) {
            const group = groupArray[index];
            const optionArray = firstArray(group, ['garnishItens', 'items', 'options', 'modifierOptions']) || [];
            const options = optionArray
                .map((option, optionIndex) => {
                    const name = firstString(option, ['description', 'name', 'title']);
                    if (!name) return null;
                    return {
                        name,
                        price_cents: firstPrice(option) || 0,
                        available: option.available !== false,
                        sort_order: option.sort_order ?? optionIndex,
                    };
                })
                .filter(Boolean);

            if (options.length === 0) continue;

            const minSelect = Number(group.min_select ?? group.min ?? group.minimum ?? 0);
            const maxSelect = Number(group.max_select ?? group.max ?? group.maximum ?? 1);

            groups.push({
                name: firstString(group, ['name', 'description', 'title']) || `Grupo ${index + 1}`,
                required: Boolean(group.required) || minSelect > 0,
                min_select: Number.isFinite(minSelect) ? minSelect : 0,
                max_select: Number.isFinite(maxSelect) ? maxSelect : Math.max(1, options.length),
                sort_order: Number(group.sort_order ?? index),
                options,
            });
        }
    }

    return groups;
}

function normalizeItem(source, fallback) {
    const name = firstString(source, ['description', 'name', 'title']);
    const priceCents = firstPrice(source);

    if (!name || priceCents === null) return null;

    return {
        source_code: String(source.code ?? source.id ?? fallback?.source_code ?? '').trim() || null,
        name,
        description: firstString(source, ['details', 'subtitle', 'info', 'longDescription']) || fallback?.description || null,
        price_cents: priceCents,
        category: fallback?.category || null,
        sort_order: Number(fallback?.sort_order ?? 0),
        image_url: firstString(source, ['logoUrl', 'imageUrl', 'photoUrl', 'image']) || fallback?.image_url || null,
        option_groups: normalizeOptionGroups(source),
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
                        const normalized = normalizeItem(item, {
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
                    const normalized = normalizeItem(node[index], { sort_order: index });
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

        const singleItem = normalizeItem(node, {});
        if (singleItem && singleItem.option_groups.length > 0) {
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

function buildSnapshot(responses) {
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
            const existingScore = existing ? existing.option_groups.length * 10 + (existing.description ? existing.description.length : 0) : -1;
            const candidateScore = item.option_groups.length * 10 + (item.description ? item.description.length : 0);
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
            price_cents: rich.price_cents || item.price_cents,
            category: item.category || rich.category || null,
            sort_order: index,
            image_url: rich.image_url || item.image_url || null,
            option_groups: Array.isArray(rich.option_groups) && rich.option_groups.length > 0 ? rich.option_groups : item.option_groups || [],
        };
    });

    const categories = [];
    const seenCategories = new Set();
    for (const item of items) {
        const key = item.category || 'Sem categoria';
        if (seenCategories.has(key)) continue;
        seenCategories.add(key);
        categories.push(key);
    }

    return {
        generated_at: new Date().toISOString(),
        ifood_url: DEFAULT_IFOOD_URL,
        item_count: items.length,
        categories,
        items,
        raw_response_count: responses.length,
    };
}

async function captureNetworkResponses(client, onBeforeCapture) {
    const requestMeta = new Map();
    const captured = [];
    const capturedIds = new Set();

    client.on('Network.responseReceived', params => {
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

    client.on('Network.loadingFinished', async params => {
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
            // Some responses cannot be retrieved after redirect/navigation.
        }
    });

    if (onBeforeCapture) {
        await onBeforeCapture();
    }

    await sleep(CAPTURE_WAIT_MS);
    return captured;
}

async function captureSession() {
    const ifoodClient = await connectToTarget(target => (target.url || '').includes('ifood.com.br'));
    const adminClient = await connectToTarget(target => (target.url || '').includes('x-acai-delivery.vercel.app'));

    const adminContext = await evaluate(adminClient, () => ({
        token: window.localStorage.getItem('admin_token'),
        slug: window.localStorage.getItem('admin_slug') || 'default',
        href: window.location.href,
    }));

    if (!adminContext?.token) {
        throw new Error('Nao encontrei admin_token no frontend. Faça login no admin do X-Acai antes de rodar a importacao.');
    }

    const responses = await captureNetworkResponses(ifoodClient, async () => {
        await ifoodClient.send('Page.reload', { ignoreCache: true });
    });

    if (responses.length === 0) {
        throw new Error('Nenhuma resposta de rede relevante foi capturada do iFood. Garanta que o menu da loja esteja visivel no navegador.');
    }

    const snapshot = buildSnapshot(responses);
    snapshot.admin = {
        slug: adminContext.slug || DEFAULT_SLUG,
        href: adminContext.href,
    };

    ensureDir(OUTPUT_DIR);
    const stamp = timestamp();
    const rawPath = path.join(OUTPUT_DIR, `ifood-raw-${stamp}.json`);
    const snapshotPath = path.join(OUTPUT_DIR, `ifood-snapshot-${stamp}.json`);

    fs.writeFileSync(rawPath, JSON.stringify(responses, null, 2));
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

    return {
        rawPath,
        snapshotPath,
        snapshot,
        adminToken: adminContext.token,
        slug: adminContext.slug || DEFAULT_SLUG,
    };
}

async function apiRequest(url, token, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
    });

    const text = await response.text();
    let body = null;
    try {
        body = text ? JSON.parse(text) : null;
    } catch {
        body = text;
    }

    if (!response.ok) {
        throw new Error(`${response.status} ${url} -> ${typeof body === 'string' ? body : JSON.stringify(body)}`);
    }

    return body;
}

async function importSnapshot(snapshot, adminToken, slug) {
    const existingMenu = await apiRequest(`${DEFAULT_API_URL}/api/admin/menu?slug=${encodeURIComponent(slug)}`, adminToken, { method: 'GET' });
    if (Array.isArray(existingMenu) && existingMenu.length > 0 && process.env.IFOOD_IMPORT_ALLOW_EXISTING !== '1') {
        throw new Error('O menu de producao nao esta vazio. Defina IFOOD_IMPORT_ALLOW_EXISTING=1 apenas se quiser arriscar uma importacao sobre menu existente.');
    }

    for (const item of snapshot.items) {
        const created = await apiRequest(`${DEFAULT_API_URL}/api/admin/menu?slug=${encodeURIComponent(slug)}`, adminToken, {
            method: 'POST',
            body: JSON.stringify({
                name: item.name,
                description: item.description,
                price_cents: item.price_cents,
                category: item.category,
                sort_order: item.sort_order,
                available: true,
                image_url: item.image_url,
                tags: [],
            }),
        });

        const itemId = created?.id;
        if (!itemId) {
            throw new Error(`Falha ao criar item "${item.name}": resposta sem id`);
        }

        for (const group of item.option_groups || []) {
            const createdGroup = await apiRequest(`${DEFAULT_API_URL}/api/admin/menu/${itemId}/options/groups?slug=${encodeURIComponent(slug)}`, adminToken, {
                method: 'POST',
                body: JSON.stringify({
                    name: group.name,
                    required: group.required,
                    min_select: group.min_select,
                    max_select: group.max_select,
                    sort_order: group.sort_order,
                }),
            });

            const groupId = createdGroup?.id;
            if (!groupId) {
                throw new Error(`Falha ao criar grupo "${group.name}" do item "${item.name}"`);
            }

            for (const option of group.options || []) {
                await apiRequest(`${DEFAULT_API_URL}/api/admin/menu/options/groups/${groupId}/items?slug=${encodeURIComponent(slug)}`, adminToken, {
                    method: 'POST',
                    body: JSON.stringify({
                        name: option.name,
                        price_cents: option.price_cents || 0,
                        sort_order: option.sort_order || 0,
                        available: option.available !== false,
                    }),
                });
            }
        }
    }
}

async function main() {
    const mode = process.argv[2] || 'help';

    if (mode === 'open') {
        launchBrowser();
        await waitForDebugger(DEBUG_PORT);
        console.log(`Chrome remoto aberto na porta ${DEBUG_PORT}.`);
        console.log(`iFood: ${DEFAULT_IFOOD_URL}`);
        console.log(`Admin: ${DEFAULT_ADMIN_URL}`);
        console.log('Faça login no iFood e no admin do X-Acai nessa janela e deixe o menu da loja visivel.');
        return;
    }

    if (mode === 'run') {
        await waitForDebugger(DEBUG_PORT);
        const { snapshot, snapshotPath, rawPath, adminToken, slug } = await captureSession();
        console.log(`Snapshot salvo em: ${snapshotPath}`);
        console.log(`Respostas cruas salvas em: ${rawPath}`);
        console.log(`Itens capturados: ${snapshot.item_count}`);
        console.log(`Categorias capturadas: ${snapshot.categories.join(' | ')}`);
        await importSnapshot(snapshot, adminToken, slug);
        console.log('Importacao concluida via rotas oficiais do admin.');
        return;
    }

    console.log('Uso:');
    console.log('  node scripts/import-ifood-menu.js open');
    console.log('  node scripts/import-ifood-menu.js run');
}

main().catch(error => {
    console.error(error.message);
    process.exit(1);
});
