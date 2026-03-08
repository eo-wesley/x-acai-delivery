import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { setupDatabase } from './db/db.client';

import healthRouter from './routes/health';
import webhookRouter from './routes/webhook';
import aiRoutes from './routes/ai.routes';
import mpWebhookRouter from './routes/mercadopago.webhook';

// Domain Routers
import { ordersRouter } from './routes/orders.router';
import { menuRouter } from './routes/menu.router';
import { adminRouter } from './routes/admin.router';
import { setupEventSubscribers } from './core/eventSubscriber';
import { paymentsRouter } from './routes/payments.router';
import { pdvRouter } from './routes/pdv.router';
import { inventoryRouter } from './routes/inventory.router';
import { customersRouter } from './routes/customers.router';
import { couponsRouter } from './routes/coupons.router';
import { reviewsRouter } from './routes/reviews.router';
import { driversRouter } from './routes/drivers.router';
import { loyaltyRouter } from './routes/loyalty.router';
import { restaurantsRouter } from './routes/restaurants.router';
import { analyticsRouter } from './routes/analytics.router';

dotenv.config();

const app = express();
setupEventSubscribers();
const port = process.env.PORT || 3000;

// Middleware
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3001';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

// Request logging
app.use((req: any, res, next) => {
  req.reqId = randomUUID().split('-')[0];
  const slug = req.query?.slug || req.body?.slug || 'default';
  console.log(`[${new Date().toISOString()}] [Req:${req.reqId}] [Tenant:${slug}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use(healthRouter);
app.use(webhookRouter);
app.use('/ai', aiRoutes);
app.use('/api/webhooks', mpWebhookRouter);

// Domain Routes mounted under /api
app.use('/api', ordersRouter);
app.use('/api', menuRouter);
app.use('/api', adminRouter);
app.use('/api', paymentsRouter);
app.use('/api', pdvRouter);
app.use('/api', inventoryRouter);
app.use('/api', customersRouter);
app.use('/api', couponsRouter);
app.use('/api', reviewsRouter);
app.use('/api', driversRouter);
app.use('/api', loyaltyRouter);
app.use('/api', restaurantsRouter);
app.use('/api', analyticsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(port, async () => {
  console.log(`\n🚀 X-Açaí Backend running on http://localhost:${port}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   AI Provider: ${process.env.AI_PROVIDER || 'mock'}`);

  try {
    await setupDatabase();
  } catch (e) {
    console.error("❌ Failed to initialize SQLite database:", e);
  }
});
