import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6371');

class QueueService {
    private queues: Map<string, Queue> = new Map();

    constructor() {
        console.log('👷 Queue Service initialized (BullMQ).');
    }

    getQueue(name: string): Queue {
        if (!this.queues.has(name)) {
            const queue = new Queue(name, { connection });
            this.queues.set(name, queue);
        }
        return this.queues.get(name)!;
    }

    async addJob(queueName: string, jobName: string, data: any, opts: any = {}) {
        const queue = this.getQueue(queueName);
        console.log(`[Queue] Adding job ${jobName} to ${queueName}`);
        return queue.add(jobName, data, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            ...opts
        });
    }

    // Método para registrar workers em outro lugar ou centralizado
    createWorker(queueName: string, processor: (job: Job) => Promise<void>) {
        const worker = new Worker(queueName, processor, { connection });

        worker.on('completed', (job) => {
            console.log(`[Worker] Job ${job.id} core ${queueName} completed.`);
        });

        worker.on('failed', (job, err) => {
            console.error(`[Worker] Job ${job?.id} core ${queueName} failed:`, err);
        });

        return worker;
    }
}

export const queueService = new QueueService();
