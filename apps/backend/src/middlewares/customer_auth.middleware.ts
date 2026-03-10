import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const customerAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'fallback_jwt_secret_123');

        if (decoded.role !== 'customer') {
            return res.status(403).json({ error: 'Acesso negado: Perfil inválido' });
        }

        // Attach customer info to request
        (req as any).customerId = decoded.id;
        (req as any).customerPhone = decoded.phone;
        (req as any).tenantId = decoded.restaurantId || 'default_tenant';

        next();
    } catch (e: any) {
        res.status(401).json({ error: 'Token inválido', details: e.message });
    }
};
