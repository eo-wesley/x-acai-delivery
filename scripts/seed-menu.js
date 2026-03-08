// seed-menu.js — Real X-Açaí Menu Seeder
// Usage: node scripts/seed-menu.js
// Clears existing menu for default_tenant and inserts the real cardápio with all option groups.

const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const crypto = require('crypto');

const DB_PATH = path.resolve(__dirname, '../apps/backend/database.sqlite');
const TENANT = 'default_tenant';

const uid = () => crypto.randomUUID();

// ─────────────────────────────────────────────────────────────────────────────
// SHARED OPTION GROUP DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

const TAMANHO_COPOS = { // required, single
    name: 'Tamanho do Copo', required: 1, min_select: 1, max_select: 1, sort_order: 0,
    options: [
        { name: 'Copo de 300ml', price_cents: 0 },
        { name: 'Copo de 400ml', price_cents: 400 },
        { name: 'Copo de 500ml', price_cents: 800 },
        { name: 'Copo de 700ml', price_cents: 1500 },
    ]
};

const CREMES_ESPECIAIS = { // required, single
    name: 'Cremes Especiais', required: 1, min_select: 1, max_select: 1, sort_order: 1,
    options: [
        { name: 'Creme De Amendoim', price_cents: 600 },
        { name: 'Creme De Avelã', price_cents: 600 },
        { name: 'Creme De Bueno', price_cents: 600 },
        { name: 'Creme De Bombom', price_cents: 600 },
        { name: 'Creme De Leitinho', price_cents: 600 },
        { name: 'Creme De Morango', price_cents: 600 },
        { name: 'Nutella', price_cents: 1000 },
        { name: 'Não, Obrigado!', price_cents: 0 },
    ]
};

const BEBIDA = { // optional, single
    name: 'Vai uma Bebida?', required: 0, min_select: 0, max_select: 1, sort_order: 10,
    options: [
        { name: 'Água Mineral Crystal com Gás 500ml', price_cents: 700 },
        { name: 'Água Mineral Crystal Sem Gás 500ml', price_cents: 600 },
        { name: 'Coca-Cola 350ml', price_cents: 1000 },
        { name: 'Pepsi 350ml', price_cents: 1000 },
    ]
};

const COLHER = { // required, single
    name: 'Colher', required: 1, min_select: 1, max_select: 1, sort_order: 20,
    options: [
        { name: 'Sim', price_cents: 0 },
        { name: 'Não', price_cents: 0 },
    ]
};

const COMPLEMENTOS_LIST = [
    'Amendoim Torrado Granulado', 'Aveia', 'Banana', 'Bis',
    'Cereal Ball Chocolate', 'Cereal Ball Mesclado',
    'Cobertura De Caramelo', 'Cobertura De Chocolate', 'Cobertura De Morango',
    'Cobertura Fini Bananas', 'Cobertura Fini Beijos', 'Cobertura Fini Dentaduras',
    'Confete', 'Gotas De Chocolate', 'Granola',
    'Granulado Brigadeiro', 'Granulado Colorido',
    'Kiwi', 'Leite Condensado', 'Leite Em Pó', 'Morango',
    'Ovomaltine', 'Ouro Branco', 'Paçoca',
];

function makeComplementos(maxFree, sort = 2) {
    return {
        name: `Complementos (${maxFree} grátis)`, required: 1, min_select: 1, max_select: maxFree, sort_order: sort,
        options: COMPLEMENTOS_LIST.map(n => ({ name: n, price_cents: 0 }))
    };
}

