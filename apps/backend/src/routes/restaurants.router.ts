import { Router } from 'express';
import { adminAuthMiddleware } from '../middlewares/auth.middleware';
import { getDb } from '../db/db.client';
import { randomUUID } from 'crypto';

export const restaurantsRouter = Router();

// ======================== SUPER ADMIN ENDPOINTS ========================
// Create a new restaurant (Tenant)
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
