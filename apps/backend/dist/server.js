"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./config/env");
require("./store/firestore.client");
const db_client_1 = require("./db/db.client");
const inventory_alert_service_1 = require("./services/inventory_alert.service");
const health_1 = __importDefault(require("./routes/health"));
const webhook_1 = __importDefault(require("./routes/webhook"));
const ai_routes_1 = __importDefault(require("./routes/ai.routes"));
const mercadopago_webhook_1 = __importDefault(require("./routes/mercadopago.webhook"));
const logging_middleware_1 = require("./middlewares/logging.middleware");
const error_middleware_1 = require("./middlewares/error.middleware");
const eventBus_1 = require("./core/eventBus");
const queue_service_1 = require("./services/queue.service");
const logger_1 = require("./core/logger");
// Domain Routers
const orders_router_1 = require("./routes/orders.router");
const menu_router_1 = require("./routes/menu.router");
const admin_router_1 = require("./routes/admin.router");
const eventSubscriber_1 = require("./core/eventSubscriber");
const marketing_service_1 = require("./services/marketing.service");
const inventory_router_1 = require("./routes/inventory.router");
const customers_router_1 = require("./routes/customers.router");
const coupons_router_1 = require("./routes/coupons.router");
const reviews_router_1 = require("./routes/reviews.router");
const drivers_router_1 = require("./routes/drivers.router");
const loyalty_router_1 = require("./routes/loyalty.router");
const restaurants_router_1 = require("./routes/restaurants.router");
const analytics_router_1 = require("./routes/analytics.router");
const saas_router_1 = require("./routes/saas.router");
const marketing_router_1 = __importDefault(require("./routes/marketing.router"));
const operations_router_1 = __importDefault(require("./routes/operations.router"));
const whatsapp_router_1 = require("./routes/whatsapp.router");
const ai_router_1 = require("./routes/ai.router");
const billing_router_1 = require("./routes/billing.router");
const marketplace_router_1 = require("./routes/marketplace.router");
const ifood_router_1 = require("./routes/ifood.router");
const reports_router_1 = __importDefault(require("./routes/reports.router"));
const users_router_1 = require("./routes/users.router");
const finance_router_1 = require("./routes/finance.router");
const payments_router_1 = require("./routes/payments.router");
const procurement_router_1 = require("./routes/procurement.router");
const logistics_router_1 = __importDefault(require("./routes/logistics.router"));
const tables_router_1 = require("./routes/tables.router");
const driver_app_router_1 = require("./routes/driver_app.router");
const customer_auth_router_1 = require("./routes/customer_auth.router");
const customer_profile_router_1 = require("./routes/customer_profile.router");
const scaling_router_1 = __importDefault(require("./routes/scaling.router"));
const audit_router_1 = __importDefault(require("./routes/audit.router"));
const fiscal_router_1 = __importDefault(require("./routes/fiscal.router"));
const marketplace_sync_service_1 = require("./services/marketplace_sync.service");
const actions_router_1 = require("./routes/actions.router");
const pricing_router_1 = require("./routes/pricing.router");
const super_admin_router_1 = require("./routes/super_admin.router");
const migration_router_1 = require("./routes/migration.router");
const dev_routes_1 = __importDefault(require("./routes/dev.routes"));
const monitoring_service_1 = require("./services/monitoring.service");
// Growth service is initialized here to start event listeners
const app = (0, express_1.default)();
function logStartupError(scope, error) {
    logger_1.logger.error(`[Startup] ${scope} failed`, error);
}
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
    logger_1.logger.error('Uncaught Exception thrown:', err);
});
const allowedOrigins = env_1.env.CORS_ORIGIN
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
const corsOrigin = allowedOrigins.length === 0 || allowedOrigins.includes('*')
    ? true
    : allowedOrigins;
