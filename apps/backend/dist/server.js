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
const app_routes_1 = __importDefault(require("./routes/app.routes"));
const mercadopago_webhook_1 = __importDefault(require("./routes/mercadopago.webhook"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Middleware
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3001';
app.use((0, cors_1.default)({ origin: allowedOrigin }));
app.use(express_1.default.json());
// Request logging
app.use((req, res, next) => {
    req.reqId = (0, crypto_1.randomUUID)().split('-')[0];
    const slug = req.query?.slug || req.body?.slug || 'default';
    console.log(`[${new Date().toISOString()}] [Req:${req.reqId}] [Tenant:${slug}] ${req.method} ${req.path}`);
    next();
});
// Routes
app.use(health_1.default);
app.use(webhook_1.default);
app.use('/ai', ai_routes_1.default);
app.use('/api', app_routes_1.default);
app.use('/api/webhooks', mercadopago_webhook_1.default);
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
        await (0, db_client_1.setupDatabase)();
    }
    catch (e) {
        console.error("❌ Failed to initialize SQLite database:", e);
    }
});
