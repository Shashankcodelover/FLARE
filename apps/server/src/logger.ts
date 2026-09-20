import pino from 'pino';

/**
 * Structured JSON logger (Pino).
 * In production / Vercel serverless, emit raw JSON (no worker thread transport).
 * Only use pino-pretty in local development.
 */
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const isProduction = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { pid: process.pid, service: 'mirage-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie'],
    censor: '[REDACTED]',
  },
  // pino.transport() spawns a worker thread which crashes Vercel serverless.
  // Use inline formatting only for local dev.
  ...((!isProduction && !isServerless) ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } } } : {}),
});

export default logger;
