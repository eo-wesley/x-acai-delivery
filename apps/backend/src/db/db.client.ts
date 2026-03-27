import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

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
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });
        }
        dbInstance = {
            run: async (sql: string, params: any[] = []) => {
                const client = await pgPool!.connect();
                try {
                    // Convert SQLite ? to Postgres $1, $2, etc.
                    let paramIndex = 0;
                    const pgSql = sql.replace(/\?/g, () => `$${++paramIndex}`);
                    const res = await client.query(pgSql, params);
                    return { lastID: null, changes: res.rowCount };
                } finally { client.release(); }
            },
            get: async (sql: string, params: any[] = []) => {
                const client = await pgPool!.connect();
                try {
                    let paramIndex = 0;
                    const pgSql = sql.replace(/\?/g, () => `$${++paramIndex}`);
                    const res = await client.query(pgSql, params);
                    return res.rows[0];
                } finally { client.release(); }
            },
            all: async (sql: string, params: any[] = []) => {
                const client = await pgPool!.connect();
                try {
                    let paramIndex = 0;
                    const pgSql = sql.replace(/\?/g, () => `$${++paramIndex}`);
                    const res = await client.query(pgSql, params);
                    return res.rows;
                } finally { client.release(); }
            },
            exec: async (sql: string) => {
                const client = await pgPool!.connect();
                try { return await client.query(sql); } finally { client.release(); }
            }
        };
    } else {
        const dbPath = process.env.DATABASE_URL || './database.sqlite';
        dbInstance = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
    }
    return dbInstance;
}

