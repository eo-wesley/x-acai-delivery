import { getDb } from '../db/db.client';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLogParams {
    restaurant_id?: string;
    restaurantId?: string; // Compatibility
    user_id?: string;
    userId?: string; // Compatibility
    action: string;
    resource: string;
    resource_id?: string;
    resourceId?: string; // Compatibility
    payload?: any;
}

export class AuditService {
    static async log(params: AuditLogParams) {
        try {
            const db = await getDb();
            const rId = params.restaurant_id || params.restaurantId || 'default_tenant';
            const uId = params.user_id || params.userId || 'admin';
            const resId = params.resource_id || params.resourceId || null;

            await db.run(`
                INSERT INTO audit_logs (id, restaurant_id, user_id, action, resource, resource_id, payload)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                uuidv4(),
                rId,
                uId,
                params.action,
                params.resource,
                resId,
                params.payload ? JSON.stringify(params.payload) : null
            ]);
        } catch (err) {
            console.error('[AuditService] Failed to create audit log:', err);
        }
    }
}

// Singleton for compatibility with existing imports in some files
export const auditService = {
    log: (params: AuditLogParams) => AuditService.log(params)
};
