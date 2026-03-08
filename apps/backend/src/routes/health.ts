import { Router } from 'express';

const healthRouter = Router();

<<<<<<< HEAD
healthRouter.get('/health', async (req, res) => {
  let dbStatus = 'ok';
  try {
    const { getDb } = await import('../db/db.client');
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
=======
healthRouter.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
>>>>>>> 63a8525880a654bbbff8b7dd26ee2c4abbbc8e81
    timestamp: new Date().toISOString(),
    version: '1.1.0',
    process: {
      memory: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      node: process.version
    }
  });
});

export default healthRouter;
