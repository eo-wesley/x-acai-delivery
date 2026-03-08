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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const healthRouter = (0, express_1.Router)();
healthRouter.get('/health', async (req, res) => {
    let dbStatus = 'ok';
    try {
        const { getDb } = await Promise.resolve().then(() => __importStar(require('../db/db.client')));
        const db = await getDb();
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
        version: '1.1.0',
        process: {
            memory: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
            node: process.version
        }
    });
});
exports.default = healthRouter;
