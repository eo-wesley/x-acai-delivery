"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const crypto_1 = require("crypto");
const db_client_1 = require("./db/db.client");
const health_1 = __importDefault(require("./routes/health"));
const webhook_1 = __importDefault(require("./routes/webhook"));
const ai_routes_1 = __importDefault(require("./routes/ai.routes"));
const mercadopago_webhook_1 = __importDefault(require("./routes/mercadopago.webhook"));
const logging_middleware_1 = require("./middlewares/logging.middleware");
const error_middleware_1 = require("./middlewares/error.middleware");
const logger_1 = require("./core/logger");
// Domain Routers
const orders_router_1 = require("./routes/orders.router");
const menu_router_1 = require("./routes/menu.router");
const admin_router_1 = require("./routes/admin.router");
const eventSubscriber_1 = require("./core/eventSubscriber");
const payments_router_1 = require("./routes/payments.router");
const pdv_router_1 = require("./routes/pdv.router");
const inventory_router_1 = require("./routes/inventory.router");
const customers_router_1 = require("./routes/customers.router");
const coupons_router_1 = require("./routes/coupons.router");
const reviews_router_1 = require("./routes/reviews.router");
const drivers_router_1 = require("./routes/drivers.router");
const loyalty_router_1 = require("./routes/loyalty.router");
const restaurants_router_1 = require("./routes/restaurants.router");
const analytics_router_1 = require("./routes/analytics.router");
const marketing_router_1 = require("./routes/marketing.router");
dotenv_1.default.config();
const app = (0, express_1.default)();
(0, eventSubscriber_1.setupEventSubscribers)();
const port = process.env.PORT || 3000;
// Middleware
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3001';
app.use((0, cors_1.default)({ origin: allowedOrigin }));
app.use(logging_middleware_1.loggingMiddleware); // Professional Request Logging
app.use(express_1.default.json());
// Request Context (ID & Tenant)
app.use((req, res, next) => {
    req.reqId = (0, crypto_1.randomUUID)().split('-')[0];
    next();
});
// Routes
app.use(health_1.default);
app.use(webhook_1.default);
app.use('/ai', ai_routes_1.default);
app.use('/api/webhooks', mercadopago_webhook_1.default);
// Domain Routes mounted under /api
app.use('/api', orders_router_1.ordersRouter);
app.use('/api', menu_router_1.menuRouter);
app.use('/api', admin_router_1.adminRouter);
app.use('/api', payments_router_1.paymentsRouter);
app.use('/api', pdv_router_1.pdvRouter);
app.use('/api', inventory_router_1.inventoryRouter);
app.use('/api', customers_router_1.customersRouter);
app.use('/api', coupons_router_1.couponsRouter);
app.use('/api', reviews_router_1.reviewsRouter);
app.use('/api', drivers_router_1.driversRouter);
app.use('/api', loyalty_router_1.loyaltyRouter);
app.use('/api', restaurants_router_1.restaurantsRouter);
app.use('/api', analytics_router_1.analyticsRouter);
app.use('/api', marketing_router_1.marketingRouter);
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Global Error Handler
app.use(error_middleware_1.errorMiddleware);
// Start server
app.listen(port, async () => {
    logger_1.logger.info(`🚀 X-Açaí Backend running on http://localhost:${port}`);
    logger_1.logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    logger_1.logger.info(`   AI Provider: ${process.env.AI_PROVIDER || 'mock'}`);
    try {
        await (0, db_client_1.setupDatabase)();
    }
    catch (e) {
        console.error("❌ Failed to initialize SQLite database:", e);
    }
});
