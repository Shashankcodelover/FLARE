import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { zonesRouter } from './routes/zones';
import { resourcesRouter } from './routes/resources';
import { respondersRouter } from './routes/responders';
import { geofenceRouter } from './routes/geofence';
import { aiRouter } from './routes/ai';
import { commsRouter } from './routes/comms';
import { iotRouter } from './routes/iot';
import { transferRouter, timelineRouter } from './routes/transfers';
import { cotRouter } from './routes/cot';
import { triageRouter } from './routes/triage';
import { dronePlanningRouter } from './routes/dronePlanning';
import { forecastRouter } from './routes/forecast';
import { dtnRouter } from './routes/dtn';
import { evacuationRouter } from './routes/evacuation';
import { droneVisionRouter } from './routes/droneVision';
import { governanceRouter } from './routes/governance';
import { auditBenchmarkRouter } from './routes/auditBenchmark';
import { loraUartRouter } from './routes/loraUart';
import { plumeRouter } from './routes/plume';
import { acousticRouter } from './routes/acoustic';
import { pqcRouter } from './routes/pqc';
import { sovereignV15Router } from './routes/sovereignV15';
import { topologyRouter } from './routes/topologyRoutes';
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
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false, // Allow external tile images for Leaflet
}));

// CORS Whitelist config
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:4000,http://localhost:4001').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('shashankj.tech')) return cb(null, true);
    cb(new Error('CORS policy violation'));
  },
  credentials: true
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.text({ limit: '15mb', type: ['text/plain', 'text/csv', 'application/csv'] }));

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

// --- CLIENT SUBNET EXTRACTION FOR IPv6 PROXY PROTECTION ---
export function getClientSubnet(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown';
  const cleanIp = ip.replace(/^::ffff:/, '');
  if (cleanIp.includes(':')) {
    // IPv6: cluster by /64 routing prefix to prevent rotating-address bypasses
    const parts = cleanIp.split(':');
    return parts.slice(0, 4).join(':');
  }
  return cleanIp;
}

// --- NON-BLOCKING RATE LIMITER ---
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_READ = 200;      // reads per minute
const RATE_LIMIT_WRITE = 50;      // writes per minute
const MAX_RATE_KEYS = 50_000;

app.use((req, res, next) => {
  const rawIp = req.ip || req.socket.remoteAddress || 'unknown';
  const subnet = getClientSubnet(rawIp);
  const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const key = `${subnet}:${isWrite ? 'w' : 'r'}`;
  const limit = isWrite ? RATE_LIMIT_WRITE : RATE_LIMIT_READ;
  const now = Date.now();
  
  const timestamps = rateLimitMap.get(key) || [];
  const valid = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (valid.length >= limit) {
    logger.warn({ subnet, method: req.method, path: req.path }, 'Rate limit exceeded');
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }

  // Prevent unbounded memory growth under DDoS
  if (rateLimitMap.size >= MAX_RATE_KEYS && !rateLimitMap.has(key)) {
    const firstKey = rateLimitMap.keys().next().value;
    if (firstKey) rateLimitMap.delete(firstKey);
  }

  valid.push(now);
  rateLimitMap.set(key, valid);
  next();
});

// Incremental lazy cleanup — cleans in 500-key micro-slices to never block the Node.js event loop
let cleanupIterator: IterableIterator<[string, number[]]> | null = null;
setInterval(() => {
  if (rateLimitMap.size === 0) return;
  if (!cleanupIterator) cleanupIterator = rateLimitMap.entries();
  
  const now = Date.now();
  let processed = 0;
  while (processed < 500) {
    const item = cleanupIterator.next();
    if (item.done) {
      cleanupIterator = null;
      break;
    }
    const [key, timestamps] = item.value;
    const valid = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (valid.length === 0) rateLimitMap.delete(key);
    else rateLimitMap.set(key, valid);
    processed++;
  }
}, 1000);

