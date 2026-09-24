import { Router } from 'express';
import mongoose from 'mongoose';
import { ResourceHubModel } from '../models/ResourceHub';
import { SOCKET_EVENTS } from '../shared-constants';
import { validate, validateQuery } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';
import { createResourceSchema, updateStockSchema, resourceQuerySchema } from '../schemas/resource.schema';
import { inMemoryHubs } from '../memory-store';
import logger from '../logger';

export const resourcesRouter = Router();

// GET /api/resources — optionally filter by proximity: ?lng=&lat=&maxDistance=5000
resourcesRouter.get('/', validateQuery(resourceQuerySchema), async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const { lng, lat, maxDistance } = req.query;
      if (lng && lat) {
        const hubs = await ResourceHubModel.find({
          location: {
            $near: {
              $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
              $maxDistance: Number(maxDistance ?? 10000),
            },
          },
        });
        return res.json(hubs);
      }
      const hubs = await ResourceHubModel.find();
      return res.json(hubs);
    }
  } catch (err) {
    logger.warn({ err }, 'MongoDB query failed, falling back to in-memory resources');
  }
  return res.json(inMemoryHubs);
});

resourcesRouter.post('/', requireAuth, requireRole('admin', 'coordinator'), validate(createResourceSchema), async (req, res) => {
  try {
    let hub: any;
    if (mongoose.connection.readyState === 1) {
      hub = await ResourceHubModel.create(req.body);
    } else {
      hub = {
        _id: 'hub-' + Date.now(),
        ...req.body,
        resources: (req.body.resources || []).map((r: any, idx: number) => ({ ...r, _id: 'item-' + Date.now() + '-' + idx })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      inMemoryHubs.push(hub);
    }
    const io = req.app.get('io');
    if (io) {
      io.emit(SOCKET_EVENTS.RESOURCE_CREATED, hub);
    }
    logger.info({ hubId: hub._id, user: req.user?.sub }, 'Resource hub created');
    res.status(201).json(hub);
  } catch (err) {
    logger.error({ err }, 'Invalid hub data');
    res.status(400).json({ error: 'Invalid hub data' });
  }
});

// PATCH /api/resources/:hubId/items/:itemId — update stock
resourcesRouter.patch('/:hubId/items/:itemId', requireAuth, validate(updateStockSchema), async (req, res) => {
  try {
    let hub: any;
    if (mongoose.connection.readyState === 1) {
      hub = await ResourceHubModel.findOneAndUpdate(
        { _id: req.params.hubId, 'resources._id': req.params.itemId },
        { $set: { 'resources.$.quantity': req.body.quantity } },
        { new: true }
      );
    } else {
      hub = inMemoryHubs.find(h => h._id === req.params.hubId);
      if (hub) {
        const item = hub.resources.find((r: any) => r._id === req.params.itemId);
        if (item) item.quantity = req.body.quantity;
      }
    }
    if (!hub) return res.status(404).json({ error: 'Hub or item not found' });
    const io = req.app.get('io');
    if (io) {
      io.emit(SOCKET_EVENTS.RESOURCE_UPDATED, hub);
    }
    logger.info({ hubId: req.params.hubId, itemId: req.params.itemId, quantity: req.body.quantity }, 'Stock updated');
    res.json(hub);
  } catch (err) {
    logger.error({ err }, 'Stock update failed');
    res.status(400).json({ error: 'Update failed' });
  }
});
