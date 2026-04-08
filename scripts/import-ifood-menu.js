#!/usr/bin/env node
/**
 * import-ifood-menu.js — Importador one-off do cardápio iFood → X-Açaí
 *
 * Fluxo em 3 fases estanques:
 *   FASE 1 (extract)   — Lê o snapshot JSON capturado pelo bookmarklet do navegador
 *   FASE 2 (normalize) — Valida e normaliza para o schema do X-Açaí, preservando sort_order exato
 *   FASE 3 (write)     — Grava em produção via API oficial do admin do X-Açaí (nunca direto no banco)
 *
 * Uso:
 *   node scripts/import-ifood-menu.js --phase extract   # apenas valida snapshot
 *   node scripts/import-ifood-menu.js --phase normalize # valida + normaliza + salva snapshot.json
 *   node scripts/import-ifood-menu.js --phase write     # normalize + write (exige --api-url e --token)
 *   node scripts/import-ifood-menu.js --phase all       # tudo
 *
 * Variáveis de ambiente:
 *   XACAI_API_URL    = URL da API de produção (ex: https://backend.onrender.com)
 *   XACAI_ADMIN_TOKEN = Firebase ID Token do admin
 *   XACAI_SLUG       = Slug do restaurante (ex: default)
 *   IFOOD_SNAPSHOT   = Caminho do snapshot JSON (default: ./tmp/ifood-snapshot.json)
 */

const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (name) => {
    const idx = args.indexOf(name);
    return idx !== -1 ? args[idx + 1] : null;
};
const PHASE = getArg('--phase') || 'normalize';

const API_URL = process.env.XACAI_API_URL || getArg('--api-url') || 'http://localhost:3000';
const ADMIN_TOKEN = process.env.XACAI_ADMIN_TOKEN || getArg('--token') || '';
const SLUG = process.env.XACAI_SLUG || getArg('--slug') || 'default';
const SNAPSHOT_PATH = process.env.IFOOD_SNAPSHOT || getArg('--snapshot') || path.join(__dirname, '../tmp/ifood-snapshot.json');
const NORMALIZED_PATH = path.join(__dirname, '../tmp/ifood-normalized.json');

const DRY_RUN = args.includes('--dry-run');

// ─── FASE 1: Extract (valida o snapshot cru do iFood) ────────────────────────

