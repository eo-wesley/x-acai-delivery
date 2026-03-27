// seed-demo-v2.ts — X-Açaí Professional Demo Seeder
import { getDb, setupDatabase } from '../db/db.client';
import { randomUUID } from 'crypto';

const uid = () => randomUUID();

export async function seedDemo() {
    console.log('🍧 [Seed] Garantindo esquema do banco de dados...');
    const db = await getDb();

    // Limpeza radical para o ambiente demo local p/ garantir esquema novo
    console.log('🧹 [Seed] Limpeza radical do banco de dados local...');
    try {
        await db.exec("DROP TABLE IF EXISTS restaurants");
        await db.exec("DROP TABLE IF EXISTS menu_items");
        await db.exec("DROP TABLE IF EXISTS option_groups");
        await db.exec("DROP TABLE IF EXISTS option_items");
        await db.exec("DROP TABLE IF EXISTS drivers");
        await db.exec("DROP TABLE IF EXISTS coupons");
    } catch (e) {
        console.warn('⚠️ [Seed] Falha ao dropar algumas tabelas, ignorando...', e);
    }

    await setupDatabase();

    // DEBUG: Verificar colunas da tabela restaurants
    const tableInfo = await db.all("PRAGMA table_info(restaurants)");
    console.log('🔍 [Debug] Colunas em restaurants (JSON):', JSON.stringify(tableInfo, null, 2));

    console.log('🍧 [Seed] Iniciando criação do Restaurante Demo: Açaí do Dudu...');

    const TENANT_ID = 'demo';
    const SLUG = 'demo';

    // 2. Criar Restaurante
    console.log('🏬 [Seed] Criando restaurante "Açaí do Dudu"...');
    await db.run(`
        INSERT INTO restaurants (
            id, name, slug, city, address, phone, email, 
            logo_url, active, mode, subscription_plan, primary_color, 
            description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'saas', 'pro', '#9333ea', ?)
    `, [
        TENANT_ID,
        'Açaí do Dudu',
        SLUG,
        'São Paulo',
        'Av. Paulista, 1000 - Bela Vista',
        '5511999999999',
        'contato@acaidodudu.com.br',
        'https://images.unsplash.com/photo-1590595978583-39b7ea304033?w=200&h=200&fit=crop',
        'O melhor açaí artesanal de São Paulo. Venha experimentar nossas combinações exclusivas!'
    ]);

    // 3. Categorias e Itens
    console.log('🍎 [Seed] Criando cardápio...');

    // Categoria: Açaí
    const catAcai = 'Açaí Tradicional';
    const items = [
        { name: 'Açaí no Copo 300ml', price: 1800, desc: 'Copo tradicional de 300ml.' },
        { name: 'Açaí no Copo 500ml', price: 2500, desc: 'Nosso campeão de vendas!' },
        { name: 'Açaí na Tigela 700ml', price: 3500, desc: 'Para quem ama açaí de verdade.' }
    ];

    for (const item of items) {
        const itemId = uid();
        await db.run(`
            INSERT INTO menu_items (id, restaurant_id, name, description, price_cents, category, available) 
            VALUES (?, ?, ?, ?, ?, ?, 1)
        `, [itemId, TENANT_ID, item.name, item.desc, item.price, catAcai]);

        // Modificadores para cada item de açaí
        const ogToppingsId = uid();
        await db.run(`
            INSERT INTO option_groups (id, restaurant_id, menu_item_id, name, required, min_select, max_select)
            VALUES (?, ?, ?, ?, 0, 0, 5)
        `, [ogToppingsId, TENANT_ID, itemId, 'Toppings (Até 5)']);

        const toppings = [
            { name: 'Leite em Pó', price: 200 },
            { name: 'Granola', price: 150 },
            { name: 'Paçoca', price: 150 },
            { name: 'Leite Condensado', price: 200 },
            { name: 'Morango', price: 400 },
            { name: 'Banana', price: 0 }
        ];

        for (const top of toppings) {
            await db.run(`
                INSERT INTO option_items (id, restaurant_id, option_group_id, name, price_cents)
                VALUES (?, ?, ?, ?, ?)
            `, [uid(), TENANT_ID, ogToppingsId, top.name, top.price]);
        }
    }

    // 4. Motorista Demo
    console.log('🛵 [Seed] Criando motorista demo...');
    await db.run(`
        INSERT INTO drivers (id, restaurant_id, name, phone, vehicle, status, access_code, is_online)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [uid(), TENANT_ID, 'Ricardo Entrega', '5511988887777', 'Honda CG 160', 'active', '123123', 1]);

    // 5. Cupom Demo
    console.log('🎟️ [Seed] Criando cupom demo...');
    await db.run(`
        INSERT INTO coupons (id, restaurant_id, code, description, type, discount_value, min_order_cents, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [uid(), TENANT_ID, 'DUDU5', 'R$ 5 OFF na primeira compra', 'flat', 500, 2000, 1]);

    console.log('✅ [Seed] Tenant "demo" criado com sucesso!');
}

if (require.main === module) {
    seedDemo().catch(console.error);
}
