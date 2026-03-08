import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { setupDatabase } from './db/db.client';

import healthRouter from './routes/health';
import webhookRouter from './routes/webhook';
import aiRoutes from './routes/ai.routes';
import mpWebhookRouter from './routes/mercadopago.webhook';

import { loggingMiddleware } from './middlewares/logging.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import { logger } from './core/logger';

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
import { marketingRouter } from './routes/marketing.router';

dotenv.config();

const app = express();
setupEventSubscribers();
const port = process.env.PORT || 3000;

// Middleware
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3001';
app.use(cors({ origin: allowedOrigin }));
app.use(loggingMiddleware); // Professional Request Logging
app.use(express.json());

// Request Context (ID & Tenant)
app.use((req: any, res, next) => {
  req.reqId = randomUUID().split('-')[0];
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
app.use('/api', marketingRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use(errorMiddleware);

// Start server
app.listen(port, async () => {
  logger.info(`🚀 X-Açaí Backend running on http://localhost:${port}`);
  logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`   AI Provider: ${process.env.AI_PROVIDER || 'mock'}`);

  try {
    await setupDatabase();
  } catch (e) {
    console.error("❌ Failed to initialize SQLite database:", e);
  }
});