function extractAndValidate(raw) {
    console.log('\n[FASE 1] Validando snapshot iFood...');

    if (!raw || typeof raw !== 'object') {
        throw new Error('Snapshot inválido: precisa ser um objeto JSON.');
    }

    let categories = [];

    // ─── Formato 1: Array direto de categorias ─────────────────────────
    if (Array.isArray(raw)) {
        categories = raw;
    }
    // ─── Formato 2: Objeto simples com campo categories/catalog/data ───
    else if (Array.isArray(raw.categories)) {
        categories = raw.categories;
    } else if (Array.isArray(raw.catalog)) {
        categories = raw.catalog;
    } else if (Array.isArray(raw.data)) {
        categories = raw.data;
    }
    // ─── Formato 3: __NEXT_DATA__ do iFood (captura de página) ────────
    else if (raw.props && raw.props.initialState) {
        const is = raw.props.initialState;

        // Tenta restaurant.categories (página de loja aberta)
        if (Array.isArray(is.restaurant?.categories) && is.restaurant.categories.length > 0) {
            categories = is.restaurant.categories;
            console.log('  [!] Extraído de: props.initialState.restaurant.categories');
        }
        // Tenta catalogCategory.items (página de categoria)
        else if (Array.isArray(is.catalogCategory?.items) && is.catalogCategory.items.length > 0) {
            categories = is.catalogCategory.items;
            console.log('  [!] Extraído de: props.initialState.catalogCategory.items');
        }
        // Tenta restaurant.filteredCatalog ou menu
        else if (Array.isArray(is.restaurant?.filteredCatalog) && is.restaurant.filteredCatalog.length > 0) {
            categories = is.restaurant.filteredCatalog;
            console.log('  [!] Extraído de: props.initialState.restaurant.filteredCatalog');
        }
        else {
            // Diagnóstico para ajudar o usuário
            const isPage = raw.page || '(desconhecida)';
            const restaurantName = is.restaurant?.details?.name || '(vazio)';
            throw new Error(
                `Snapshot do iFood capturado mas sem cardápio.\n` +
                `  Página capturada: ${isPage}\n` +
                `  Restaurante nos dados: "${restaurantName}"\n\n` +
                `  CAUSA: O bookmarklet foi executado na página errada ou antes do cardápio carregar.\n\n` +
                `  SOLUÇÃO:\n` +
                `  1. Acesse www.ifood.com.br e busque a loja pelo nome\n` +
                `  2. Clique na loja e aguarde o cardápio COMPLETO carregar (role até o fim)\n` +
                `  3. A URL deve conter o UUID da loja, ex: /delivery/sao-paulo-sp/x-acai-.../UUID\n` +
                `  4. Só então execute o bookmarklet no Console (F12)\n` +
                `  5. Salve o arquivo como: tmp/ifood-snapshot.json`
            );
        }
    }
    // ─── Formato 4: Resposta direta da API /v2/home/catalog ──────────
    else if (raw.merchantId && Array.isArray(raw.sections)) {
        // Converte formato de sections para categories
        categories = raw.sections.map(s => ({
            name: s.title || s.name || 'Categoria',
            items: (s.items || s.cards || []).map(card => card.item || card)
        })).filter(c => c.items.length > 0);
        console.log('  [!] Extraído de: formato API v2/home/catalog');
    }
    else {
        throw new Error(
            `Snapshot iFood não reconhecido.\n` +
            `Chaves encontradas: ${Object.keys(raw).join(', ')}\n\n` +
            `Formatos aceitos:\n` +
            `  - Array direto de categorias\n` +
            `  - Objeto com campo "categories", "catalog" ou "data"\n` +
            `  - __NEXT_DATA__ com props.initialState.restaurant.categories\n` +
            `  - Resposta da API com merchantId + sections`
        );
    }

    if (categories.length === 0) {
        throw new Error('Snapshot sem categorias. Verifique se o cardápio estava visível antes de capturar.');
    }

    let totalItems = 0;
    let totalGroups = 0;
    let totalOptions = 0;

    for (const cat of categories) {
        if (!cat.name && !cat.category && !cat.title) {
            console.warn(`  ⚠️  Categoria sem nome, será nomeada automaticamente.`);
        }
        const items = cat.items || cat.products || cat.itens || [];
        totalItems += items.length;
        for (const item of items) {
            const groups = item.optionGroups || item.option_groups || item.choices || item.complementsCategories || [];
            totalGroups += groups.length;
            for (const g of groups) {
                totalOptions += (g.options || g.optionItems || g.items || g.complements || []).length;
            }
        }
    }

    console.log(`  ✅ Categorias encontradas : ${categories.length}`);
    console.log(`  ✅ Produtos encontrados   : ${totalItems}`);
    console.log(`  ✅ Grupos de opção        : ${totalGroups}`);
    console.log(`  ✅ Itens de opção         : ${totalOptions}`);

    if (totalItems === 0) {
        throw new Error('Snapshot sem produtos. Verifique se a sessão do iFood estava autenticada e a loja visível.');
    }

    return { categories, stats: { totalItems, totalGroups, totalOptions } };
}

// ─── FASE 2: Normalize ───────────────────────────────────────────────────────

function normalizeName(raw) {
    if (!raw || typeof raw !== 'string') return '';
    return raw.trim();
}

function normalizePrice(raw) {
    if (raw === null || raw === undefined) return 0;
    // iFood pode vir como float (ex: 29.90) ou inteiro centavos
    const n = Number(raw);
    if (isNaN(n)) return 0;
    // Heurística: se <= 5000 provavelmente já está em reais (float)
    // O iFood retorna em reais na maioria dos endpoints de catálogo
    return n < 500 ? Math.round(n * 100) : Math.round(n);
}

