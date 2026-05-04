/**
 * LogisTMA Factory — logger.js
 * Logger structuré basé sur pino pour production.
 */

import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
    : undefined,
  base: { service: 'logistma-factory' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['bot_token', 'botToken', 'BOT_TOKEN', 'stripe_secret', 'encryption_key', '*.password'],
    censor: '[REDACTED]',
  },
});

export default logger;