export async function setupDatabase() {
    const db = await getDb();

    const tables = [
        `CREATE TABLE IF NOT EXISTS restaurants (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            phone TEXT,
            email TEXT,
            status TEXT DEFAULT 'active',
            plan TEXT DEFAULT 'trial',
            mode TEXT DEFAULT 'saas',
            subscription_plan TEXT DEFAULT 'starter',
            subscription_status TEXT DEFAULT 'active',
            onboarding_step INTEGER DEFAULT 0,
            owner_id TEXT,
            city TEXT,
            address TEXT,
            logo_url TEXT,
            banner_url TEXT,
            active INTEGER DEFAULT 1,
            description TEXT,
            whatsapp TEXT,
            primary_color TEXT DEFAULT '#9333ea',
            secondary_color TEXT DEFAULT '#ffffff',
            pricing_rules TEXT, -- JSON rules for surge and happy hour
            yield_balance_cents INTEGER DEFAULT 0,
            cnpj TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS menu_items (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            price_cents INTEGER NOT NULL,
            category TEXT,
            available INTEGER DEFAULT 1,
            image_url TEXT,
            out_of_stock INTEGER DEFAULT 0,
            hidden INTEGER DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT,
            otp_code TEXT,
            last_order_at DATETIME,
            total_orders INTEGER DEFAULT 0,
            total_spent_cents INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(restaurant_id, phone)
        )`,
        `CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            status TEXT NOT NULL,
            items TEXT NOT NULL,
            subtotal_cents INTEGER NOT NULL,
            delivery_fee_cents INTEGER NOT NULL,
            total_cents INTEGER NOT NULL,
            discount_cents INTEGER DEFAULT 0,
            coupon_code TEXT,
            address_text TEXT NOT NULL,
            payment_status TEXT DEFAULT 'pending_payment',
            payment_method TEXT DEFAULT 'pix',
            payment_provider TEXT,
            transaction_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS coupons (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            code TEXT NOT NULL,
            description TEXT,
            type TEXT NOT NULL DEFAULT 'flat',
            discount_value INTEGER NOT NULL,
            min_order_cents INTEGER DEFAULT 0,
            max_uses INTEGER DEFAULT 0,
            used_count INTEGER DEFAULT 0,
            active INTEGER DEFAULT 1,
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(restaurant_id, code)
        )`,
        `CREATE TABLE IF NOT EXISTS drivers (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            vehicle TEXT,
            status TEXT DEFAULT 'active',
            access_code TEXT,
            is_online INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS option_groups (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            menu_item_id TEXT NOT NULL,
            name TEXT NOT NULL,
            required INTEGER DEFAULT 0,
            min_select INTEGER DEFAULT 0,
            max_select INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS option_items (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            option_group_id TEXT NOT NULL,
            name TEXT NOT NULL,
            price_cents INTEGER NOT NULL,
            available INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS restaurant_settings (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(restaurant_id, key)
        )`,
        `CREATE TABLE IF NOT EXISTS cash_sessions (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            user_id TEXT,
            initial_value_cents INTEGER DEFAULT 0,
            final_value_cents INTEGER,
            expected_value_cents INTEGER,
            opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            closed_at DATETIME,
            opening_amount INTEGER DEFAULT 0,
            closing_amount INTEGER,
            status TEXT DEFAULT 'open'
        )`,
        `CREATE TABLE IF NOT EXISTS system_logs (
            id TEXT PRIMARY KEY,
            level TEXT NOT NULL,
            message TEXT NOT NULL,
            context TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS payment_logs (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            payment_reference TEXT,
            status TEXT NOT NULL,
            payload TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS qr_campaigns (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            discount_value REAL,
            discount_type TEXT,
            landing_slug TEXT UNIQUE,
            scan_count INTEGER DEFAULT 0,
            conversions INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS loyalty_points (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            points INTEGER NOT NULL,
            type TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS customer_segments (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            query_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS campaigns (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            segment_id TEXT,
            type TEXT,
            status TEXT DEFAULT 'draft',
            message_template TEXT,
            scheduled_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS marketing_triggers (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            type TEXT NOT NULL,
            active INTEGER DEFAULT 1,
            days_inactive INTEGER,
            order_count INTEGER,
            discount_type TEXT,
            discount_value INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS customer_campaigns (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            type TEXT NOT NULL,
            coupon_id TEXT,
            status TEXT DEFAULT 'sent',
            scheduled_for DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS inventory_items (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            current_qty INTEGER DEFAULT 0,
            min_qty INTEGER DEFAULT 0,
            unit TEXT,
            supplier TEXT,
            category TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS suppliers (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            contact_name TEXT,
            phone TEXT,
            email TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        // ===== TABELAS ADICIONAIS (usadas por repos/services) =====
        `CREATE TABLE IF NOT EXISTS financial_entries (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            cash_session_id TEXT,
            type TEXT NOT NULL,
            category TEXT,
            value_cents INTEGER NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS order_items (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            item_id TEXT,
            item_name TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            price_cents INTEGER NOT NULL DEFAULT 0,
            options_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            user_id TEXT,
            action TEXT NOT NULL,
            resource TEXT,
            resource_id TEXT,
            payload TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS notification_logs (
            id TEXT PRIMARY KEY,
            order_id TEXT,
            channel TEXT,
            status TEXT,
            payload TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS order_ratings (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            order_id TEXT NOT NULL,
            customer_id TEXT,
            stars INTEGER NOT NULL DEFAULT 5,
            comment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            order_id TEXT NOT NULL,
            method TEXT,
            amount INTEGER NOT NULL DEFAULT 0,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS driver_orders (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            driver_id TEXT NOT NULL,
            order_id TEXT NOT NULL,
            status TEXT DEFAULT 'assigned',
            fee_cents INTEGER DEFAULT 0,
            assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS order_events (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            type TEXT NOT NULL,
            payload TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS customer_addresses (
            id TEXT PRIMARY KEY,
            customer_id TEXT NOT NULL,
            label TEXT,
            street TEXT NOT NULL,
            number TEXT,
            complement TEXT,
            neighborhood TEXT,
            city TEXT,
            is_default INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    for (const sql of tables) {
        try {
            const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
            await db.exec(sql);
            if (tableName) console.log(`✅ Table ${tableName} created/verified.`);
        } catch (e) {
            console.error('❌ Error executing SQL:', sql.substring(0, 50), e);
        }
    }

    // ===== ALTER TABLE migrations (colunas ausentes em tabelas existentes) =====
    const alterations = [
        // orders — colunas do fluxo de pedido
        `ALTER TABLE orders ADD COLUMN customer_name TEXT`,
        `ALTER TABLE orders ADD COLUMN customer_phone TEXT`,
        `ALTER TABLE orders ADD COLUMN source TEXT DEFAULT 'online'`,
        `ALTER TABLE orders ADD COLUMN notes TEXT`,
        `ALTER TABLE orders ADD COLUMN payment_qr_code TEXT`,
        `ALTER TABLE orders ADD COLUMN payment_qr_base64 TEXT`,
        `ALTER TABLE orders ADD COLUMN payment_reference TEXT`,
        `ALTER TABLE orders ADD COLUMN external_id TEXT`,
        `ALTER TABLE orders ADD COLUMN tax_id TEXT`,
        `ALTER TABLE orders ADD COLUMN is_surge INTEGER DEFAULT 0`,
        `ALTER TABLE orders ADD COLUMN is_happy_hour INTEGER DEFAULT 0`,
        `ALTER TABLE orders ADD COLUMN rating INTEGER`,
        `ALTER TABLE orders ADD COLUMN feedback TEXT`,
        `ALTER TABLE orders ADD COLUMN paid_at DATETIME`,
        // driver_orders
        `ALTER TABLE driver_orders ADD COLUMN assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP`,
        // option_groups
        `ALTER TABLE option_groups ADD COLUMN sort_order INTEGER DEFAULT 0`,
        // option_items
        `ALTER TABLE option_items ADD COLUMN sort_order INTEGER DEFAULT 0`,
        // restaurants
        `ALTER TABLE restaurants ADD COLUMN custom_domain TEXT`,
        // cash_sessions (para bancos antigos que já tinham a tabela sem as colunas novas)
        `ALTER TABLE cash_sessions ADD COLUMN user_id TEXT`,
        `ALTER TABLE cash_sessions ADD COLUMN initial_value_cents INTEGER DEFAULT 0`,
        `ALTER TABLE cash_sessions ADD COLUMN final_value_cents INTEGER`,
        `ALTER TABLE cash_sessions ADD COLUMN expected_value_cents INTEGER`,
        // restaurants — colunas de configuração da loja
        `ALTER TABLE restaurants ADD COLUMN store_status TEXT DEFAULT 'open'`,
        `ALTER TABLE restaurants ADD COLUMN prep_time_minutes INTEGER DEFAULT 30`,
        `ALTER TABLE restaurants ADD COLUMN delivery_fee_cents INTEGER DEFAULT 500`,
        `ALTER TABLE restaurants ADD COLUMN min_order_cents INTEGER DEFAULT 0`,
        `ALTER TABLE restaurants ADD COLUMN slogan TEXT`,
        `ALTER TABLE restaurants ADD COLUMN theme TEXT DEFAULT 'light'`,
        `ALTER TABLE restaurants ADD COLUMN theme_id TEXT`,
        `ALTER TABLE restaurants ADD COLUMN font_family TEXT`,
        `ALTER TABLE restaurants ADD COLUMN temp_close_reason TEXT`,
        `ALTER TABLE restaurants ADD COLUMN can_accept_orders INTEGER DEFAULT 1`,
        `ALTER TABLE restaurants ADD COLUMN facebook_pixel_id TEXT`,
        `ALTER TABLE restaurants ADD COLUMN google_analytics_id TEXT`,
        `ALTER TABLE restaurants ADD COLUMN tiktok_pixel_id TEXT`,
        // customers — colunas de CRM
        `ALTER TABLE customers ADD COLUMN tags TEXT`,
        `ALTER TABLE customers ADD COLUMN notes TEXT`,
        `ALTER TABLE customers ADD COLUMN referral_code TEXT`,
        `ALTER TABLE customers ADD COLUMN otp_expires_at DATETIME`,
    ];

    for (const alter of alterations) {
        try {
            await db.exec(alter);
        } catch (_e: any) {
            // "duplicate column name" é esperado se a coluna já existe — ignorar silenciosamente
        }
    }
    console.log('🔧 ALTER TABLE migrations applied (safe).');

    // ===== SEED DATA: Garantir que exista um restaurante padrão =====
    try {
        const existing = await db.get(`SELECT id FROM restaurants WHERE id = 'default_tenant'`);
        if (!existing) {
            await db.run(
                `INSERT INTO restaurants (id, name, slug, phone, store_status, primary_color, delivery_fee_cents, prep_time_minutes)
                 VALUES ('default_tenant', 'X-Açaí Delivery', 'default', '11999999999', 'open', '#9333ea', 500, 25)`
            );
            console.log('🌱 Default restaurant seeded (default_tenant / slug: default).');
        } else {
            // Garantir que store_status esteja 'open' se estiver NULL
            await db.run(`UPDATE restaurants SET store_status = 'open' WHERE id = 'default_tenant' AND (store_status IS NULL OR store_status = '')`);
        }
    } catch (e: any) {
        console.error('⚠️ Seed error (non-blocking):', e.message);
    }

    console.log('📦 Consolidated Database Schema initialized.');
}