function makeOndeVai(tipo) {
    return {
        name: 'Onde vai?', required: 1, min_select: 1, max_select: 1, sort_order: 1,
        options: [
            { name: `Dentro D${tipo === 'copo' ? 'o Copo' : tipo === 'marmitex' ? 'a Marmitex' : tipo === 'barca' ? 'a Barca' : 'a Roleta'}`, price_cents: 0 },
            { name: 'Itens Separados', price_cents: 500 },
        ]
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// MENU DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

const MENU = [
    // ── CATEGORIA 1: Copos Da Promoção ──────────────────────────────────────
    ...([
        { name: 'Açaí X-King Paçoca', price_cents: 2690 },
        { name: 'Açaí X-Splash', price_cents: 2690 },
        { name: 'Açaí X-Tradicional', price_cents: 2690 },
        { name: 'Açaí X-Paçoleite', price_cents: 2690 },
        { name: 'Açaí X-Paçokita', price_cents: 2890 },
        { name: 'Açaí X-Chocolá', price_cents: 2990 },
        { name: 'Açaí X-Tropical', price_cents: 3090 },
        { name: 'Açaí X-Creme', price_cents: 3190 },
        { name: 'Açaí X-Tella', price_cents: 3290 },
        { name: 'Açaí X-King Tella', price_cents: 3290 },
    ].map((p, i) => ({
        ...p,
        category: 'Copos Da Promoção',
        sort_order: i,
        description: 'Açaí artesanal com ingredientes selecionados. Personalize do seu jeito!',
        option_groups: [TAMANHO_COPOS, CREMES_ESPECIAIS, BEBIDA, COLHER],
    }))),

    // ── CATEGORIA 2: Linha Monte Seu Copo ────────────────────────────────────
    {
        name: 'Açaí de 300ml 3 complementos grátis', price_cents: 2990,
        category: 'Linha Monte Seu Copo', sort_order: 0,
        description: '300ml de açaí puro + escolha 3 complementos grátis',
        option_groups: [makeOndeVai('copo'), makeComplementos(3), BEBIDA],
    },
    {
        name: 'Açaí de 400ml 3 complementos grátis', price_cents: 3390,
        category: 'Linha Monte Seu Copo', sort_order: 1,
        description: '400ml de açaí puro + escolha 3 complementos grátis',
        option_groups: [makeOndeVai('copo'), makeComplementos(3), BEBIDA],
    },
    {
        name: 'Açaí de 500ml 3 complementos grátis', price_cents: 3690,
        category: 'Linha Monte Seu Copo', sort_order: 2,
        description: '500ml de açaí puro + escolha 3 complementos grátis',
        option_groups: [makeOndeVai('copo'), makeComplementos(3), BEBIDA],
    },
    {
        name: 'Açaí de 700ml 4 complementos grátis', price_cents: 4490,
        category: 'Linha Monte Seu Copo', sort_order: 3,
        description: '700ml de açaí puro + escolha 4 complementos grátis',
        option_groups: [makeOndeVai('copo'), makeComplementos(4), BEBIDA],
    },
    {
        name: 'Açaí Marmitex 500ml 3 complementos grátis', price_cents: 3790,
        category: 'Linha Monte Seu Copo', sort_order: 4,
        description: '500ml em marmitex + escolha 3 complementos grátis',
        option_groups: [makeOndeVai('marmitex'), makeComplementos(3), BEBIDA],
    },
    {
        name: 'Açaí Marmitex 700ml 4 complementos grátis', price_cents: 4490,
        category: 'Linha Monte Seu Copo', sort_order: 5,
        description: '700ml em marmitex + escolha 4 complementos grátis',
        option_groups: [makeOndeVai('marmitex'), makeComplementos(4), BEBIDA],
    },
    {
        name: 'Açaí Barca P 6 complementos grátis', price_cents: 5290,
        category: 'Linha Monte Seu Copo', sort_order: 6,
        description: 'Barca pequena de açaí + escolha 6 complementos grátis',
        option_groups: [makeOndeVai('barca'), makeComplementos(6), BEBIDA],
    },
    {
        name: 'Açaí Litrão 6 complementos grátis', price_cents: 5990,
        category: 'Linha Monte Seu Copo', sort_order: 7,
        description: '1 litro de açaí + escolha 6 complementos grátis',
        option_groups: [makeOndeVai('copo'), makeComplementos(6), BEBIDA],
    },
    {
        name: 'Açaí Roleta 6 complementos grátis', price_cents: 6690,
        category: 'Linha Monte Seu Copo', sort_order: 8,
        description: 'Açaí na roleta + escolha 6 complementos grátis',
        option_groups: [makeOndeVai('roleta'), makeComplementos(6), BEBIDA],
    },
    {
        name: 'Açaí Barca M 7 complementos grátis', price_cents: 6990,
        category: 'Linha Monte Seu Copo', sort_order: 9,
        description: 'Barca média de açaí + escolha 7 complementos grátis',
        option_groups: [makeOndeVai('barca'), makeComplementos(7), BEBIDA],
    },

    // ── CATEGORIA 3: Combos ──────────────────────────────────────────────────
    {
        name: 'Açaí Escolha 2 opções de 300ml', price_cents: 4690,
        category: 'Combos', sort_order: 0,
        description: 'Escolha 2 sabores do nosso cardápio de 300ml',
        option_groups: [
            {
                name: 'Escolha seus 2 Copos', required: 1, min_select: 2, max_select: 2, sort_order: 0,
                options: [
                    { name: 'Açaí X-King Paçoca', price_cents: 0 },
                    { name: 'Açaí X-Splash', price_cents: 0 },
                    { name: 'Açaí X-Tradicional', price_cents: 0 },
                    { name: 'Açaí X-Paçoleite', price_cents: 0 },
                ]
            },
            BEBIDA, COLHER
        ],
    },
    {
        name: 'Açaí Escolha 2 opções de 400ml', price_cents: 5390,
        category: 'Combos', sort_order: 1,
        description: 'Escolha 2 sabores do nosso cardápio de 400ml',
        option_groups: [
            {
                name: 'Escolha seus 2 Copos', required: 1, min_select: 2, max_select: 2, sort_order: 0,
                options: [
                    { name: 'Açaí X-King Paçoca', price_cents: 0 },
                    { name: 'Açaí X-Splash', price_cents: 0 },
                    { name: 'Açaí X-Tradicional', price_cents: 0 },
                    { name: 'Açaí X-Paçoleite', price_cents: 0 },
                ]
            },
            BEBIDA, COLHER
        ],
    },
    {
        name: 'Açaí Escolha 2 opções de 500ml', price_cents: 6490,
        category: 'Combos', sort_order: 2,
        description: 'Escolha 2 sabores do nosso cardápio de 500ml',
        option_groups: [
            {
                name: 'Escolha seus 2 Copos', required: 1, min_select: 2, max_select: 2, sort_order: 0,
                options: [
                    { name: 'Açaí X-King Paçoca', price_cents: 0 },
                    { name: 'Açaí X-Splash', price_cents: 0 },
                    { name: 'Açaí X-Tradicional', price_cents: 0 },
                    { name: 'Açaí X-Paçoleite', price_cents: 0 },
                ]
            },
            BEBIDA, COLHER
        ],
    },
    {
        name: 'Açaí Escolha 2 opções de 700ml', price_cents: 7890,
        category: 'Combos', sort_order: 3,
        description: 'Escolha 2 sabores do nosso cardápio de 700ml',
        option_groups: [
            {
                name: 'Escolha seus 2 Copos', required: 1, min_select: 2, max_select: 2, sort_order: 0,
                options: [
                    { name: 'Açaí X-King Paçoca', price_cents: 0 },
                    { name: 'Açaí X-Splash', price_cents: 0 },
                    { name: 'Açaí X-Tradicional', price_cents: 0 },
                    { name: 'Açaí X-Paçoleite', price_cents: 0 },
                ]
            },
            BEBIDA, COLHER
        ],
    },

    // ── CATEGORIA 4: Adicionais Pagos ────────────────────────────────────────
    {
        name: 'Adicionais Pagos', price_cents: 0,
        category: 'Adicionais Pagos', sort_order: 0,
        description: 'Adicione complementos extras ao seu pedido',
        option_groups: [
            {
                name: 'Adicionais', required: 0, min_select: 0, max_select: 99, sort_order: 0,
                options: [
                    { name: 'Amendoim Torrado Granulado', price_cents: 400 },
                    { name: 'Aveia', price_cents: 400 },
                    { name: 'Banana', price_cents: 400 },
                    { name: 'Bis', price_cents: 400 },
                    { name: 'Cereal Ball Chocolate', price_cents: 400 },
                    { name: 'Cereal Ball Mesclado', price_cents: 400 },
                    { name: 'Cobertura De Caramelo', price_cents: 400 },
                    { name: 'Cobertura De Chocolate', price_cents: 400 },
                    { name: 'Cobertura De Morango', price_cents: 400 },
                    { name: 'Cobertura Fini Bananas', price_cents: 400 },
                    { name: 'Cobertura Fini Beijos', price_cents: 400 },
                    { name: 'Cobertura Fini Dentaduras', price_cents: 400 },
                    { name: 'Confete', price_cents: 400 },
                    { name: 'Creme De Amendoim', price_cents: 600 },
                    { name: 'Creme De Avelã', price_cents: 600 },
                    { name: 'Creme De Bueno', price_cents: 600 },
                    { name: 'Creme De Bombom', price_cents: 600 },
                    { name: 'Creme De Leitinho', price_cents: 600 },
                    { name: 'Creme De Morango', price_cents: 600 },
                    { name: 'Gotas De Chocolate', price_cents: 500 },
                    { name: 'Granola', price_cents: 400 },
                    { name: 'Granulado Brigadeiro', price_cents: 400 },
                    { name: 'Granulado Colorido', price_cents: 400 },
                    { name: 'Kit-Kat', price_cents: 600 },
                    { name: 'Kiwi', price_cents: 500 },
                    { name: 'Leite Condensado', price_cents: 400 },
                    { name: 'Leite Em Pó', price_cents: 400 },
                    { name: 'Morango', price_cents: 500 },
                    { name: 'Nutella', price_cents: 1000 },
                    { name: 'Ovomaltine', price_cents: 500 },
                    { name: 'Ouro Branco', price_cents: 400 },
                    { name: 'Paçoca', price_cents: 400 },
                ]
            }
        ],
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// SEED EXECUTION
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🌱 Connecting to database:', DB_PATH);
    const db = await open({ filename: DB_PATH, driver: sqlite3.Database });

    await db.exec('PRAGMA journal_mode=WAL');

    // Ensure schema exists
    const hasOG = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='option_groups'");
    if (!hasOG) {
        console.log('⚠️  option_groups table not found — run the backend once first to initialize schema.');
        process.exit(1);
    }

    console.log('\n🗑️  Clearing existing menu for tenant:', TENANT);
    await db.exec(`
        DELETE FROM option_items WHERE restaurant_id = '${TENANT}';
        DELETE FROM option_groups WHERE restaurant_id = '${TENANT}';
        DELETE FROM menu_items WHERE restaurant_id = '${TENANT}';
    `);

    let itemCount = 0, groupCount = 0, optionCount = 0;

    for (const item of MENU) {
        const itemId = uid();
        await db.run(
            `INSERT INTO menu_items (id, restaurant_id, name, description, price_cents, category, sort_order, available)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
            [itemId, TENANT, item.name, item.description || null, item.price_cents, item.category, item.sort_order || 0]
        );
        itemCount++;

        for (const group of (item.option_groups || [])) {
            const groupId = uid();
            await db.run(
                `INSERT INTO option_groups (id, restaurant_id, menu_item_id, name, required, min_select, max_select, sort_order)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [groupId, TENANT, itemId, group.name, group.required, group.min_select, group.max_select, group.sort_order]
            );
            groupCount++;

            for (let oi = 0; oi < group.options.length; oi++) {
                const opt = group.options[oi];
                await db.run(
                    `INSERT INTO option_items (id, restaurant_id, option_group_id, name, price_cents, sort_order, available)
                     VALUES (?, ?, ?, ?, ?, ?, 1)`,
                    [uid(), TENANT, groupId, opt.name, opt.price_cents, oi]
                );
                optionCount++;
            }
        }
    }

    await db.close();

    console.log(`\n✅ Cardápio importado com sucesso!`);
    console.log(`   📦 ${itemCount} produtos`);
    console.log(`   🎛️  ${groupCount} grupos de opções`);
    console.log(`   🔘 ${optionCount} itens de opção`);
    console.log(`\n🚀 Abra http://localhost:3001 para ver o cardápio real.\n`);
}

main().catch(e => { console.error('❌ Erro:', e.message); process.exit(1); });
