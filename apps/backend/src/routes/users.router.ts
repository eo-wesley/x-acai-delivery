import { Router } from 'express';
import { usersRepo } from '../db/repositories/users.repo';
import { adminAuthMiddleware, requireRole } from '../middlewares/auth.middleware';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { auditService } from '../services/audit.service';

export const usersRouter = Router();

// User Login (Unified for all employees)
usersRouter.post('/auth/login', async (req, res) => {
    try {
        const { username, password, restaurant_slug } = req.body;

        // 1. Find restaurant by slug to get ID
        const db = await (await import('../db/db.client')).getDb();
        const restaurant = await db.get(`SELECT id FROM restaurants WHERE slug = ?`, [restaurant_slug || 'default']);

        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurante não encontrado' });
        }

        // 2. Find user in the restaurant
        const user = await usersRepo.findByUsername(restaurant.id, username);
        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // 3. Verify password
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // 4. Update last login
        await usersRepo.updateLastLogin(user.id);

        // 5. Generate token
        const token = jwt.sign(
            {
                userId: user.id,
                restaurantId: restaurant.id,
                role: user.role,
                name: user.name,
                tenant: restaurant_slug
            },
            process.env.JWT_SECRET || 'fallback_jwt_secret_123',
            { expiresIn: '7d' }
        );

        res.json({ success: true, token, user: { id: user.id, name: user.name, role: user.role } });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// List team members (Owner/Manager only)
usersRouter.get('/admin/team', adminAuthMiddleware, requireRole(['owner', 'manager']), async (req: any, res) => {
    try {
        const members = await usersRepo.listByRestaurant(req.tenantId);
        res.json(members);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Add team member (Owner/Manager only)
usersRouter.post('/admin/team', adminAuthMiddleware, requireRole(['owner', 'manager']), async (req: any, res) => {
    try {
        const { name, username, password, role } = req.body;

        // Staff cannot create managers or owners
        if (req.user.role === 'manager' && (role === 'owner' || role === 'manager')) {
            return res.status(403).json({ error: 'Gerentes só podem criar funcionários (staff)' });
        }

        const id = await usersRepo.createUser({
            restaurant_id: req.tenantId,
            name,
            username,
            password_hash: password,
            role
        });

        await auditService.log({
            restaurantId: req.tenantId,
            userId: req.user.userId || 'admin_legacy',
            action: 'CREATE_USER',
            resource: 'users',
            resourceId: id,
            payload: { name, username, role }
        });

        res.status(201).json({ success: true, id });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Delete team member (Owner only)
usersRouter.delete('/admin/team/:id', adminAuthMiddleware, requireRole(['owner']), async (req: any, res) => {
    try {
        await usersRepo.deleteUser(req.params.id, req.tenantId);

        await auditService.log({
            restaurantId: req.tenantId,
            userId: req.user.userId,
            action: 'DELETE_USER',
            resource: 'users',
            resourceId: req.params.id
        });

        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Audit Logs (Owner only)
usersRouter.get('/admin/audit', adminAuthMiddleware, requireRole(['owner']), async (req: any, res) => {
    try {
        const db = await (await import('../db/db.client')).getDb();
        const logs = await db.all(
            `SELECT al.*, u.name as user_name FROM audit_logs al 
             LEFT JOIN users u ON al.user_id = u.id 
             WHERE al.restaurant_id = ? 
             ORDER BY al.created_at DESC LIMIT 100`,
            [req.tenantId]
        );
        res.json(logs);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