// --- HEALTH & READINESS ---
app.get('/health', (_req, res) => {
  const mongoState = mongoose.connection.readyState;
  res.json({
    status: 'V5 Hardened',
    uptime: process.uptime(),
    mongo: mongoState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});
app.get('/ready', (_req, res) => {
  const mongoState = mongoose.connection.readyState;
  if (mongoState !== 1) {
    return res.status(503).json({ ready: false, reason: 'MongoDB not connected' });
  }
  res.json({ ready: true });
});
app.get('/metrics', getMetrics);

// --- AUTH ROUTE (Multi-factor brute force protection: IP Subnet + Sub/User identity) ---
const authBruteForce = new Map<string, number[]>();
const AUTH_LIMIT = 5;
const authLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const rawIp = req.ip || req.socket.remoteAddress || 'unknown';
  const subnet = getClientSubnet(rawIp);
  const targetUser = req.body?.sub || 'anonymous';
  const compoundKey = `${subnet}:${targetUser}`;
  const now = Date.now();

  const attempts = (authBruteForce.get(compoundKey) || []).filter(t => now - t < RATE_LIMIT_WINDOW);
  if (attempts.length >= AUTH_LIMIT) {
    logger.warn({ subnet, targetUser }, 'Auth brute-force attempt blocked');
    return res.status(429).json({ error: 'Too many auth attempts. Try again later.' });
  }

  attempts.push(now);
  authBruteForce.set(compoundKey, attempts);
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
app.use('/api/v1/transfers', auditLog('ResourceTransfer'), transferRouter);
app.use('/api/v1/timeline', timelineRouter);
app.use('/api/v1/cot', cotRouter);
app.use('/api/v1/triage', auditLog('Triage'), triageRouter);
app.use('/api/v1/drones', auditLog('DroneMission'), dronePlanningRouter);
app.use('/api/v1/drones/vision', auditLog('DroneVision'), droneVisionRouter);
app.use('/api/v1/forecast', forecastRouter);
app.use('/api/v1/dtn', auditLog('DTNBundle'), dtnRouter);
app.use('/api/v1/evacuation', auditLog('EvacuationRoute'), evacuationRouter);
app.use('/api/v1/governance', auditLog('EmergencyGovernance'), governanceRouter);
app.use('/api/v1/lora/uart', auditLog('LoRaUart'), loraUartRouter);
app.use('/api/v1/hazard/plume', auditLog('PlumeHazard'), plumeRouter);
app.use('/api/v1/iot/audio', auditLog('AcousticDetection'), acousticRouter);
app.use('/api/v1/security/pqc', auditLog('PQCCrypto'), pqcRouter);
app.use('/api/v1/sovereign', auditLog('SovereignV15'), sovereignV15Router);
app.use('/api/v1/topology', auditLog('TopologyMesh'), topologyRouter);
app.use('/api/v1/system', auditBenchmarkRouter);






// Legacy fallback routes for backward compatibility
app.use('/api/topology', auditLog('TopologyMesh'), topologyRouter);
app.use('/api/zones', auditLog('DangerZone'), zonesRouter);
app.use('/api/resources', auditLog('ResourceHub'), resourcesRouter);
app.use('/api/responders', auditLog('Responder'), respondersRouter);
app.use('/api/geofence', auditLog('Geofence'), geofenceRouter);
app.use('/api/ai', aiRouter);
app.use('/api/comms', commsRouter);
app.use('/api/iot', iotRouter);
app.use('/api/transfers', auditLog('ResourceTransfer'), transferRouter);
app.use('/api/timeline', timelineRouter);
app.use('/api/cot', cotRouter);
app.use('/api/triage', triageRouter);
app.use('/api/drones', dronePlanningRouter);
app.use('/api/forecast', forecastRouter);
app.use('/api/dtn', dtnRouter);
app.use('/api/evacuation', evacuationRouter);
app.use('/api/governance', governanceRouter);

// --- STATIC FRONTEND SPA SERVING ---
const candidates = [
  path.resolve(__dirname, '../../web/dist'),
  path.resolve(process.cwd(), 'apps/web/dist'),
  path.resolve(process.cwd(), '../web/dist'),
];
const webDistPath = candidates.find(p => fs.existsSync(path.join(p, 'index.html')));

if (webDistPath) {
  app.use(express.static(webDistPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/health') && !req.path.startsWith('/ready') && !req.path.startsWith('/metrics')) {
      return res.sendFile(path.join(webDistPath, 'index.html'));
    }
    next();
  });
}

// --- GLOBAL ERROR BOUNDARY ---
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err, stack: err?.stack }, 'Unhandled server error');
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
