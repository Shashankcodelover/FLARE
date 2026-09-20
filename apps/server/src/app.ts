import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import { zonesRouter } from './routes/zones';
import { resourcesRouter } from './routes/resources';
import { respondersRouter } from './routes/responders';
import { geofenceRouter } from './routes/geofence';
import { aiRouter } from './routes/ai';
import { commsRouter } from './routes/comms';
import { iotRouter } from './routes/iot';
import { issueToken } from './middleware/auth';
import { sanitize } from './middleware/sanitize';
import { auditLog } from './middleware/audit';
import { metricsMiddleware, getMetrics } from './middleware/metrics';
import logger from './logger';

const app = express();

// --- PROMETHEUS METRICS ---
app.use(metricsMiddleware);

// --- SECURITY HEADERS ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'ws:'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow external tile images for Leaflet
}));

// CORS Whitelist config
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,https://flare.shashankj.tech,https://decentralized-disaster-response-resource-geofencing-system.vercel.app').split(',');
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (server-to-server, curl, health checks)
    if (!origin) return cb(null, true);
    // Allow any Vercel preview deployment
    if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS policy violation'));
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// --- NoSQL INJECTION SANITIZATION ---
app.use(sanitize);

// --- STRUCTURED REQUEST LOGGING (Pino) ---
app.use((req, res, next) => {
  const reqId = crypto.randomUUID();
  req.headers['x-request-id'] = reqId;
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      requestId: reqId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip,
    }, `${req.method} ${req.path} ${res.statusCode}`);
  });
  next();
});

// --- RATE LIMITER ---
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_READ = 200;      // reads per minute
const RATE_LIMIT_WRITE = 50;      // writes per minute

app.use((req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const key = `${ip}:${isWrite ? 'w' : 'r'}`;
  const limit = isWrite ? RATE_LIMIT_WRITE : RATE_LIMIT_READ;
  const now = Date.now();
  const timestamps = rateLimitMap.get(key) || [];
  const valid = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  if (valid.length >= limit) {
    logger.warn({ ip, method: req.method, path: req.path }, 'Rate limit exceeded');
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }
  valid.push(now);
  rateLimitMap.set(key, valid);
  next();
});

// --- Periodic cleanup of rate limit map to prevent memory leak ---
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (valid.length === 0) rateLimitMap.delete(key);
    else rateLimitMap.set(key, valid);
  }
}, RATE_LIMIT_WINDOW);
cleanupInterval.unref();

// --- HEALTH & READINESS ---
app.get('/health', (_req, res) => {
  const mongoState = require('mongoose').connection.readyState;
  res.json({
    status: 'V5 Hardened',
    uptime: process.uptime(),
    mongo: mongoState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});
app.get('/ready', (_req, res) => {
  const mongoState = require('mongoose').connection.readyState;
  if (mongoState !== 1) {
    return res.status(503).json({ ready: false, reason: 'MongoDB not connected' });
  }
  res.json({ ready: true });
});
app.get('/metrics', getMetrics);

// --- AUTH ROUTE (with brute-force protection: 5 attempts/min) ---
const authBruteForce = new Map<string, number[]>();
const AUTH_LIMIT = 5;
const authLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const attempts = (authBruteForce.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW);
  if (attempts.length >= AUTH_LIMIT) {
    logger.warn({ ip }, 'Auth brute-force blocked');
    return res.status(429).json({ error: 'Too many auth attempts. Try again later.' });
  }
  attempts.push(now);
  authBruteForce.set(ip, attempts);
  next();
};
app.post('/api/v1/auth/token', authLimiter, issueToken);
app.post('/api/auth/token', authLimiter, issueToken); // legacy

// --- API Versioning (with per-resource audit logging) ---
app.use('/api/v1/zones', auditLog('DangerZone'), zonesRouter);
app.use('/api/v1/resources', auditLog('ResourceHub'), resourcesRouter);
app.use('/api/v1/responders', auditLog('Responder'), respondersRouter);
app.use('/api/v1/geofence', auditLog('Geofence'), geofenceRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/comms', commsRouter);
app.use('/api/v1/iot', iotRouter);

// Legacy fallback routes for backward compatibility
app.use('/api/zones', auditLog('DangerZone'), zonesRouter);
app.use('/api/resources', auditLog('ResourceHub'), resourcesRouter);
app.use('/api/responders', auditLog('Responder'), respondersRouter);
app.use('/api/geofence', auditLog('Geofence'), geofenceRouter);
app.use('/api/ai', aiRouter);
app.use('/api/comms', commsRouter);
app.use('/api/iot', iotRouter);

// --- GLOBAL ERROR BOUNDARY ---
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err, stack: err?.stack }, 'Unhandled server error');
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
