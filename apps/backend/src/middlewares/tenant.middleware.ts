import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/db.client';

export interface TenantRequest extends Request {
    tenantId: string;
}

export async function resolveTenant(slugOrHost: string): Promise<string> {
    if (!slugOrHost || slugOrHost === 'default' || slugOrHost === 'localhost' || slugOrHost === '127.0.0.1') {
        return 'default_tenant';
    }

    const db = await getDb();
    // Tenta por slug
    let row = await db.get(`SELECT id FROM restaurants WHERE slug = ?`, [slugOrHost]);
    if (row) return row.id;

    // Tenta por domínio customizado
    row = await db.get(`SELECT id FROM restaurants WHERE custom_domain = ?`, [slugOrHost]);
    if (row) return row.id;

    return 'default_tenant';
}

/**
 * Middleware para extrair o slug (da query, body ou rota) e injetar req.tenantId
 * Útil para rotas multitenant SaaS.
 */
export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const host = req.headers.host?.split(':')[0] || '';
        const slug = (req.params.slug || req.query.slug || req.body.slug || 'default') as string;

        // Prioridade 1: Domínio Customizado (host completo)
        // Prioridade 2: Subdomínio (ex: loja.xacai.com)
        // Prioridade 3: Slug da URL/Query
        const hostParts = host.split('.');
        const isLocal = host === 'localhost' || host === '127.0.0.1';

        let resolvedSlugOrHost = slug;
        if (!isLocal) {
            // Se tiver subdomínio (ex: loja.xacai.com), tentamos o subdomínio primeiro como slug
            if (hostParts.length > 2 && hostParts[0] !== 'www') {
                resolvedSlugOrHost = hostParts[0];
            } else {
                // Se não tiver subdomínio, pode ser um domínio customizado completo (ex: acai.com)
                resolvedSlugOrHost = host;
            }
        }

        const tenantId = await resolveTenant(resolvedSlugOrHost);
        (req as TenantRequest).tenantId = tenantId;
        next();
    } catch (e: any) {
        console.error('[TenantMiddleware] Error resolving tenant:', e.message);
        res.status(500).json({ error: 'Falha ao resolver contexto da loja (tenant)' });
    }
};
