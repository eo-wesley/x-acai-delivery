import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Minimal interface to support both drivers
export interface IDatabase {
    exec(sql: string): Promise<void>;
    all(sql: string, params?: any[]): Promise<any[]>;
    get(sql: string, params?: any[]): Promise<any>;
    run(sql: string, params?: any[]): Promise<any>;
}

let dbInstance: any = null;
let pgPool: Pool | null = null;

export async function getDb(): Promise<any> {
    if (dbInstance) return dbInstance;

    const isPostgres = process.env.DATABASE_URL?.startsWith('postgres');

    if (isPostgres) {
        if (!pgPool) {
            pgPool = new Pool({
                connectionString: process.env.DATABASE_URL,
                max: 20, // Max concurrent connections for Enterprise
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });
        }

        console.log('✅ PostgreSQL Database connected successfully.');

        // Wrapper para manter compatibilidade com interface SQLite (run/get/all)
        dbInstance = {
            run: async (sql: string, params: any[] = []) => {
                const client = await pgPool!.connect();
                try {
                    const res = await client.query(sql.replace(/\?/g, (_, i) => `$${i + 1}`), params);
                    return { lastID: null, changes: res.rowCount };
                } finally {
                    client.release();
                }
            },
            get: async (sql: string, params: any[] = []) => {
                const client = await pgPool!.connect();
                try {
                    const res = await client.query(sql.replace(/\?/g, (_, i) => `$${i + 1}`), params);
                    return res.rows[0];
                } finally {
                    client.release();
                }
            },
            all: async (sql: string, params: any[] = []) => {
                const client = await pgPool!.connect();
                try {
                    const res = await client.query(sql.replace(/\?/g, (_, i) => `$${i + 1}`), params);
                    return res.rows;
                } finally {
                    client.release();
                }
            },
            exec: async (sql: string) => {
                const client = await pgPool!.connect();
                try {
                    return await client.query(sql);
                } finally {
                    client.release();
                }
            }
        };
    } else {
        // SQLite fallback for local dev
        dbInstance = await open({
            filename: process.env.DATABASE_URL || './database.sqlite',
            driver: sqlite3.Database
        });
        console.log('✅ SQLite Local Database connected successfully.');
    }

    return dbInstance;
}

