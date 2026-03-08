import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/db.client';

export interface TenantRequest extends Request {
    tenantId: string;
}

export async function resolveTenant(slug: string): Promise<string> {
    if (!slug || slug === 'default') return 'default_tenant';
    const db = await getDb();
    const row = await db.get(`SELECT id FROM restaurants WHERE slug = ?`, [slug]);
    return row ? row.id : 'default_tenant';
}

/**
 * Middleware para extrair o slug (da query, body ou rota) e injetar req.tenantId
 * Útil para rotas multitenant SaaS.
 */
export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const slug = (req.params.slug || req.query.slug || req.body.slug || 'default') as string;
        const tenantId = await resolveTenant(slug);
        (req as TenantRequest).tenantId = tenantId;
        next();
    } catch (e: any) {
        console.error('[TenantMiddleware] Error resolving tenant:', e.message);
        res.status(500).json({ error: 'Falha ao resolver contexto da loja (tenant)' });
    }
};
