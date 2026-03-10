import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

class CacheService {
    private redis: Redis | null = null;
    private isEnabled: boolean = false;

    constructor() {
        if (process.env.REDIS_URL) {
            try {
                this.redis = new Redis(process.env.REDIS_URL);
                this.isEnabled = true;
                console.log('⚡ Redis Cache Service initialized.');
            } catch (e) {
                console.error('❌ Failed to connect to Redis:', e);
            }
        } else {
            console.warn('⚠️ REDIS_URL not found. Caching disabled.');
        }
    }

    async get(key: string): Promise<any | null> {
        if (!this.isEnabled || !this.redis) return null;
        try {
            const data = await this.redis.get(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error(`[Cache] Error getting key ${key}:`, e);
            return null;
        }
    }

    async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
        if (!this.isEnabled || !this.redis) return;
        try {
            await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        } catch (e) {
            console.error(`[Cache] Error setting key ${key}:`, e);
        }
    }

    async del(key: string): Promise<void> {
        if (!this.isEnabled || !this.redis) return;
        try {
            await this.redis.del(key);
        } catch (e) {
            console.error(`[Cache] Error deleting key ${key}:`, e);
        }
    }

    async flushTenant(tenantId: string): Promise<void> {
        if (!this.isEnabled || !this.redis) return;
        // Ineficiente para produção se houver muitas chaves, 
        // mas útil para MVP usando SCAN.
        const stream = this.redis.scanStream({ match: `*:${tenantId}:*` });
        stream.on('data', (keys) => {
            if (keys.length) this.redis!.del(...keys);
        });
    }

    get isReady() {
        return this.isEnabled;
    }
}

export const cacheService = new CacheService();
