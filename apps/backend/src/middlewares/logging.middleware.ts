import { Request, Response, NextFunction } from 'express';
import { logger } from '../core/logger';

export function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { method, url, ip } = req;

    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;
        const level = statusCode >= 400 ? 'warn' : 'info';

        logger.log(level, `${method} ${url} ${statusCode} - ${duration}ms`, {
            method,
            url,
            statusCode,
            duration,
            ip
        });
    });

    next();
}
