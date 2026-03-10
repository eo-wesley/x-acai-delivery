// seed-demo.ts — X-Açaí Demo System Seeder
// Run with: npx tsx src/seeds/seed-demo.ts

import path from 'path';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import crypto from 'crypto';

const DB_PATH = path.resolve(process.cwd(), 'database.sqlite');
const DEMO_TENANT = 'demo_store_xacai';
const uid = () => crypto.randomUUID();

export async function main() {
    console.log('🌱 Creating Demo Environment...');
    const db = await open({ filename: DB_PATH, driver: sqlite3.Database });

    // 1. Create Restaurant
    console.log('- Creating Demo Restaurant...');
    await db.run(`INSERT OR REPLACE INTO restaurants (id, name, slug, logo_url, active, phone, address) VALUES (?, ?, ?, ?, 1, ?, ?)`,
        [DEMO_TENANT, 'X-Açaí Demo Store', 'xacai-demo', 'https://via.placeholder.com/150', '5511999999999', 'Av. Paulista, 1000, SP']);

    // 2. Create Categories & Items (Short version of seed-menu)
    console.log('- Seeding Menu...');
    const catId = uid();
    await db.run(`INSERT OR REPLACE INTO categories (id, restaurant_id, name, sort_order) VALUES (?, ?, ?, 0)`, [catId, DEMO_TENANT, 'Açaí Tradicional']);

    const itemId = uid();
    await db.run(`INSERT OR REPLACE INTO menu_items (id, restaurant_id, name, description, price_cents, category, sort_order, available) VALUES (?, ?, ?, ?, ?, ?, 0, 1)`,
        [itemId, DEMO_TENANT, 'Super Açaí 500ml', 'O clássico da casa com guaraná', 2500, 'Açaí Tradicional', 0]);

    // 3. Create Option Groups
    const ogId = uid();
    await db.run(`INSERT OR REPLACE INTO option_groups (id, restaurant_id, menu_item_id, name, required, min_select, max_select, sort_order) VALUES (?, ?, ?, ?, 1, 1, 1, 0)`,
        [ogId, DEMO_TENANT, itemId, 'Adicionais Grátis', 1, 1, 3, 0]);

    await db.run(`INSERT OR REPLACE INTO option_items (id, restaurant_id, option_group_id, name, price_cents, sort_order, available) VALUES (?, ?, ?, ?, 0, 0, 1)`,
        [uid(), DEMO_TENANT, ogId, 'Banana', 0]);
    await db.run(`INSERT OR REPLACE INTO option_items (id, restaurant_id, option_group_id, name, price_cents, sort_order, available) VALUES (?, ?, ?, ?, 0, 1, 1)`,
        [uid(), DEMO_TENANT, ogId, 'Granola', 0]);

    // 4. Create Sample Campaign
    console.log('- Creating Sample QR Campaign...');
    const campId = uid();
    await db.run(`INSERT OR REPLACE INTO qr_campaigns (id, restaurant_id, name, discount_value, active) VALUES (?, ?, ?, ?, 1)`,
        [campId, DEMO_TENANT, 'Campanha de Inauguração', 1000]);

    // 5. Create Sample Driver
    console.log('- Adding Demo Driver...');
    await db.run(`INSERT OR REPLACE INTO drivers (id, restaurant_id, name, phone, vehicle, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [uid(), DEMO_TENANT, 'Entregador Swift', '5511988887777', 'Moto CG 160', 'online']);

    await db.close();
    console.log('✅ Demo Store created successfully!');
    console.log(`- Slug: xacai-demo`);
    console.log(`- Tenant ID: ${DEMO_TENANT}`);
}

main().catch(err => console.error('❌', err.message));
