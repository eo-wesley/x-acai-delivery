// seed-menu.ts — Real X-Açaí Delivery Menu Seeder
// Run with: npx tsx src/seeds/seed-menu.ts
// (from apps/backend directory)

import path from 'path';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import crypto from 'crypto';

const DB_PATH = path.resolve(process.cwd(), 'database.sqlite');
const TENANT = 'default_tenant';
const uid = () => crypto.randomUUID();

// ─────────────────────────────────────────────────────────────────────────────
// SHARED OPTION GROUP TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

const TAMANHO_COPOS = {
    name: 'Tamanho do Copo', required: 1, min_select: 1, max_select: 1, sort_order: 0,
    options: [
        { name: 'Copo de 300ml', price_cents: 0 },
        { name: 'Copo de 400ml', price_cents: 400 },
        { name: 'Copo de 500ml', price_cents: 800 },
        { name: 'Copo de 700ml', price_cents: 1500 },
    ]
};

const CREMES_ESPECIAIS = {
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

const BEBIDA = {
    name: 'Vai uma Bebida?', required: 0, min_select: 0, max_select: 1, sort_order: 10,
    options: [
        { name: 'Água Mineral Crystal com Gás 500ml', price_cents: 700 },
        { name: 'Água Mineral Crystal Sem Gás 500ml', price_cents: 600 },
        { name: 'Coca-Cola 350ml', price_cents: 1000 },
        { name: 'Pepsi 350ml', price_cents: 1000 },
    ]
};

const COLHER = {
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
    'Kiwi', 'Leite Condensado', 'Leite Em Pó', 'Morando',
    'Ovomaltine', 'Ouro Branco', 'Paçoca', 'Morango',
];

const makeComplementos = (maxFree: number) => ({
    name: `Complementos (escolha ${maxFree})`, required: 1, min_select: maxFree, max_select: maxFree, sort_order: 2,
    options: COMPLEMENTOS_LIST.map(n => ({ name: n, price_cents: 0 }))
});

const makeOndeVai = (tipo: 'copo' | 'marmitex' | 'barca' | 'roleta') => ({
    name: 'Onde vai?', required: 1, min_select: 1, max_select: 1, sort_order: 1,
    options: [
        { name: tipo === 'copo' ? 'Dentro Do Copo' : tipo === 'marmitex' ? 'Dentro Da Marmitex' : tipo === 'barca' ? 'Dentro Da Barca' : 'Dentro Da Roleta', price_cents: 0 },
        { name: 'Itens Separados', price_cents: 500 },
    ]
});

// ─────────────────────────────────────────────────────────────────────────────
// FULL MENU DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

type OptionGroup = { name: string; required: number; min_select: number; max_select: number; sort_order: number; options: { name: string; price_cents: number }[] };
type MenuItem = { name: string; price_cents: number; category: string; sort_order: number; description?: string; option_groups: OptionGroup[] };

const MENU: MenuItem[] = [
    // ── Copos Da Promoção ──────────────────────────────────────────────────
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
    ].map((p, i): MenuItem => ({
        ...p,
        category: 'Copos Da Promoção',
        sort_order: i,
        description: 'Açaí artesanal com ingredientes selecionados',
        option_groups: [TAMANHO_COPOS, CREMES_ESPECIAIS, BEBIDA, COLHER],
    }))),

    // ── Linha Monte Seu Copo ───────────────────────────────────────────────
    { name: 'Açaí de 300ml 3 complementos grátis', price_cents: 2990, category: 'Linha Monte Seu Copo', sort_order: 0, description: '300ml de açaí puro + 3 complementos grátis', option_groups: [makeOndeVai('copo'), makeComplementos(3), BEBIDA] },
    { name: 'Açaí de 400ml 3 complementos grátis', price_cents: 3390, category: 'Linha Monte Seu Copo', sort_order: 1, description: '400ml de açaí puro + 3 complementos grátis', option_groups: [makeOndeVai('copo'), makeComplementos(3), BEBIDA] },
    { name: 'Açaí de 500ml 3 complementos grátis', price_cents: 3690, category: 'Linha Monte Seu Copo', sort_order: 2, description: '500ml de açaí puro + 3 complementos grátis', option_groups: [makeOndeVai('copo'), makeComplementos(3), BEBIDA] },
    { name: 'Açaí de 700ml 4 complementos grátis', price_cents: 4490, category: 'Linha Monte Seu Copo', sort_order: 3, description: '700ml de açaí puro + 4 complementos grátis', option_groups: [makeOndeVai('copo'), makeComplementos(4), BEBIDA] },
    { name: 'Açaí Marmitex 500ml 3 complementos grátis', price_cents: 3790, category: 'Linha Monte Seu Copo', sort_order: 4, description: '500ml em marmitex + 3 complementos grátis', option_groups: [makeOndeVai('marmitex'), makeComplementos(3), BEBIDA] },
    { name: 'Açaí Marmitex 700ml 4 complementos grátis', price_cents: 4490, category: 'Linha Monte Seu Copo', sort_order: 5, description: '700ml em marmitex + 4 complementos grátis', option_groups: [makeOndeVai('marmitex'), makeComplementos(4), BEBIDA] },
    { name: 'Açaí Barca P 6 complementos grátis', price_cents: 5290, category: 'Linha Monte Seu Copo', sort_order: 6, description: 'Barca pequena + 6 complementos grátis', option_groups: [makeOndeVai('barca'), makeComplementos(6), BEBIDA] },
    { name: 'Açaí Litrão 6 complementos grátis', price_cents: 5990, category: 'Linha Monte Seu Copo', sort_order: 7, description: '1 litro de açaí + 6 complementos grátis', option_groups: [makeOndeVai('copo'), makeComplementos(6), BEBIDA] },
    { name: 'Açaí Roleta 6 complementos grátis', price_cents: 6690, category: 'Linha Monte Seu Copo', sort_order: 8, description: 'Açaí na roleta + 6 complementos grátis', option_groups: [makeOndeVai('roleta'), makeComplementos(6), BEBIDA] },
    { name: 'Açaí Barca M 7 complementos grátis', price_cents: 6990, category: 'Linha Monte Seu Copo', sort_order: 9, description: 'Barca média + 7 complementos grátis', option_groups: [makeOndeVai('barca'), makeComplementos(7), BEBIDA] },

    // ── Combos ────────────────────────────────────────────────────────────
    ...([
        { name: 'Açaí Escolha 2 opções de 300ml', price_cents: 4690, sort_order: 0 },
        { name: 'Açaí Escolha 2 opções de 400ml', price_cents: 5390, sort_order: 1 },
        { name: 'Açaí Escolha 2 opções de 500ml', price_cents: 6490, sort_order: 2 },
        { name: 'Açaí Escolha 2 opções de 700ml', price_cents: 7890, sort_order: 3 },
    ].map((p): MenuItem => ({
        ...p,
        category: 'Combos',
        description: 'Escolha 2 sabores do cardápio',
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
            BEBIDA,
            COLHER,
        ],
    }))),

    // ── Adicionais Pagos ───────────────────────────────────────────────────
    {
        name: 'Adicionais Pagos', price_cents: 0, category: 'Adicionais Pagos', sort_order: 0,
        description: 'Adicione complementos extras ao seu pedido',
        option_groups: [{
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
        }]
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTION
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🌱 Connecting to:', DB_PATH);
    const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
    await db.exec('PRAGMA journal_mode=WAL');

    const hasOG = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='option_groups'");
    if (!hasOG) {
        console.error('❌ option_groups table not found. Start the backend once first to initialize schema, then run this seed.');
        process.exit(1);
    }

    console.log('🗑️  Clearing existing menu for tenant:', TENANT);
    await db.run(`DELETE FROM option_items WHERE restaurant_id = ?`, TENANT);
    await db.run(`DELETE FROM option_groups WHERE restaurant_id = ?`, TENANT);
    await db.run(`DELETE FROM menu_items WHERE restaurant_id = ?`, TENANT);

    let itemCount = 0, groupCount = 0, optionCount = 0;

    for (const item of MENU) {
        const itemId = uid();
        await db.run(
            `INSERT INTO menu_items (id, restaurant_id, name, description, price_cents, category, sort_order, available)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
            [itemId, TENANT, item.name, item.description ?? null, item.price_cents, item.category, item.sort_order]
        );
        itemCount++;

        for (const group of item.option_groups) {
            const groupId = uid();
            await db.run(
                `INSERT INTO option_groups (id, restaurant_id, menu_item_id, name, required, min_select, max_select, sort_order)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [groupId, TENANT, itemId, group.name, group.required, group.min_select, group.max_select, group.sort_order]
            );
            groupCount++;

            for (let i = 0; i < group.options.length; i++) {
                const opt = group.options[i];
                await db.run(
                    `INSERT INTO option_items (id, restaurant_id, option_group_id, name, price_cents, sort_order, available)
                     VALUES (?, ?, ?, ?, ?, ?, 1)`,
                    [uid(), TENANT, groupId, opt.name, opt.price_cents, i]
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
    console.log('\n🚀 Abra http://localhost:3001 — cardápio real está disponível!\n');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
