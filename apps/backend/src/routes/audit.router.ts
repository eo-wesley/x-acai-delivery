import { Router } from 'express';
import { getDb } from '../db/db.client';
import { adminAuthMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';

const auditRouter = Router();

// GET /api/admin/audit?limit=50
auditRouter.get('/', adminAuthMiddleware, tenantMiddleware, async (req: any, res) => {
    try {
        const db = await getDb();
        const logs = await db.all(`
            SELECT a.*, u.name as user_name 
            FROM audit_logs a
            LEFT JOIN users u ON u.id = a.user_id
            WHERE a.restaurant_id = ?
            ORDER BY a.created_at DESC
            LIMIT ?
        `, [req.tenantId, parseInt(req.query.limit as string) || 50]);

        res.json(logs);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default auditRouter;