app.get('/test', (req, res) => res.send('ok_from_server'));
// Enable Enterprise Monitoring (Prometheus & Sentry)
monitoring_service_1.monitoringService.setupMetrics(app);
app.use((0, cors_1.default)({
    origin: corsOrigin,
    credentials: true,
}));
app.use(express_1.default.json());
app.use(logging_middleware_1.loggingMiddleware);
// Health check
app.use(health_1.default);
app.use('/api', health_1.default);
// Infrastructure Routes
app.use('/api/webhooks', webhook_1.default);
app.use('/api/ai', ai_routes_1.default);
app.use('/api/payments/mercadopago/webhook', mercadopago_webhook_1.default);
// Domain Routes
app.use('/api', admin_router_1.adminRouter);
app.use('/api', menu_router_1.menuRouter);
app.use('/api', orders_router_1.ordersRouter);
app.use('/api', inventory_router_1.inventoryRouter);
app.use('/api', customers_router_1.customersRouter);
app.use('/api', coupons_router_1.couponsRouter);
app.use('/api', reviews_router_1.reviewsRouter);
app.use('/api', drivers_router_1.driversRouter);
app.use('/api', loyalty_router_1.loyaltyRouter);
app.use('/api', restaurants_router_1.restaurantsRouter);
app.use('/api', analytics_router_1.analyticsRouter);
app.use('/api', fiscal_router_1.default);
app.use('/api/logistics', logistics_router_1.default);
app.use('/api', finance_router_1.financeRouter);
app.use('/api', payments_router_1.paymentsRouter);
app.use('/api/admin/procurement', procurement_router_1.procurementRouter);
app.use('/api', tables_router_1.tablesRouter);
app.use('/api', saas_router_1.saasRouter);
app.use('/api', reports_router_1.default);
app.use('/api', users_router_1.usersRouter);
app.use('/api/driver', driver_app_router_1.driverAppRouter);
app.use('/api', customer_auth_router_1.customerAuthRouter);
app.use('/api/:slug/customer', customer_profile_router_1.customerProfileRouter);
app.use('/api/:slug/marketing', marketing_router_1.default);
app.use('/api/admin/operations', operations_router_1.default);
app.use('/api/admin/fiscal', fiscal_router_1.default);
app.use('/api/admin/whatsapp', whatsapp_router_1.whatsappRouter);
app.use('/api/admin/marketing', marketing_router_1.default);
app.use('/api/admin', actions_router_1.actionsRouter);
app.use('/api/admin', pricing_router_1.pricingAdminRouter);
app.use('/api', super_admin_router_1.superAdminRouter);
app.use('/api', marketplace_router_1.marketplaceRouter);
// ─── Customer / PWA Routes ──────────────────────────────────────────────────
app.use('/api/:slug/ai', ai_router_1.aiRouter);
app.use('/api/:slug/billing', billing_router_1.billingRouter);
app.use('/api/:slug/marketplace', marketplace_router_1.marketplaceRouter);
app.use('/api/admin/audit', audit_router_1.default);
app.use('/api/integrations/ifood', ifood_router_1.ifoodRouter);
app.use('/api/admin/scaling', scaling_router_1.default);
app.use('/api/ai', ai_router_1.aiRouter);
app.use('/api/marketplace', marketplace_router_1.marketplaceRouter);
app.use('/api/super-admin', super_admin_router_1.superAdminRouter);
app.use('/api/migration', migration_router_1.migrationRouter);
app.use('/api/dev', dev_routes_1.default);
async function startServer() {
    await (0, db_client_1.setupDatabase)();
    if (process.env.NODE_ENV !== 'test') {
        try {
            (0, eventSubscriber_1.setupEventSubscribers)();
            await marketing_service_1.marketingService.startAutomatedMarketing();
            console.log('✅ Event subscribers active.');
            // Funil de Carrinho Abandonado (Enterprise Automation)
            eventBus_1.eventBus.on('order_created', async (data) => {
                try {
                    const { orderId, customerId, restaurantId } = data;
                    await queue_service_1.queueService.addJob('whatsapp-automation', 'abandoned_cart_check', {
                        type: 'abandoned_cart',
                        orderId,
                        customerId,
                        restaurantId
                    }, { delay: 1000 * 60 * 30 }); // 30 minutos de delay
                }
                catch (error) {
                    logStartupError('Abandoned cart queue scheduling', error);
                }
            });
        }
        catch (error) {
            logStartupError('Event subscribers startup', error);
        }
        await Promise.all([
            Promise.resolve().then(() => __importStar(require('./services/campaign.worker'))).then(() => console.log('👷 Campaign Workers started.')),
            Promise.resolve().then(() => __importStar(require('./services/whatsapp.worker'))).then(() => console.log('📱 WhatsApp Workers started.')),
        ]);
    }
    try {
        inventory_alert_service_1.InventoryAlertService.start();
    }
    catch (error) {
        logStartupError('Inventory alert service startup', error);
    }
    try {
        marketplace_sync_service_1.marketplaceSyncService.initialize();
    }
    catch (error) {
        logStartupError('Marketplace sync startup', error);
    }
    logger_1.logger.info('Database initialized and synchronized');
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Backend server running on port ${PORT}`);
    });
}
// Enable Sentry Error Handling (Should be after all controllers)
monitoring_service_1.monitoringService.setupErrorHandling(app);
app.use(error_middleware_1.errorMiddleware);
void startServer().catch(err => {
    logger_1.logger.error('Failed to initialize server', err);
    process.exitCode = 1;
});
exports.default = app;