export async function setupDatabase() {
    const db = await getDb();

    // Restaurants Table (Multi-tenancy root)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS restaurants (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            phone TEXT,
            email TEXT,
            status TEXT DEFAULT 'active',
            plan TEXT DEFAULT 'trial',
            mode TEXT DEFAULT 'saas', -- 'store' (dono) ou 'saas' (clientes)
            subscription_plan TEXT DEFAULT 'starter', -- 'starter', 'pro', 'enterprise'
            subscription_status TEXT DEFAULT 'active',
            onboarding_step INTEGER DEFAULT 0,
            owner_id TEXT, -- Para agrupar múltiplas lojas sob o mesmo dono
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Menu Table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS menu_items (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            price_cents INTEGER NOT NULL,
            category TEXT,
            tags TEXT,       -- SQLite doesn't have native arrays, storing as JSON string
            available INTEGER DEFAULT 1,
            image_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Customers Table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT DEFAULT 'default_tenant',
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT,
            otp_code TEXT,
            otp_expires_at DATETIME,
            tags TEXT,
            notes TEXT,
            last_order_at DATETIME,
            total_orders INTEGER DEFAULT 0,
            total_spent_cents INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(restaurant_id, phone)
        );
    `);

    // Orders Table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            customer_id TEXT NOT NULL,
            status TEXT NOT NULL,
            items TEXT NOT NULL, -- Storing JSON string
            subtotal_cents INTEGER NOT NULL,
            delivery_fee_cents INTEGER NOT NULL,
            total_cents INTEGER NOT NULL,
            address_text TEXT NOT NULL,
            latitude REAL,
            longitude REAL,
            notes TEXT,
            payment_status TEXT DEFAULT 'pending_payment',
            payment_provider TEXT,
            transaction_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        );
    `);

    // Order Items Table (for detailed analytics)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS order_items (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            item_id TEXT NOT NULL,
            item_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price_cents INTEGER NOT NULL,
            notes TEXT,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (item_id) REFERENCES menu_items(id)
        );
        CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    `);

    // Safe Migrations 
    try { await db.exec("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending_payment'"); } catch (e) { }
    try { await db.exec("ALTER TABLE orders ADD COLUMN payment_provider TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE orders ADD COLUMN transaction_id TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE orders ADD COLUMN paid_at DATETIME"); } catch (e) { }
    // PIX-specific fields
    try { await db.exec("ALTER TABLE orders ADD COLUMN payment_reference TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE orders ADD COLUMN payment_qr_code TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE orders ADD COLUMN payment_qr_base64 TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'pix'"); } catch (e) { }
    try { await db.exec("ALTER TABLE orders ADD COLUMN customer_name TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE orders ADD COLUMN customer_phone TEXT"); } catch (e) { }

    // SaaS Multi-tenancy Migrations
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN phone TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN email TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN plan TEXT DEFAULT 'trial'"); } catch (e) { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN mode TEXT DEFAULT 'saas'"); } catch (e) { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN subscription_plan TEXT DEFAULT 'starter'"); } catch (e) { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN subscription_status TEXT DEFAULT 'active'"); } catch (e) { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN onboarding_step INTEGER DEFAULT 0"); } catch (e) { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN owner_id TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN custom_domain TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN theme_id TEXT DEFAULT 'classic'"); } catch (e) { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN primary_color TEXT DEFAULT '#7c3aed'"); } catch (e) { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN secondary_color TEXT DEFAULT '#ffffff'"); } catch (e) { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN font_family TEXT DEFAULT 'Inter'"); } catch (e) { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN facebook_pixel_id TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN google_analytics_id TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN tiktok_pixel_id TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN pricing_rules TEXT"); } catch (e) { } // JSON string
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN yield_balance_cents INTEGER DEFAULT 0"); } catch (e) { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN franchise_id TEXT"); } catch (e) { }


    // Set default tenant as store mode
    try { await db.exec("UPDATE restaurants SET mode = 'store', subscription_plan = 'enterprise' WHERE id = 'default_tenant'"); } catch (e) { }

    try { await db.exec("ALTER TABLE menu_items ADD COLUMN restaurant_id TEXT DEFAULT 'default_tenant'"); } catch (e) { }
    try { await db.exec("ALTER TABLE customers ADD COLUMN restaurant_id TEXT DEFAULT 'default_tenant'"); } catch (e) { }
    try { await db.exec("ALTER TABLE customers ADD COLUMN birthday DATE"); } catch (e) { }

    try { await db.exec("ALTER TABLE orders ADD COLUMN restaurant_id TEXT DEFAULT 'default_tenant'"); } catch (e) { }
    try { await db.exec("ALTER TABLE orders ADD COLUMN source TEXT DEFAULT 'internal'"); } catch (e) { }
    try { await db.exec("ALTER TABLE orders ADD COLUMN external_id TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE orders ADD COLUMN fiscal_status TEXT DEFAULT 'pending'"); } catch (e) { }
    try { await db.exec("ALTER TABLE orders ADD COLUMN nfe_number TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE orders ADD COLUMN nfe_url TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE orders ADD COLUMN tax_id TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE orders ADD COLUMN type TEXT DEFAULT 'delivery'"); } catch (e) { }
    try { await db.exec("ALTER TABLE orders ADD COLUMN table_id TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE orders ADD COLUMN is_surge INTEGER DEFAULT 0"); } catch (e) { }
    try { await db.exec("ALTER TABLE orders ADD COLUMN is_happy_hour INTEGER DEFAULT 0"); } catch (e) { }

    // CRM Migrations
    try { await db.exec("ALTER TABLE customers ADD COLUMN email TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE customers ADD COLUMN tags TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE customers ADD COLUMN notes TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE customers ADD COLUMN last_order_at DATETIME"); } catch (e) { }
    try { await db.exec("ALTER TABLE customers ADD COLUMN total_orders INTEGER DEFAULT 0"); } catch (e) { }
    try { await db.exec("ALTER TABLE inventory_items ADD COLUMN acquisition_cost_cents INTEGER DEFAULT 0"); } catch (e) { }
    try { await db.exec("ALTER TABLE inventory_items ADD COLUMN min_stock REAL DEFAULT 0"); } catch (e) { }
    try { await db.exec("ALTER TABLE customers ADD COLUMN otp_code TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE customers ADD COLUMN tax_id TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE customer_campaigns ADD COLUMN scheduled_for DATETIME"); } catch (e) { }

    // Customer Addresses Table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS customer_addresses (
            id TEXT PRIMARY KEY,
            customer_id TEXT NOT NULL,
            label TEXT, -- 'Casa', 'Trabalho', etc.
            street TEXT NOT NULL,
            number TEXT NOT NULL,
            complement TEXT,
            neighborhood TEXT NOT NULL,
            city TEXT NOT NULL,
            is_default INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        );
    `);

    // ERP: Inventory & Recipes Tables
    await db.exec(`
        CREATE TABLE IF NOT EXISTS inventory_items (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            sku TEXT,
            unit TEXT NOT NULL,
            current_qty REAL DEFAULT 0,
            min_stock REAL DEFAULT 0,
            acquisition_cost_cents INTEGER DEFAULT 0,
            supplier TEXT,
            active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS recipes (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            menu_item_id TEXT NOT NULL,
            name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
        );

        CREATE TABLE IF NOT EXISTS recipe_items (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            recipe_id TEXT NOT NULL,
            inventory_item_id TEXT NOT NULL,
            qty REAL NOT NULL,
            unit TEXT NOT NULL,
            FOREIGN KEY (recipe_id) REFERENCES recipes(id),
            FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id)
        );

        CREATE TABLE IF NOT EXISTS inventory_movements (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            inventory_item_id TEXT NOT NULL,
            type TEXT NOT NULL,
            qty REAL NOT NULL,
            reason TEXT NOT NULL,
            ref_order_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id)
        );

        -- CRM & Marketing Tables
        CREATE TABLE IF NOT EXISTS promo_codes (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            code TEXT NOT NULL,
            type TEXT NOT NULL, -- 'fixed' or 'percentage'
            value INTEGER NOT NULL,
            min_order_value_cents INTEGER DEFAULT 0,
            max_discount_cents INTEGER,
            usage_limit INTEGER,
            used_count INTEGER DEFAULT 0,
            expires_at DATETIME,
            active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(restaurant_id, code)
        );

        CREATE TABLE IF NOT EXISTS marketing_campaigns (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            message_template TEXT NOT NULL,
            audience_filter TEXT,
            status TEXT DEFAULT 'draft',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Financial Tables
        CREATE TABLE IF NOT EXISTS cash_sessions (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            closed_at DATETIME,
            initial_value_cents INTEGER NOT NULL,
            final_value_cents INTEGER,
            expected_value_cents INTEGER,
            status TEXT DEFAULT 'open' -- 'open', 'closed'
        );

        CREATE TABLE IF NOT EXISTS financial_entries (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            cash_session_id TEXT,
            type TEXT NOT NULL, -- 'in' (suprimento/venda), 'out' (sangria/despesa)
            category TEXT NOT NULL, -- 'sale', 'supply', 'bleed', 'expense'
            value_cents INTEGER NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id)
        );

        -- Supply Chain Management
        CREATE TABLE IF NOT EXISTS suppliers (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            contact_name TEXT,
            phone TEXT,
            email TEXT,
            category TEXT, -- 'food', 'packaging', 'service'
            active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
        );

        CREATE TABLE IF NOT EXISTS inventory_purchases (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            supplier_id TEXT NOT NULL,
            total_value_cents INTEGER NOT NULL,
            status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'cancelled'
            purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            observation TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        );

        CREATE TABLE IF NOT EXISTS inventory_purchase_items (
            id TEXT PRIMARY KEY,
            purchase_id TEXT,
            inventory_item_id TEXT,
            quantity REAL,
            unit_price_cents INTEGER,
            total_price_cents INTEGER,
            FOREIGN KEY(purchase_id) REFERENCES inventory_purchases(id),
            FOREIGN KEY(inventory_item_id) REFERENCES inventory_items(id)
        );

        CREATE TABLE IF NOT EXISTS restaurant_tables (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT,
            number TEXT,
            capacity INTEGER,
            location TEXT,
            status TEXT DEFAULT 'free', -- 'free', 'occupied', 'check_requested'
            qr_code_token TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS table_orders (
            table_id TEXT,
            order_id TEXT,
            PRIMARY KEY(table_id, order_id),
            FOREIGN KEY(table_id) REFERENCES restaurant_tables(id),
            FOREIGN KEY(order_id) REFERENCES orders(id)
        );

        CREATE TABLE IF NOT EXISTS marketing_campaign_messages (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            message TEXT NOT NULL,
            filters TEXT, -- JSON string
            status TEXT DEFAULT 'pending', -- 'pending', 'sending', 'completed', 'failed'
            total_target INTEGER DEFAULT 0,
            sent_count INTEGER DEFAULT 0,
            error_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
        );

        CREATE TABLE IF NOT EXISTS marketing_campaign_deliveries (
            id TEXT PRIMARY KEY,
            campaign_id TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            status TEXT NOT NULL, -- 'sent', 'failed'
            error_message TEXT,
            sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id),
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        );

        CREATE TABLE IF NOT EXISTS notification_logs (
            id TEXT PRIMARY KEY,
            order_id TEXT,
            phone TEXT,
            event TEXT NOT NULL,
            message TEXT,
            status TEXT NOT NULL, -- 'sent', 'failed', 'skipped'
            provider TEXT NOT NULL,
            error_message TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS whatsapp_configs (
            restaurant_id TEXT PRIMARY KEY,
            base_url TEXT NOT NULL,
            instance TEXT NOT NULL,
            apikey TEXT NOT NULL,
            active INTEGER DEFAULT 1,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
        );
    `);

    // Order Events Table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS order_events (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            type TEXT NOT NULL,
            payload TEXT, -- JSON payload
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id)
        );
    `);

    // Indices for SQLite (Fallback mode)
    await db.exec(`
        CREATE INDEX IF NOT EXISTS idx_menu_category ON menu_items(category);
        CREATE INDEX IF NOT EXISTS idx_menu_available ON menu_items(available);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
        CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
        CREATE INDEX IF NOT EXISTS idx_tenant_menu ON menu_items(restaurant_id);
        CREATE INDEX IF NOT EXISTS idx_tenant_orders ON orders(restaurant_id);
        CREATE INDEX IF NOT EXISTS idx_tenant_customers ON customers(restaurant_id);
        CREATE INDEX IF NOT EXISTS idx_restaurant_slug ON restaurants(slug);
        CREATE INDEX IF NOT EXISTS idx_inventory_tenant ON inventory_items(restaurant_id);
        CREATE INDEX IF NOT EXISTS idx_recipe_tenant ON recipes(restaurant_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_phone_tenant ON customers(restaurant_id, phone);

        -- ERP Phase 2 (Finance/PDV) --
        CREATE TABLE IF NOT EXISTS cash_sessions (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            closed_at DATETIME,
            opening_amount INTEGER DEFAULT 0,
            closing_amount INTEGER,
            status TEXT DEFAULT 'open'
        );

        CREATE TABLE IF NOT EXISTS cash_movements (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            session_id TEXT NOT NULL,
            type TEXT NOT NULL,
            method TEXT NOT NULL,
            amount INTEGER NOT NULL,
            reason TEXT,
            ref_order_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES cash_sessions(id)
        );

        CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            order_id TEXT NOT NULL,
            method TEXT NOT NULL,
            amount INTEGER NOT NULL,
            status TEXT DEFAULT 'approved',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            date TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            amount INTEGER NOT NULL,
            method TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_cash_sessions_tenant ON cash_sessions(restaurant_id);
        CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(restaurant_id);
        CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON expenses(restaurant_id);
    `);

    // Coupons Table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS coupons (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            code TEXT NOT NULL,
            description TEXT,
            type TEXT NOT NULL DEFAULT 'flat',       -- 'flat' | 'percent'
            discount_value INTEGER NOT NULL,         -- cents (flat) or basis points (percent, e.g. 1000 = 10%)
            min_order_cents INTEGER DEFAULT 0,
            max_uses INTEGER DEFAULT 0,              -- 0 = unlimited
            used_count INTEGER DEFAULT 0,
            expires_at DATETIME,
            active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(restaurant_id, code)
        );
        CREATE INDEX IF NOT EXISTS idx_coupons_tenant ON coupons(restaurant_id);
        CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(restaurant_id, code);
    `);

    // ERP Phase 4 (Growth & Loyalty)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS loyalty_points (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            order_id TEXT,
            points INTEGER NOT NULL, -- pode ser negativo quando resgatar
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        );

        CREATE TABLE IF NOT EXISTS customer_rewards (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            reward_name TEXT NOT NULL,
            points_cost INTEGER NOT NULL,
            status TEXT DEFAULT 'available', -- 'available', 'redeemed'
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            redeemed_at DATETIME,
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        );

        CREATE INDEX IF NOT EXISTS idx_loyalty_points_tenant ON loyalty_points(restaurant_id);
        CREATE INDEX IF NOT EXISTS idx_loyalty_points_cust ON loyalty_points(customer_id);
        CREATE INDEX IF NOT EXISTS idx_customer_rewards_tenant ON customer_rewards(restaurant_id);
    `);

    // ERP Phase 3 (Drivers)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS drivers (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            vehicle TEXT, -- Moto, Bicicleta, Carro
            status TEXT DEFAULT 'active', -- 'active', 'inactive'
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
        );

        CREATE TABLE IF NOT EXISTS driver_orders (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            driver_id TEXT NOT NULL,
            order_id TEXT NOT NULL,
            delivery_fee_cents INTEGER DEFAULT 0,
            status TEXT DEFAULT 'assigned', -- 'assigned', 'delivered', 'returned'
            assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
            FOREIGN KEY (driver_id) REFERENCES drivers(id),
            FOREIGN KEY (order_id) REFERENCES orders(id)
        );

        CREATE INDEX IF NOT EXISTS idx_driver_orders_did ON driver_orders(driver_id);

        -- Safe Migrations 
        try { await db.exec("ALTER TABLE driver_orders ADD COLUMN settled INTEGER DEFAULT 0"); } catch (e) { }
        try { await db.exec("ALTER TABLE driver_orders ADD COLUMN distance_km REAL"); } catch (e) { }
        try { await db.exec("ALTER TABLE driver_orders ADD COLUMN estimated_minutes INTEGER"); } catch (e) { }
        try { await db.exec("ALTER TABLE drivers ADD COLUMN rating REAL DEFAULT 5.0"); } catch (e) { }
        try { await db.exec("ALTER TABLE drivers ADD COLUMN is_online INTEGER DEFAULT 0"); } catch (e) { }
        try { await db.exec("ALTER TABLE drivers ADD COLUMN last_dispatch_at DATETIME"); } catch (e) { }
        try { await db.exec("ALTER TABLE drivers ADD COLUMN access_code TEXT"); } catch (e) { }
    `);

    // Driver System Refinement (Phase 17)
    try { await db.exec("ALTER TABLE drivers ADD COLUMN cnh TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE drivers ADD COLUMN pix_key TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE drivers ADD COLUMN is_online INTEGER DEFAULT 0"); } catch (e) { }
    try { await db.exec("ALTER TABLE drivers ADD COLUMN last_dispatch_at DATETIME"); } catch (e) { }
    try { await db.exec("ALTER TABLE driver_orders ADD COLUMN distance_km REAL DEFAULT 0"); } catch (e) { }
    try { await db.exec("ALTER TABLE driver_orders ADD COLUMN estimated_time_minutes INTEGER DEFAULT 0"); } catch (e) { }
    try { await db.exec("ALTER TABLE driver_orders ADD COLUMN settled INTEGER DEFAULT 0"); } catch (e) { }
    try { await db.exec("ALTER TABLE drivers ADD COLUMN access_code TEXT"); } catch (e) { }

    // Safe migration: add payment_method and coupon columns to orders
    try { await db.exec("ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'pix'"); } catch { }
    try { await db.exec("ALTER TABLE orders ADD COLUMN discount_cents INTEGER DEFAULT 0"); } catch { }
    try { await db.exec("ALTER TABLE orders ADD COLUMN coupon_code TEXT"); } catch { }

    // Order Ratings Table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS order_ratings (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL UNIQUE,
            restaurant_id TEXT NOT NULL,
            customer_name TEXT,
            stars INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
            comment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id)
        );
        CREATE INDEX IF NOT EXISTS idx_ratings_tenant ON order_ratings(restaurant_id);
        CREATE INDEX IF NOT EXISTS idx_ratings_order ON order_ratings(order_id);
    `);

    // Restaurant Operations Engine — safe migrations
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN store_status TEXT DEFAULT 'open'"); } catch { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN opening_hours TEXT"); } catch { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN timezone TEXT DEFAULT 'America/Sao_Paulo'"); } catch { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN max_orders_simultaneous INTEGER DEFAULT 0"); } catch { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN prep_time_minutes INTEGER DEFAULT 30"); } catch { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN temp_close_reason TEXT"); } catch { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN delivery_fee_cents INTEGER DEFAULT 500"); } catch { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN min_order_cents INTEGER DEFAULT 0"); } catch { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN logo_url TEXT"); } catch { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN banner_url TEXT"); } catch { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN description TEXT"); } catch { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN address TEXT"); } catch { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN whatsapp TEXT"); } catch { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN primary_color TEXT DEFAULT '#9333ea'"); } catch { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN secondary_color TEXT DEFAULT '#ffffff'"); } catch { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN cnpj TEXT"); } catch { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN state_registration TEXT"); } catch { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN focus_nfe_token TEXT"); } catch { }
    try { await db.exec("ALTER TABLE restaurants ADD COLUMN fiscal_environment TEXT DEFAULT 'sandbox'"); } catch { }

    // Menu item fields
    try { await db.exec("ALTER TABLE menu_items ADD COLUMN out_of_stock INTEGER DEFAULT 0"); } catch { }
    try { await db.exec("ALTER TABLE menu_items ADD COLUMN hidden INTEGER DEFAULT 0"); } catch { }
    try { await db.exec("ALTER TABLE menu_items ADD COLUMN sort_order INTEGER DEFAULT 0"); } catch { }

    // --- Logs ---
    await db.exec(`
        CREATE TABLE IF NOT EXISTS system_logs (
            id TEXT PRIMARY KEY,
            level TEXT NOT NULL,
            message TEXT NOT NULL,
            context TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // --- Logistics (Driver Tracking) ---
    await db.exec(`
        CREATE TABLE IF NOT EXISTS driver_locations (
            driver_id TEXT PRIMARY KEY,
            order_id TEXT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            heading REAL,
            last_update DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(order_id) REFERENCES orders(id)
        )
    `);

    // Restaurant Settings (key-value store per tenant)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS restaurant_settings (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(restaurant_id, key)
        );
        CREATE INDEX IF NOT EXISTS idx_settings_tenant ON restaurant_settings(restaurant_id);
    `);

    // ─── Product Option Groups (Modifiers) ────────────────────────────────────
    // Supports: required/optional, min/max selections, price adjustments
    await db.exec(`
        CREATE TABLE IF NOT EXISTS option_groups (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            menu_item_id TEXT NOT NULL,
            name TEXT NOT NULL,
            required INTEGER DEFAULT 1,         -- 1 = obrigatório, 0 = opcional
            min_select INTEGER DEFAULT 1,       -- minimum choices
            max_select INTEGER DEFAULT 1,       -- maximum choices (1 = single, N = multi)
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
        );
        CREATE INDEX IF NOT EXISTS idx_og_menu_item ON option_groups(menu_item_id);
        CREATE INDEX IF NOT EXISTS idx_og_tenant ON option_groups(restaurant_id);

        CREATE TABLE IF NOT EXISTS option_items (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            option_group_id TEXT NOT NULL,
            name TEXT NOT NULL,
            price_cents INTEGER DEFAULT 0,      -- additional price (0 = included)
            sort_order INTEGER DEFAULT 0,
            available INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (option_group_id) REFERENCES option_groups(id)
        );
        CREATE INDEX IF NOT EXISTS idx_oi_group ON option_items(option_group_id);
        CREATE INDEX IF NOT EXISTS idx_oi_tenant ON option_items(restaurant_id);
    `);

    // ─── Notification Logs ────────────────────────────────────────────────────
    await db.exec(`
        CREATE TABLE IF NOT EXISTS notification_logs (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            phone TEXT,
            event TEXT NOT NULL,
            message TEXT,
            status TEXT NOT NULL DEFAULT 'sent',  -- 'sent' | 'failed' | 'skipped'
            provider TEXT NOT NULL DEFAULT 'mock',
            error_message TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_notif_logs_order ON notification_logs(order_id);
        CREATE INDEX IF NOT EXISTS idx_notif_logs_created ON notification_logs(created_at);
    `);

    // ─── Payment Logs ─────────────────────────────────────────────────────────
    await db.exec(`
        CREATE TABLE IF NOT EXISTS payment_logs (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            provider TEXT NOT NULL DEFAULT 'mercadopago',
            payment_reference TEXT,
            status TEXT NOT NULL,
            payload TEXT,
            error_message TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_payment_logs_order ON payment_logs(order_id);
        CREATE INDEX IF NOT EXISTS idx_payment_logs_ref ON payment_logs(payment_reference);
    `);

    // ─── Marketing Automation (Phase 16) ──────────────────────────────────────
    await db.exec(`
        CREATE TABLE IF NOT EXISTS customer_campaigns (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            type TEXT NOT NULL, -- 'winback', 'loyalty', 'birthday'
            coupon_id TEXT,
            channel TEXT DEFAULT 'whatsapp',
            status TEXT DEFAULT 'sent',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
            FOREIGN KEY (customer_id) REFERENCES customers(id),
            FOREIGN KEY (coupon_id) REFERENCES coupons(id)
        );

        CREATE TABLE IF NOT EXISTS marketing_triggers (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL, -- 'winback', 'loyalty'
            days_inactive INTEGER, -- for winback
            order_count INTEGER,    -- for loyalty
            coupon_template_id TEXT, -- optional: base template for new coupons
            discount_type TEXT DEFAULT 'flat',
            discount_value INTEGER,
            active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(restaurant_id, type)
        );

        CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON customer_campaigns(restaurant_id);
        CREATE INDEX IF NOT EXISTS idx_campaigns_customer ON customer_campaigns(customer_id);

        -- Performance Optimization Indices (Phase 31)
        CREATE INDEX IF NOT EXISTS idx_menu_tenant_cat ON menu_items(restaurant_id, category);
        CREATE INDEX IF NOT EXISTS idx_menu_tenant_vis ON menu_items(restaurant_id, hidden, available);
        CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
        CREATE INDEX IF NOT EXISTS idx_orders_tenant_created ON orders(restaurant_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON orders(restaurant_id, status);
        CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
        CREATE INDEX IF NOT EXISTS idx_customers_tenant_phone ON customers(restaurant_id, phone);

        -- Enterprise Security & RBAC (Phase 35)
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            username TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'staff', -- 'owner' | 'manager' | 'staff'
            last_login DATETIME,
            active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
            UNIQUE(restaurant_id, username)
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            action TEXT NOT NULL,
            resource TEXT NOT NULL,
            resource_id TEXT,
            payload TEXT, -- JSON details
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(restaurant_id);
        CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(restaurant_id);
        CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);

        -- Marketplace Hub (Phase 45)
        CREATE TABLE IF NOT EXISTS marketplace_integrations (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            platform TEXT NOT NULL, -- 'ifood', 'rappi'
            status TEXT DEFAULT 'disconnected', -- 'connected', 'disconnected'
            config_json TEXT, -- API keys, tokens, etc.
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
            UNIQUE(restaurant_id, platform)
        );

        CREATE TABLE IF NOT EXISTS product_mappings (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            internal_id TEXT NOT NULL,
            external_id TEXT NOT NULL,
            platform TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
            FOREIGN KEY (internal_id) REFERENCES menu_items(id),
            UNIQUE(restaurant_id, internal_id, platform),
            UNIQUE(restaurant_id, external_id, platform)
        );

        CREATE TABLE IF NOT EXISTS customer_wallets (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            balance_cents INTEGER DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
            FOREIGN KEY (customer_id) REFERENCES customers(id),
            UNIQUE(restaurant_id, customer_id)
        );

        CREATE TABLE IF NOT EXISTS wallet_movements (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            type TEXT NOT NULL, -- 'credit', 'debit'
            amount_cents INTEGER NOT NULL,
            reason TEXT NOT NULL, -- 'referral', 'cashback', 'refund', 'purchase'
            ref_order_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        );

        CREATE TABLE IF NOT EXISTS referrals (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            referrer_id TEXT NOT NULL, -- Quem indicou
            referred_id TEXT NOT NULL, -- Quem foi indicado
            status TEXT DEFAULT 'pending', -- 'pending', 'rewarded'
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
            FOREIGN KEY (referrer_id) REFERENCES customers(id),
            FOREIGN KEY (referred_id) REFERENCES customers(id),
            UNIQUE(referred_id) -- Um cliente só pode ser indicado uma vez
        );

        -- Add columns to customers
        try { await db.exec("ALTER TABLE customers ADD COLUMN referral_code TEXT"); } catch (e) { }
        try { await db.exec("ALTER TABLE customers ADD COLUMN is_vip INTEGER DEFAULT 0"); } catch (e) { }
        try { await db.exec("ALTER TABLE customers ADD COLUMN vip_expires_at DATETIME"); } catch (e) { }
        
        -- Indices for Loyalty 2.0
        CREATE INDEX IF NOT EXISTS idx_wallet_cust ON customer_wallets(customer_id);
        CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
        CREATE INDEX IF NOT EXISTS idx_customers_ref_code ON customers(referral_code);

        -- Marketplace Logs (Phase 48)
        CREATE TABLE IF NOT EXISTS marketplace_logs (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            platform TEXT NOT NULL,
            action TEXT NOT NULL,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
        );
        CREATE INDEX IF NOT EXISTS idx_mkt_logs_tenant ON marketplace_logs(restaurant_id);

        -- Franchise Engine (Phase 80)
        CREATE TABLE IF NOT EXISTS franchise_locations (
            id TEXT PRIMARY KEY,
            franchise_id TEXT NOT NULL,
            restaurant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
        );

        CREATE TABLE IF NOT EXISTS franchise_plans (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            monthly_price_cents INTEGER NOT NULL,
            commission_bps INTEGER DEFAULT 0, -- Basis points (100 = 1%)
            active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS franchise_billing (
            id TEXT PRIMARY KEY,
            franchise_id TEXT NOT NULL,
            restaurant_id TEXT NOT NULL,
            period_start DATETIME NOT NULL,
            period_end DATETIME NOT NULL,
            base_fee_cents INTEGER NOT NULL,
            commission_cents INTEGER NOT NULL,
            total_cents INTEGER NOT NULL,
            status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS franchise_settings (
            id TEXT PRIMARY KEY,
            franchise_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(franchise_id, key)
        );

        -- Growth Engine (Phase 78)
        CREATE TABLE IF NOT EXISTS customer_segments (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            query_json TEXT NOT NULL, -- Critérios de segmentação
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS campaigns (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            segment_id TEXT,
            type TEXT NOT NULL, -- 'whatsapp', 'email', 'push'
            status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'completed'
            message_template TEXT NOT NULL,
            scheduled_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (segment_id) REFERENCES customer_segments(id)
        );

        CREATE TABLE IF NOT EXISTS campaign_logs (
            id TEXT PRIMARY KEY,
            campaign_id TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            status TEXT NOT NULL, -- 'sent', 'delivered', 'read', 'failed'
            error_message TEXT,
            delivered_at DATETIME,
            read_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        );

        CREATE INDEX IF NOT EXISTS idx_franchise_loc_rest ON franchise_locations(restaurant_id);
        CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON campaigns(restaurant_id);
        CREATE INDEX IF NOT EXISTS idx_campaign_logs_camp ON campaign_logs(campaign_id);

        -- Customer Migration System (Anti-iFood)
        CREATE TABLE IF NOT EXISTS qr_campaigns (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT,
            name TEXT,
            discount_value REAL,
            discount_type TEXT, -- 'amount' or 'percentage'
            landing_slug TEXT,
            scan_count INTEGER DEFAULT 0,
            conversions INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS qr_scans (
            id TEXT PRIMARY KEY,
            campaign_id TEXT,
            scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT,
            user_agent TEXT
        );

        CREATE TABLE IF NOT EXISTS coupons (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT,
            code TEXT UNIQUE,
            discount_value REAL,
            discount_type TEXT,
            is_one_time INTEGER DEFAULT 1,
            usage_limit INTEGER DEFAULT 1,
            usage_count INTEGER DEFAULT 0,
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS customer_sources (
            customer_id TEXT PRIMARY KEY,
            source TEXT, -- 'ifood', 'qr_campaign', 'referral', 'organic'
            campaign_id TEXT,
            migrated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    console.log('📦 Database Schema initialized.');
}
