import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import { SOCKET_EVENTS } from './shared-constants';
import { handleGeofenceCheck } from './services/geofenceService';
import logger from './logger';

export function initSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' },
  });

  // Redis adapter for horizontal scaling
  if (process.env.REDIS_URL) {
    const pub = new Redis(process.env.REDIS_URL!, { lazyConnect: true });
    const sub = pub.duplicate();
    Promise.all([pub.connect(), sub.connect()]).then(() => {
      io.adapter(createAdapter(pub, sub));
      logger.info('[mirage:socket] Redis adapter attached');
    }).catch((err) => {
      logger.error({ err }, '[mirage:socket] Redis adapter failed — falling back to in-memory');
    });
  }

  io.on('connection', (socket) => {
    logger.info({ peerId: socket.id }, 'Peer connected');

    // WebRTC signaling relay
    socket.on(SOCKET_EVENTS.PEER_OFFER, (payload) => {
      io.to(payload.to).emit(SOCKET_EVENTS.PEER_OFFER, { ...payload, from: socket.id });
    });
    socket.on(SOCKET_EVENTS.PEER_ANSWER, (payload) => {
      io.to(payload.to).emit(SOCKET_EVENTS.PEER_ANSWER, { ...payload, from: socket.id });
    });
    socket.on(SOCKET_EVENTS.PEER_ICE, (payload) => {
      io.to(payload.to).emit(SOCKET_EVENTS.PEER_ICE, { ...payload, from: socket.id });
    });

    // Location update → geofence check
    socket.on('responder:location', async (data) => {
      try {
        const alerts = await handleGeofenceCheck(data.responderId, data.coordinates);
        for (const alert of alerts) {
          io.emit(SOCKET_EVENTS.ZONE_ENTER, alert);
        }
      } catch (err) {
        logger.error({ err, responderId: data?.responderId }, 'Geofence check failed via socket');
      }
    });

    // CRDT update broadcast (server acts as relay when online)
    socket.on(SOCKET_EVENTS.CRDT_UPDATE, (payload) => {
      socket.broadcast.emit(SOCKET_EVENTS.CRDT_UPDATE, payload);
    });

    socket.on('disconnect', () => {
      logger.info({ peerId: socket.id }, 'Peer disconnected');
      io.emit(SOCKET_EVENTS.PEER_LEFT, { peerId: socket.id });
    });
  });

  return io;
}
