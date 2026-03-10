import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import express from "express";
import client from "prom-client";
import dotenv from "dotenv";

dotenv.config();

class MonitoringService {
    private isSentryEnabled: boolean = false;

    constructor() {
        if (process.env.SENTRY_DSN) {
            Sentry.init({
                dsn: process.env.SENTRY_DSN,
                integrations: [
                    nodeProfilingIntegration(),
                ],
                tracesSampleRate: 1.0,
                profilesSampleRate: 1.0,
            });
            this.isSentryEnabled = true;
            console.log("📊 Sentry monitoring initialized.");
        }

        // Prometheus Default Metrics
        client.collectDefaultMetrics();
    }

    // Middleware para Capturar Erros no Express
    setupErrorHandling(app: express.Application) {
        if (this.isSentryEnabled) {
            Sentry.setupExpressErrorHandler(app);
        }
    }

    // Middleware para Métricas de Performance
    setupMetrics(app: express.Application) {
        const httpRequestDurationMicroseconds = new client.Histogram({
            name: 'http_request_duration_seconds',
            help: 'Duration of HTTP requests in seconds',
            labelNames: ['method', 'route', 'code'],
            buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
        });

        app.use((req, res, next) => {
            const end = httpRequestDurationMicroseconds.startTimer();
            res.on('finish', () => {
                const route = req.route?.path || req.path;
                end({ method: req.method, route, code: res.statusCode });
            });
            next();
        });

        app.get('/metrics', async (req, res) => {
            res.set('Content-Type', client.register.contentType);
            res.end(await client.register.metrics());
        });
    }

    logError(error: any, context: any = {}) {
        console.error("❌ [Error Logged]:", error);
        if (this.isSentryEnabled) {
            Sentry.withScope((scope) => {
                scope.setExtras(context);
                Sentry.captureException(error);
            });
        }
    }
}

export const monitoringService = new MonitoringService();
