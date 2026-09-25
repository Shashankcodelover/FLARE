import { Router } from 'express';
import mongoose from 'mongoose';
import { MessageModel } from '../models/Message';
import { validate } from '../middleware/validate';
import { z } from 'zod';
import logger from '../logger';

export const commsRouter = Router();

const createMessageSchema = z.object({
  senderId: z.string().min(1),
  senderName: z.string().min(1),
  zoneId: z.string().min(1),
  content: z.string().min(1), // raw/encrypted text string
  priority: z.enum(['critical', 'status', 'normal']).default('normal'),
});

const inMemoryMessages: any[] = [];

/**
 * GET /api/v1/comms/messages/:zoneId
 * Returns recent messages in a zone channel feed.
 */
commsRouter.get('/messages/:zoneId', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const messages = await MessageModel.find({ zoneId: req.params.zoneId })
        .sort({ timestamp: -1 })
        .limit(50);
      return res.json(messages.reverse()); // return chronological order
    }

    const filtered = inMemoryMessages
      .filter(m => m.zoneId === req.params.zoneId)
      .slice(-50);
    return res.json(filtered);
  } catch (err) {
    logger.error({ err, zoneId: req.params.zoneId }, 'Failed to fetch messages');
    res.status(500).json({ error: 'Failed to fetch communications feed' });
  }
});

/**
 * POST /api/v1/comms/messages
 * Submits and relays a new encrypted priority communication.
 */
commsRouter.post('/messages', validate(createMessageSchema), async (req, res) => {
  try {
    let msg: any;
    if (mongoose.connection.readyState === 1) {
      msg = await MessageModel.create(req.body);
    } else {
      msg = {
        _id: 'msg-' + Date.now(),
        ...req.body,
        timestamp: new Date().toISOString(),
      };
      inMemoryMessages.push(msg);
    }

    const io = req.app.get('io');
    if (io) {
      // Broadcast to socket subscribers
      io.emit(`zone:${req.body.zoneId}:message`, msg);
    }
    logger.info({ messageId: msg._id, zoneId: msg.zoneId }, 'Comms message posted and relayed');
    res.status(201).json(msg);
  } catch (err) {
    logger.error({ err }, 'Message submit failed');
    res.status(400).json({ error: 'Failed to broadcast message' });
  }
});
