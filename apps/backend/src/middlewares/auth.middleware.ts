import { Request, Response, NextFunction } from 'express';
import { getFirebaseAdminAuth, getFirebaseAdminInitError } from '../lib/firebase-admin';

function extractBearerToken(req: Request): string | null {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
        return null;
    }
    return token;
}

function normalizeRole(decoded: Record<string, any>): string | undefined {
    if (typeof decoded.role === 'string') return decoded.role;
    if (typeof (decoded as any).adminRole === 'string') return (decoded as any).adminRole;
    if ((decoded as any).owner === true || (decoded as any).isOwner === true) return 'owner';
    if ((decoded as any).manager === true || (decoded as any).isManager === true) return 'manager';
    if ((decoded as any).staff === true || (decoded as any).isStaff === true) return 'staff';
    return undefined;
}

export const adminAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = extractBearerToken(req);
        if (!token) {
            res.status(401).json({
                error: 'Token nao fornecido',
                authMode: 'firebase',
                message: 'Envie um Firebase ID token em Authorization: Bearer <token>.'
            });
            return;
        }

        let auth;
        try {
            auth = getFirebaseAdminAuth();
        } catch (error: any) {
            const initError = getFirebaseAdminInitError();
            res.status(503).json({
                error: 'Firebase admin indisponivel',
                authMode: 'firebase',
                message: 'Configure as credenciais do Firebase Admin no backend antes de acessar as rotas admin.',
                details: initError?.message || error.message
            });
            return;
        }

        const decoded = await auth.verifyIdToken(token);
        const role = normalizeRole(decoded);
        const tenantId = decoded.tenantId || (decoded as any).restaurantId || (decoded as any).tenant || 'default_tenant';

        (req as any).user = {
            ...decoded,
            id: decoded.uid,
            uid: decoded.uid,
            userId: decoded.uid,
            role,
            authProvider: 'firebase'
        };
        (req as any).tenantId = tenantId;

        next();
    } catch (e: any) {
        res.status(401).json({
            error: 'Token invalido',
            authMode: 'firebase',
            message: 'Use um Firebase ID token valido para acessar as rotas admin.',
            details: e.message
        });
        return;
    }
};

export const requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;
        if (!user || !roles.includes(user.role)) {
            return res.status(403).json({
                error: 'Acesso negado: Permissao insuficiente',
                requiredRoles: roles,
                currentRole: user?.role || null,
                message: 'Defina a claim de role no Firebase para acessar esta rota.'
            });
        }
        next();
    };
};
