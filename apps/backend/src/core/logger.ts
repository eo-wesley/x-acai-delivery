import winston from 'winston';

const { combine, timestamp, printf, colorize, json } = winston.format;

const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});

const developmentFormat = combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
);

const productionFormat = combine(
    timestamp(),
    json()
);

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
    transports: [
        new winston.transports.Console()
    ]
});

// Helper for masking sensitive data (e.g. phones, keys)
export function maskData(data: string, visiblePrefix = 4) {
    if (!data) return data;
    if (data.length <= visiblePrefix) return '***';
    return data.slice(0, visiblePrefix) + '*'.repeat(data.length - visiblePrefix);
}
