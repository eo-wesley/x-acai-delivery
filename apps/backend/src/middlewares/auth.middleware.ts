import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_jwt_secret_123');
        (req as any).user = decoded;
        next();
    } catch (e: any) {
        res.status(401).json({ error: 'Token inválido', details: e.message });
    }
};
