"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const db_client_1 = require("../db/db.client");
exports.healthRouter = (0, express_1.Router)();
exports.healthRouter.get('/health', async (req, res) => {
    let dbStatus = 'ok';
    try {
        const db = await (0, db_client_1.getDb)();
        await db.get('SELECT 1');
    }
    catch (e) {
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
exports.default = exports.healthRouter;
