import { Request, Response, NextFunction } from 'express';
import { logger } from '../core/logger';

export function errorMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
    const statusCode = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    logger.error(`[ErrorMiddleware] ${req.method} ${req.url}: ${message}`, {
        error: message,
        stack: err.stack,
        method: req.method,
        url: req.url,
        body: req.body
    });

    res.status(statusCode).json({
        error: true,
        message: process.env.NODE_ENV === 'production' ? 'Ocorreu um erro interno no servidor.' : message,
        code: err.code || 'INTERNAL_ERROR'
    });
}