function normalizeItem(rawItem, itemIndex) {
    const name = normalizeName(
        rawItem.name || rawItem.description || rawItem.title || ''
    );
    if (!name) throw new Error(`Item sem nome na posição ${itemIndex}: ${JSON.stringify(rawItem).substring(0, 100)}`);

    const price_cents = normalizePrice(
        rawItem.unitPrice ?? rawItem.price ?? rawItem.originalValue ?? rawItem.value ?? 0
    );

    const image_url = rawItem.logoUrl || rawItem.image || rawItem.imageUrl || rawItem.logo || null;
    const description = normalizeName(rawItem.description || rawItem.details || '') || null;

    // option_groups
    const rawGroups = rawItem.optionGroups || rawItem.option_groups || rawItem.choices || rawItem.complementsCategories || [];
    const option_groups = rawGroups.map((g, gi) => {
        const groupName = normalizeName(g.name || g.category || `Grupo ${gi + 1}`);
        const minQty = Number(g.min ?? g.minChoice ?? g.minimumSelections ?? 0);
        const maxQty = Number(g.max ?? g.maxChoice ?? g.maximumSelections ?? 1);
        const required = minQty > 0;

        const rawOptions = g.options || g.optionItems || g.items || g.complements || [];
        const options = rawOptions.map((o, oi) => ({
            name: normalizeName(o.name || o.description || `Opção ${oi + 1}`),
            price_cents: normalizePrice(o.price ?? o.additionalPrice ?? o.unitPrice ?? 0),
            sort_order: oi,
            available: true,
        }));

        if (options.length === 0) {
            console.warn(`  ⚠️  Grupo "${groupName}" sem opções no item "${name}"`);
        }

        return {
            name: groupName,
            min_select: minQty,
            max_select: maxQty,
            required,
            sort_order: gi,
            options,
        };
    });

    return {
        name,
        description,
        price_cents,
        image_url,
        available: true,
        option_groups,
    };
}

function normalizeMenu({ categories }) {
    console.log('\n[FASE 2] Normalizando cardápio iFood para schema X-Açaí...');

    const normalized = [];
    let globalItemIndex = 0;

    for (let ci = 0; ci < categories.length; ci++) {
        const cat = categories[ci];
        const catName = normalizeName(cat.name || cat.category || cat.title || `Categoria ${ci + 1}`);
        const rawItems = cat.items || cat.products || cat.itens || [];

        console.log(`  Categoria [${ci}] "${catName}": ${rawItems.length} produto(s)`);

        for (let ii = 0; ii < rawItems.length; ii++) {
            const item = normalizeItem(rawItems[ii], globalItemIndex);
            item.category = catName;
            item.sort_order = globalItemIndex; // índice global para ordenação absoluta

            normalized.push(item);
            globalItemIndex++;
        }
    }

    console.log(`\n  ✅ Total normalizado: ${normalized.length} produto(s)`);
    return normalized;
}

// ─── FASE 3: Write ───────────────────────────────────────────────────────────

async function writeToXacai(normalizedItems) {
    console.log('\n[FASE 3] Escrevendo cardápio em produção via API oficial do X-Açaí...');

    if (!ADMIN_TOKEN) {
        throw new Error(
            'XACAI_ADMIN_TOKEN não definido.\n' +
            'Defina a variável de ambiente ou use --token <firebase-id-token>'
        );
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
    };

    // Helper para fazer fetch com retry simples
    async function apiPost(path, body) {
        const url = `${API_URL}/api/${SLUG}${path}`;
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`POST ${url} falhou (${res.status}): ${text.substring(0, 300)}`);
        }
        return res.json();
    }

    const results = { created: [], failed: [] };

    for (let i = 0; i < normalizedItems.length; i++) {
        const item = normalizedItems[i];
        process.stdout.write(`  [${i + 1}/${normalizedItems.length}] ${item.name}...`);

        if (DRY_RUN) {
            console.log(' (DRY RUN, pulando)');
            continue;
        }

        try {
            // 1. Criar o produto
            const created = await apiPost('/admin/menu', {
                name: item.name,
                description: item.description,
                price_cents: item.price_cents,
                category: item.category,
                image_url: item.image_url,
                available: item.available,
                sort_order: item.sort_order,
                tags: [],
            });

            const menuItemId = created.id;
            if (!menuItemId) throw new Error('API não retornou `id` do produto');

            // 2. Criar option_groups e seus itens
            for (const group of item.option_groups) {
                let groupRes;
                try {
                    groupRes = await apiPost(`/admin/menu/${menuItemId}/options/groups`, {
                        name: group.name,
                        min_select: group.min_select,
                        max_select: group.max_select,
                        required: group.required,
                        sort_order: group.sort_order,
                    });
                } catch (e) {
                    console.warn(`\n    ⚠️  Falha ao criar grupo "${group.name}": ${e.message}`);
                    continue;
                }

                const groupId = groupRes.id;
                if (!groupId) {
                    console.warn(`\n    ⚠️  Grupo "${group.name}" não retornou id, pulando opções`);
                    continue;
                }

                for (const opt of group.options) {
                    try {
                        await apiPost(`/admin/menu/${menuItemId}/options/groups/${groupId}/items`, {
                            name: opt.name,
                            price_cents: opt.price_cents,
                            sort_order: opt.sort_order,
                            available: opt.available,
                        });
                    } catch (e) {
                        console.warn(`\n    ⚠️  Falha ao criar opção "${opt.name}": ${e.message}`);
                    }
                }
            }

            results.created.push({ id: menuItemId, name: item.name });
            console.log(` ✅ (id: ${menuItemId})`);
        } catch (e) {
            results.failed.push({ name: item.name, error: e.message });
            console.log(` ❌ ${e.message}`);
        }
    }

    console.log('\n─── RESULTADO DA ESCRITA ───────────────────────────────────────');
    console.log(`  ✅ Criados com sucesso : ${results.created.length}`);
    console.log(`  ❌ Falhas              : ${results.failed.length}`);

    if (results.failed.length > 0) {
        console.log('\n  ITENS COM FALHA:');
        results.failed.forEach(f => console.log(`    - ${f.name}: ${f.error}`));
    }

    return results;
}

