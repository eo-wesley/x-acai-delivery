import { Router } from 'express';
import { getDb } from '../db/db.client';

export const healthRouter = Router();

healthRouter.get('/health', async (req, res) => {
  let dbStatus = 'ok';
  try {
    const db = await getDb();
    await db.get('SELECT 1');
  } catch (e) {
    dbStatus = 'error';
  }

  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  res.status(dbStatus === 'ok' ? 200 : 503).json({
    status: dbStatus === 'ok' ? 'healthy' : 'unhealthy',
    database: dbStatus,
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    timestamp: new Date().toISOString(),
    version: '1.2.0',
    process: {
      memory: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
    }
  });
});

export default healthRouter;
