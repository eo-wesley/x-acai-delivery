import { Job } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let connection: any = null;
const isRedisEnabled = !!process.env.REDIS_URL;

if (isRedisEnabled) {
    try {
        connection = new IORedis(process.env.REDIS_URL as string, {
            maxRetriesPerRequest: null,
            lazyConnect: true
        });
        connection.on('error', (err: any) => {
            console.warn('⚠️ Redis error:', err.message);
        });
    } catch (e) {
        console.warn('⚠️ Redis connection failed.');
    }
} else {
    console.log('ℹ️ Redis is not configured. Queues will run in mock mode (no persistence).');
}

class QueueService {
    private queues: Map<string, any> = new Map();

    constructor() {
        console.log(`👷 Queue Service initialized (${isRedisEnabled ? 'BullMQ' : 'Mock Mode'}).`);
    }

    getQueue(name: string): any {
        if (!this.queues.has(name)) {
            if (!isRedisEnabled) {
                this.queues.set(name, {
                    add: async (jobName: string, data: any) => {
                        console.log(`[MockQueue] Job ${jobName} added to ${name} (no execution)`);
                        return { id: 'mock-id' };
                    }
                });
            } else {
                const { Queue } = require('bullmq');
                const queue = new Queue(name, { connection });
                this.queues.set(name, queue);
            }
        }
        return this.queues.get(name)!;
    }

    async addJob(queueName: string, jobName: string, data: any, opts: any = {}) {
        const queue = this.getQueue(queueName);
        console.log(`[Queue] Adding job ${jobName} to ${queueName}`);
        return queue.add(jobName, data, opts);
    }

    createWorker(queueName: string, processor: (job: any) => Promise<void>) {
        if (!isRedisEnabled) {
            console.log(`[MockWorker] Started for ${queueName}`);
            return { close: async () => {} };
        }
        const { Worker } = require('bullmq');
        const worker = new Worker(queueName, processor, { connection });
        worker.on('completed', (job) => console.log(`[Worker] Job ${job.id} completed.`));
        return worker;
    }
}

export const queueService = new QueueService();
