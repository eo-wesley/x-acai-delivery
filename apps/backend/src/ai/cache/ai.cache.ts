import { env } from '../../config/env';
import crypto from 'crypto';

interface CacheEntry {
    data: any;
    expiresAt: number;
}

export class AICache {
    private cache = new Map<string, CacheEntry>();

    generateKey(payload: any): string {
        const str = JSON.stringify(payload);
        return crypto.createHash('sha256').update(str).digest('hex');
    }

    get(key: string): any | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    set(key: string, data: any, ttlSeconds: number = env.AI_CACHE_TTL_DEFAULT_SEC) {
        // Do not cache sensitive or extremely short transient outputs
        if (data && data.text && data.text.includes('SECRET_')) {
            return;
        }

        this.cache.set(key, {
            data,
            expiresAt: Date.now() + (ttlSeconds * 1000)
        });
    }

    flush() {
        this.cache.clear();
    }
}

export const aiCache = new AICache();
