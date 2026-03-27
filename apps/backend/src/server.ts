import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './config/env';
import './store/firestore.client';
import { randomUUID } from 'crypto';
import { setupDatabase } from './db/db.client';
import { InventoryAlertService } from './services/inventory_alert.service';

import healthRouter from './routes/health';
import webhookRouter from './routes/webhook';
import aiRoutes from './routes/ai.routes';
import mpWebhookRouter from './routes/mercadopago.webhook';

import { loggingMiddleware } from './middlewares/logging.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import { eventBus } from './core/eventBus';
import { queueService } from './services/queue.service';
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
import { saasRouter } from './routes/saas.router';
import marketingRouter from './routes/marketing.router';
import operationsRouter from './routes/operations.router';
import { whatsappRouter } from './routes/whatsapp.router';
import { aiRouter } from './routes/ai.router';
import { billingRouter } from './routes/billing.router';
import { marketplaceRouter } from './routes/marketplace.router';
import { ifoodRouter } from './routes/ifood.router';
import reportsRouter from './routes/reports.router';
import { usersRouter } from './routes/users.router';
import { financeRouter } from './routes/finance.router';
import { procurementRouter } from './routes/procurement.router';
import logisticsRouter from './routes/logistics.router';
import { tablesRouter } from './routes/tables.router';
import { driverAppRouter } from './routes/driver_app.router';
import { customerAuthRouter } from './routes/customer_auth.router';
import { customerProfileRouter } from './routes/customer_profile.router';
import scalingRouter from './routes/scaling.router';
import auditRouter from './routes/audit.router';
import fiscalRouter from './routes/fiscal.router';
import { marketplaceSyncService } from './services/marketplace_sync.service';
import { actionsRouter } from './routes/actions.router';
import { pricingAdminRouter } from './routes/pricing.router';
import { superAdminRouter } from './routes/super_admin.router';
import { migrationRouter } from './routes/migration.router';
import devRouter from './routes/dev.routes';
import { growthService } from './services/growth.service';
import { monitoringService } from './services/monitoring.service';

// Growth service is initialized here to start event listeners

const app = express();

app.get('/test', (req, res) => res.send('ok_from_server'));

// Enable Enterprise Monitoring (Prometheus & Sentry)
monitoringService.setupMetrics(app);

// Start Background Workers
if (process.env.NODE_ENV !== 'test') {
  import('./services/campaign.worker').then(() => console.log('👷 Campaign Workers started.'));
  import('./services/whatsapp.worker').then(() => console.log('📱 WhatsApp Workers started.'));
}

// Set up subscribers only if not in test
if (process.env.NODE_ENV !== 'test') {
  setupEventSubscribers();
  marketingService.startAutomatedMarketing();
  console.log('✅ Event subscribers active.');

  // Funil de Carrinho Abandonado (Enterprise Automation)
  eventBus.on('order_created', async (data) => {
    const { orderId, customerId, restaurantId } = data;
    await queueService.addJob('whatsapp-automation', 'abandoned_cart_check', {
      type: 'abandoned_cart',
      orderId,
      customerId,
      restaurantId
    }, { delay: 1000 * 60 * 30 }); // 30 minutos de delay
  });
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
app.use('/api', fiscalRouter);
app.use('/api/logistics', logisticsRouter);
app.use('/api', financeRouter);
app.use('/api/admin/procurement', procurementRouter);
app.use('/api', tablesRouter);
app.use('/api', saasRouter);
app.use('/api', reportsRouter);
app.use('/api', usersRouter);
app.use('/api/driver', driverAppRouter);
app.use('/api', customerAuthRouter);
app.use('/api/:slug/customer', customerProfileRouter);
app.use('/api/:slug/marketing', marketingRouter);
app.use('/api/admin/operations', operationsRouter);
app.use('/api/admin/fiscal', fiscalRouter);
app.use('/api/admin/whatsapp', whatsappRouter);
app.use('/api/admin/marketing', marketingRouter);
app.use('/api/admin', actionsRouter);
app.use('/api/admin', pricingAdminRouter);
app.use('/api', superAdminRouter);
app.use('/api', marketplaceRouter);

// ─── Customer / PWA Routes ──────────────────────────────────────────────────
app.use('/api/:slug/ai', aiRouter);
app.use('/api/:slug/billing', billingRouter);
app.use('/api/:slug/marketplace', marketplaceRouter);
app.use('/api/admin/audit', auditRouter);
app.use('/api/integrations/ifood', ifoodRouter);
app.use('/api/admin/scaling', scalingRouter);
app.use('/api/ai', aiRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/super-admin', superAdminRouter);
app.use('/api/migration', migrationRouter);
app.use('/api/dev', devRouter);

// Database initialization
setupDatabase().then(() => {
  InventoryAlertService.start();
  marketplaceSyncService.initialize();
  logger.info('Database initialized and synchronized');
}).catch(err => {
  logger.error('Failed to initialize database', err);
});

// Enable Sentry Error Handling (Should be after all controllers)
monitoringService.setupErrorHandling(app);

app.use(errorMiddleware);

// Global Unhandled Rejection & Exception Catchers
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception thrown:', err);
  // process.exit(1); // Optional: restart if critical
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

export default app;
