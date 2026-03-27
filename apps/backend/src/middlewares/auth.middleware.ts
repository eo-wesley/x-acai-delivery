import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

export const adminAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            res.status(401).json({ error: 'Token não fornecido' });
            return;
        }

        const decoded = await admin.auth().verifyIdToken(token);

        // Attach user info to request
        (req as any).user = decoded;
        (req as any).tenantId = decoded.tenantId || decoded.restaurantId || decoded.tenant || 'default_tenant';

        next();
    } catch (e: any) {
        res.status(401).json({ error: 'Token inválido', details: e.message });
        return;
    }
};

export const requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;
        if (!user || !roles.includes(user.role)) {
            return res.status(403).json({ error: 'Acesso negado: Permissão insuficiente' });
        }
        next();
    };
};
