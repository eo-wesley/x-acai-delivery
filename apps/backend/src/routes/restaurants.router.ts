import { Router } from 'express';
import { adminAuthMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { getDb } from '../db/db.client';
import { randomUUID } from 'crypto';

export const restaurantsRouter = Router();

// ======================== TENANT CONFIG ENDPOINTS ========================
// Public: Get restaurant details by slug (PWA)
restaurantsRouter.get('/:slug/store', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const db = await getDb();
        const restaurant = await db.get(`SELECT * FROM restaurants WHERE id = ?`, [tenantId]);
        if (!restaurant) return res.status(404).json({ error: 'Store not found' });
        res.json(restaurant);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Get current restaurant details
restaurantsRouter.get('/admin/restaurant/config', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const db = await getDb();
        const restaurant = await db.get(`SELECT * FROM restaurants WHERE id = ?`, [tenantId]);
        res.json(restaurant);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Update restaurant branding & config
restaurantsRouter.patch('/admin/restaurant/config', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const updates = req.body;
        const db = await getDb();

        const allowedFields = [
            'name', 'phone', 'email', 'description', 'address',
            'whatsapp', 'logo_url', 'banner_url', 'primary_color',
            'secondary_color', 'store_status', 'prep_time_minutes',
            'delivery_fee_cents', 'min_order_cents', 'custom_domain',
            'theme_id', 'font_family', 'facebook_pixel_id',
            'google_analytics_id', 'tiktok_pixel_id'
        ];

        const setClause = [];
        const params = [];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                setClause.push(`${field} = ?`);
                params.push(updates[field]);
            }
        }

        if (setClause.length === 0) {
            return res.status(400).json({ error: 'No valid fields provided' });
        }

        params.push(tenantId);
        await db.run(
            `UPDATE restaurants SET ${setClause.join(', ')} WHERE id = ?`,
            params
        );

        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Create a new restaurant (Tenant)
// (Existing super admin routes...)
restaurantsRouter.post('/super/restaurants', adminAuthMiddleware, async (req: any, res: any) => {
    try {
        const { name, slogan, bannerUrl, logoUrl, primaryColor, theme } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        // Generate a URL-friendly slug
        let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        const db = await getDb();

        // Ensure slug uniqueness
        let existing = await db.get(`SELECT id FROM restaurants WHERE slug = ?`, [slug]);
        let counter = 1;
        while (existing) {
            const newSlug = `${slug}-${counter}`;
            existing = await db.get(`SELECT id FROM restaurants WHERE slug = ?`, [newSlug]);
            if (!existing) {
                slug = newSlug;
            }
            counter++;
        }

        const id = randomUUID();
        await db.run(
            `INSERT INTO restaurants (id, slug, name, slogan, banner_url, logo_url, primary_color, theme) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, slug, name, slogan || null, bannerUrl || null, logoUrl || null, primaryColor || '#8B5CF6', theme || 'light']
        );

        res.status(201).json({ success: true, id, slug });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// List all restaurants
restaurantsRouter.get('/super/restaurants', adminAuthMiddleware, async (req: any, res: any) => {
    try {
        const db = await getDb();
        const restaurants = await db.all(`SELECT * FROM restaurants ORDER BY created_at DESC`);
        res.json(restaurants);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