// ─── Ponto de entrada ────────────────────────────────────────────────────────

async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  X-Açaí — Importador de Cardápio iFood');
    console.log(`  Fase: ${PHASE.toUpperCase()} | Alvo: ${API_URL} | Slug: ${SLUG}`);
    if (DRY_RUN) console.log('  ⚠️  DRY RUN ativo — nada será gravado em produção');
    console.log('═══════════════════════════════════════════════════════════════');

    // Carregar snapshot
    if (!fs.existsSync(SNAPSHOT_PATH)) {
        console.error(`\n❌ Snapshot não encontrado: ${SNAPSHOT_PATH}`);
        console.error('\nInstruções para capturar o snapshot do iFood:');
        console.error('  1. Abra o iFood e faça login com a conta da loja');
        console.error('  2. Abra o cardápio completo da loja no navegador');
        console.error('  3. Abra o DevTools (F12) → Console');
        console.error('  4. Cole e execute o bookmarklet abaixo:');
        console.error('\n--- BOOKMARKLET ---');
        console.error(`
(async () => {
  // Tenta capturar o catálogo via API interna do iFood
  const snap = window.__NUXT__ || window.__NEXT_DATA__ || window.__data__;
  let catalog;
  
  // Tenta rota de catálogo do restaurante aberto
  const slug = location.pathname.split('/').filter(Boolean).pop();
  try {
    const r = await fetch(\`https://marketplace.ifood.com.br/v1/merchant/\${slug}/catalog\`, 
      { credentials: 'include' });
    if (r.ok) { catalog = await r.json(); }
  } catch(e) {}
  
  if (!catalog) {
    // Fallback: data injetada na página
    catalog = snap?.data?.catalog || snap?.props?.pageProps?.catalog || snap;
  }
  
  const blob = new Blob([JSON.stringify(catalog, null, 2)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ifood-snapshot.json';
  a.click();
  console.log('Download iniciado!');
})();
`);
        console.error('  5. Salve o arquivo como: tmp/ifood-snapshot.json');
        process.exit(1);
    }

    const raw = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf-8'));

    // FASE 1: extract (sempre roda)
    const extracted = extractAndValidate(raw);

    if (PHASE === 'extract') {
        console.log('\n✅ Fase extract concluída. Snapshot válido.');
        return;
    }

    // FASE 2: normalize
    const normalized = normalizeMenu(extracted);

    // Salvar normalized
    fs.mkdirSync(path.dirname(NORMALIZED_PATH), { recursive: true });
    fs.writeFileSync(NORMALIZED_PATH, JSON.stringify(normalized, null, 2), 'utf-8');
    console.log(`\n  📄 Snapshot normalizado salvo em: ${NORMALIZED_PATH}`);

    if (PHASE === 'normalize') {
        console.log('\n✅ Fase normalize concluída.');
        console.log('   Verifique tmp/ifood-normalized.json antes de prosseguir para write.');
        return;
    }

    // FASE 3: write
    if (PHASE === 'write' || PHASE === 'all') {
        const results = await writeToXacai(normalized);
        const totalFailed = results.failed.length;

        if (totalFailed > 0) {
            console.log(`\n⚠️  Importação concluída com ${totalFailed} falha(s).`);
            process.exit(1);
        } else {
            console.log('\n✅ Importação concluída com sucesso!');
        }
    }
}

main().catch(e => {
    console.error('\n❌ Erro fatal:', e.message);
    process.exit(1);
});
