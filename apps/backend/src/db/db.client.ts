import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
    if (dbInstance) return dbInstance;

    dbInstance = await open({
        filename: path.resolve(process.cwd(), 'database.sqlite'),
        driver: sqlite3.Database
    });

    console.log('✅ SQLite Local Database connected successfully.');
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

    // Set default tenant as store mode
    try { await db.exec("UPDATE restaurants SET mode = 'store', subscription_plan = 'enterprise' WHERE id = 'default_tenant'"); } catch (e) { }

    try { await db.exec("ALTER TABLE menu_items ADD COLUMN restaurant_id TEXT DEFAULT 'default_tenant'"); } catch (e) { }
    try { await db.exec("ALTER TABLE customers ADD COLUMN restaurant_id TEXT DEFAULT 'default_tenant'"); } catch (e) { }
    try { await db.exec("ALTER TABLE customers ADD COLUMN birthday DATE"); } catch (e) { }

    try { await db.exec("ALTER TABLE orders ADD COLUMN restaurant_id TEXT DEFAULT 'default_tenant'"); } catch (e) { }

    // CRM Migrations
    try { await db.exec("ALTER TABLE customers ADD COLUMN email TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE customers ADD COLUMN tags TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE customers ADD COLUMN notes TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE customers ADD COLUMN last_order_at DATETIME"); } catch (e) { }
    try { await db.exec("ALTER TABLE customers ADD COLUMN total_orders INTEGER DEFAULT 0"); } catch (e) { }
    try { await db.exec("ALTER TABLE customers ADD COLUMN total_spent_cents INTEGER DEFAULT 0"); } catch (e) { }

    // ERP: Inventory & Recipes Tables
    await db.exec(`
        CREATE TABLE IF NOT EXISTS inventory_items (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            sku TEXT,
            unit TEXT NOT NULL,
            current_qty REAL DEFAULT 0,
            min_qty REAL DEFAULT 0,
            cost_cents INTEGER DEFAULT 0,
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

        CREATE INDEX IF NOT EXISTS idx_drivers_tenant ON drivers(restaurant_id);
        CREATE INDEX IF NOT EXISTS idx_driver_orders_tenant ON driver_orders(restaurant_id);
        CREATE INDEX IF NOT EXISTS idx_driver_orders_did ON driver_orders(driver_id);
    `);

    // Driver System Refinement (Phase 17)
    try { await db.exec("ALTER TABLE drivers ADD COLUMN cnh TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE drivers ADD COLUMN pix_key TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE driver_orders ADD COLUMN distance_km REAL DEFAULT 0"); } catch (e) { }
    try { await db.exec("ALTER TABLE driver_orders ADD COLUMN estimated_time_minutes INTEGER DEFAULT 0"); } catch (e) { }
    try { await db.exec("ALTER TABLE driver_orders ADD COLUMN settled INTEGER DEFAULT 0"); } catch (e) { } // 1 if paid to driver

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

    // Menu item fields
    try { await db.exec("ALTER TABLE menu_items ADD COLUMN out_of_stock INTEGER DEFAULT 0"); } catch { }
    try { await db.exec("ALTER TABLE menu_items ADD COLUMN hidden INTEGER DEFAULT 0"); } catch { }
    try { await db.exec("ALTER TABLE menu_items ADD COLUMN sort_order INTEGER DEFAULT 0"); } catch { }

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

        -- Performance Optimization Indices (Phase 20)
        CREATE INDEX IF NOT EXISTS idx_menu_tenant_cat ON menu_items(restaurant_id, category);
        CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
        CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
        CREATE INDEX IF NOT EXISTS idx_orders_tenant_created ON orders(restaurant_id, created_at);
    `);

    console.log('📦 Database Schema initialized.');
}
