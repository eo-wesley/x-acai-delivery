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
import { marketingService } from './services/marketing.service';
import { inventoryRouter } from './routes/inventory.router';
import { customersRouter } from './routes/customers.router';
import { couponsRouter } from './routes/coupons.router';
import { reviewsRouter } from './routes/reviews.router';
import { driversRouter } from './routes/drivers.router';
import { loyaltyRouter } from './routes/loyalty.router';
import { restaurantsRouter } from './routes/restaurants.router';
import { analyticsRouter } from './routes/analytics.router';
import { marketingRouter } from './routes/marketing.router';
import { saasRouter } from './routes/saas.router';

dotenv.config();

const app = express();

// Set up subscribers only if not in test
if (process.env.NODE_ENV !== 'test') {
  setupEventSubscribers();
  marketingService.startAutomatedMarketing();
}

app.use(cors());
app.use(express.json());
app.use(loggingMiddleware);

// Health check
app.use(healthRouter);
app.use('/api', healthRouter);

// Infrastructure Routes
app.use('/api/webhooks', webhookRouter);
app.use('/api/ai', aiRoutes);
app.use('/api/payments/mercadopago/webhook', mpWebhookRouter);

// Domain Routes
app.use('/api', adminRouter);
app.use('/api', menuRouter);
app.use('/api', ordersRouter);
app.use('/api', inventoryRouter);
app.use('/api', customersRouter);
app.use('/api', couponsRouter);
app.use('/api', reviewsRouter);
app.use('/api', driversRouter);
app.use('/api', loyaltyRouter);
app.use('/api', restaurantsRouter);
app.use('/api', analyticsRouter);
app.use('/api', marketingRouter);
app.use('/api', saasRouter);

// Database initialization
setupDatabase().then(() => {
  logger.info('Database initialized and synchronized');
}).catch(err => {
  logger.error('Failed to initialize database', err);
});

app.use(errorMiddleware);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

export default app;
