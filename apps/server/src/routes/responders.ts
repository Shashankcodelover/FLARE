import { Router } from 'express';
import mongoose from 'mongoose';
import { ResponderModel } from '../models/Responder';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';
import { createResponderSchema, updateLocationSchema } from '../schemas/responder.schema';
import logger from '../logger';

export const respondersRouter = Router();

const inMemoryResponders: any[] = [
  {
    _id: 'resp-alpha-001',
    name: 'Captain Marcus Vance',
    role: 'Search & Rescue Lead',
    status: 'active',
    location: { type: 'Point', coordinates: [-118.4, 34.2] },
    batteryLevel: 94,
    lastPing: new Date().toISOString(),
  },
  {
    _id: 'resp-beta-002',
    name: 'Dr. Sarah Lin',
    role: 'Triage Medical Officer',
    status: 'active',
    location: { type: 'Point', coordinates: [-118.35, 34.15] },
    batteryLevel: 88,
    lastPing: new Date().toISOString(),
  }
];

respondersRouter.get('/', async (_req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const responders = await ResponderModel.find();
      return res.json(responders);
    }
    return res.json(inMemoryResponders);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch responders');
    return res.json(inMemoryResponders);
  }
});

respondersRouter.post('/', requireAuth, requireRole('admin', 'coordinator'), validate(createResponderSchema), async (req, res) => {
  try {
    let responder: any;
    if (mongoose.connection.readyState === 1) {
      responder = await ResponderModel.create(req.body);
    } else {
      responder = {
        _id: 'resp-' + Date.now(),
        ...req.body,
        lastPing: new Date().toISOString(),
      };
      inMemoryResponders.push(responder);
    }
    logger.info({ responderId: responder._id, user: req.user?.sub }, 'Responder created');
    res.status(201).json(responder);
  } catch (err) {
    logger.error({ err }, 'Invalid responder data');
    res.status(400).json({ error: 'Invalid responder data' });
  }
});

// PATCH /api/responders/:id/location
respondersRouter.patch('/:id/location', requireAuth, validate(updateLocationSchema), async (req, res) => {
  try {
    const { coordinates } = req.body; // [lng, lat]
    if (mongoose.connection.readyState === 1) {
      const responder = await ResponderModel.findByIdAndUpdate(
        req.params.id,
        { location: { type: 'Point', coordinates } },
        { new: true }
      );
      if (!responder) return res.status(404).json({ error: 'Responder not found' });
      logger.info({ responderId: responder._id }, 'Responder location updated');
      return res.json(responder);
    }

    const index = inMemoryResponders.findIndex(r => r._id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Responder not found' });
    inMemoryResponders[index].location = { type: 'Point', coordinates };
    inMemoryResponders[index].lastPing = new Date().toISOString();
    return res.json(inMemoryResponders[index]);
  } catch (err) {
    logger.error({ err }, 'Location update failed');
    res.status(400).json({ error: 'Update failed' });
  }
});
