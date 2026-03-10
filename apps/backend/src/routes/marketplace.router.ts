import { Router } from 'express';
import { getDb } from '../db/db.client';

export const marketplaceRouter = Router();

// Buscar restaurantes por proximidade
marketplaceRouter.get('/marketplace/search', async (req: any, res: any) => {
    try {
        const { lat, lng, radius = 10 } = req.query; // Raio em KM
        const db = await getDb();

        // Simulação de busca espacial por Haversine (SQLite não tem ST_Distance nativo sem extensões)
        // Buscamos todos e filtramos no JS para este MVP, ou usamos aproximação por bounding box
        const restaurants = await db.all(`SELECT * FROM restaurants WHERE status = 'active'`);

        const filtered = restaurants.filter(r => {
            if (!r.latitude || !r.longitude || !lat || !lng) return true;

            const distance = calculateDistance(
                parseFloat(lat), parseFloat(lng),
                parseFloat(r.latitude), parseFloat(r.longitude)
            );
            return distance <= parseFloat(radius);
        });

        res.json(filtered);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

marketplaceRouter.get('/marketplace/featured', async (req: any, res: any) => {
    try {
        const db = await getDb();
        const top = await db.all(`
            SELECT r.*, AVG(o.rating) as avg_rating 
            FROM restaurants r
            LEFT JOIN orders o ON r.id = o.restaurant_id
            GROUP BY r.id
            ORDER BY avg_rating DESC
            LIMIT 10
        `);
        res.json(top);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

marketplaceRouter.get('/marketplace/categories', async (req: any, res: any) => {
    try {
        // Mock de categorias ou extração do banco
        res.json(['Açaí', 'Sorvetes', 'Gelados', 'Bebidas', 'Lanches']);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
