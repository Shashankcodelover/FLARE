import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { SOCKET_EVENTS } from '@mirage/shared-types';
import { handleGeofenceCheck } from './services/geofenceService';
import { anonymizeCoordinates } from './services/locationPrivacy';
import logger from './logger';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Per-socket sliding-window rate limiter.
 * Blocks clients exceeding maxEvents within windowMs.
 */
class SocketRateLimiter {
  private windows = new Map<string, number[]>();
  constructor(private maxEvents: number, private windowMs: number) {}

  allow(socketId: string): boolean {
    const now = Date.now();
    const timestamps = (this.windows.get(socketId) ?? []).filter(t => now - t < this.windowMs);
    if (timestamps.length >= this.maxEvents) return false;
    timestamps.push(now);
    this.windows.set(socketId, timestamps);
    return true;
  }

  cleanup(socketId: string) {
    this.windows.delete(socketId);
  }
}

// 60 events per 10 seconds per socket — generous for real-time telemetry, blocks flooding
const locationLimiter = new SocketRateLimiter(60, 10_000);
const crdtLimiter = new SocketRateLimiter(120, 10_000);
const signalingLimiter = new SocketRateLimiter(30, 10_000);

export function initSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' },
  });

  // Redis adapter for horizontal scaling
  if (process.env.REDIS_URL) {
    const pub = new Redis(process.env.REDIS_URL!, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      enableOfflineQueue: false,
    });
    pub.on('error', (err) => {
      logger.debug({ err: err.message }, '[mirage:socket] Redis pub error');
    });
    const sub = pub.duplicate();
    sub.on('error', (err) => {
      logger.debug({ err: err.message }, '[mirage:socket] Redis sub error');
    });
    Promise.all([pub.connect(), sub.connect()]).then(() => {
      io.adapter(createAdapter(pub, sub));
      logger.info('[mirage:socket] Redis adapter attached');
    }).catch(() => {
      logger.info('[mirage:socket] Redis unavailable — running with in-memory adapter');
    });
  }

  // ═══════════════════════════════════════════════
  // SOCKET AUTHENTICATION MIDDLEWARE (fixes CRITICAL rejection #2)
  // Every socket must present a valid JWT at handshake time.
  // ═══════════════════════════════════════════════
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      logger.warn({ peerId: socket.id }, 'Socket connection rejected: no auth token');
      return next(new Error('Authentication required — provide token in handshake.auth.token'));
    }
    if (!JWT_SECRET) {
      return next(new Error('Server misconfigured — JWT_SECRET not set'));
    }
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { sub: string; role: string };
      (socket as any).user = payload;
      next();
    } catch (err) {
      logger.warn({ peerId: socket.id, err }, 'Socket connection rejected: invalid token');
      return next(new Error('Invalid or expired authentication token'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user;
    logger.info({ peerId: socket.id, userId: user?.sub, role: user?.role }, 'Authenticated peer connected');

    // WebRTC signaling relay (rate-limited)
    socket.on(SOCKET_EVENTS.PEER_OFFER, (payload) => {
      if (!signalingLimiter.allow(socket.id)) return;
      io.to(payload.to).emit(SOCKET_EVENTS.PEER_OFFER, { ...payload, from: socket.id });
    });
    socket.on(SOCKET_EVENTS.PEER_ANSWER, (payload) => {
      if (!signalingLimiter.allow(socket.id)) return;
      io.to(payload.to).emit(SOCKET_EVENTS.PEER_ANSWER, { ...payload, from: socket.id });
    });
    socket.on(SOCKET_EVENTS.PEER_ICE, (payload) => {
      if (!signalingLimiter.allow(socket.id)) return;
      io.to(payload.to).emit(SOCKET_EVENTS.PEER_ICE, { ...payload, from: socket.id });
    });

    // Location update → geofence check (ANONYMIZED — fixes MAJOR rejection #5)
    socket.on('responder:location', async (data) => {
      if (!locationLimiter.allow(socket.id)) {
        logger.warn({ peerId: socket.id }, 'Location event rate-limited');
        return;
      }

      // Input validation: reject malformed payloads
      if (
        !data ||
        typeof data.responderId !== 'string' ||
        data.responderId.length === 0 ||
        !Array.isArray(data.coordinates) ||
        data.coordinates.length !== 2 ||
        typeof data.coordinates[0] !== 'number' ||
        typeof data.coordinates[1] !== 'number' ||
        !Number.isFinite(data.coordinates[0]) ||
        !Number.isFinite(data.coordinates[1])
      ) {
        logger.warn({ peerId: socket.id }, 'Malformed responder:location payload rejected');
        return;
      }

      // Anti-spoofing check: non-coordinator users can only report their own location
      const socketUser = (socket as any).user;
      if (socketUser && socketUser.role !== 'coordinator' && socketUser.role !== 'admin' && data.responderId !== socketUser.sub) {
        logger.warn({ socketSub: socketUser.sub, spoofedId: data.responderId }, 'Location spoofing blocked: responderId mismatch');
        return;
      }

      try {
        // Run geofence check with raw coords for accuracy
        const alerts = await handleGeofenceCheck(data.responderId, data.coordinates);
        for (const alert of alerts) {
          io.emit(SOCKET_EVENTS.ZONE_ENTER, alert);
        }

        // Broadcast ANONYMIZED coordinates — never leak exact GPS (fixes rejection #5)
        const [lng, lat] = data.coordinates;
        const anon = anonymizeCoordinates(data.responderId, lng, lat);
        io.emit('responder:location:broadcast', {
          responderId: data.responderId,
          coordinates: [anon.blurredLng, anon.blurredLat],
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        logger.error({ err, responderId: data?.responderId }, 'Geofence check failed via socket');
      }
    });

    // CRDT update broadcast — rate-limited (fixes MAJOR rejection #7)
    socket.on(SOCKET_EVENTS.CRDT_UPDATE, (payload) => {
      if (!crdtLimiter.allow(socket.id)) {
        logger.warn({ peerId: socket.id }, 'CRDT update rate-limited');
        return;
      }
      socket.broadcast.emit(SOCKET_EVENTS.CRDT_UPDATE, payload);
    });

    socket.on('disconnect', () => {
      logger.info({ peerId: socket.id }, 'Peer disconnected');
      io.emit(SOCKET_EVENTS.PEER_LEFT, { peerId: socket.id });
      // Clean up rate limiter state
      locationLimiter.cleanup(socket.id);
      crdtLimiter.cleanup(socket.id);
      signalingLimiter.cleanup(socket.id);
    });
  });

  return io;
}
