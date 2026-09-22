import { Router } from 'express';
import { ResourceHubModel } from '../models/ResourceHub';
import { SOCKET_EVENTS } from '../shared-constants';
import { validate, validateQuery } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';
import { createResourceSchema, updateStockSchema, resourceQuerySchema } from '../schemas/resource.schema';
import logger from '../logger';

export const resourcesRouter = Router();

// GET /api/resources — optionally filter by proximity: ?lng=&lat=&maxDistance=5000
resourcesRouter.get('/', validateQuery(resourceQuerySchema), async (req, res) => {
  try {
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
    res.json(hubs);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch resources');
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

resourcesRouter.post('/', requireAuth, requireRole('admin', 'coordinator'), validate(createResourceSchema), async (req, res) => {
  try {
    const hub = await ResourceHubModel.create(req.body);
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
    const hub = await ResourceHubModel.findOneAndUpdate(
      { _id: req.params.hubId, 'resources._id': req.params.itemId },
      {
        $set: {
          'resources.$.quantity': req.body.quantity,
          'resources.$.lastUpdated': new Date(),
        },
      },
      { new: true }
    );
    if (!hub) return res.status(404).json({ error: 'Hub or item not found' });
    const io = req.app.get('io');
    if (io) {
      io.emit(SOCKET_EVENTS.RESOURCE_UPDATED, hub);
    }
    logger.info({ hubId: hub._id, itemId: req.params.itemId, user: req.user?.sub }, 'Stock updated');
    res.json(hub);
  } catch (err) {
    logger.error({ err }, 'Stock update failed');
    res.status(400).json({ error: 'Update failed' });
  }
});

resourcesRouter.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await ResourceHubModel.findByIdAndDelete(req.params.id);
    const io = req.app.get('io');
    if (io) {
      io.emit(SOCKET_EVENTS.RESOURCE_DELETED, { id: req.params.id });
    }
    logger.info({ hubId: req.params.id, user: req.user?.sub }, 'Resource hub deleted');
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, 'Resource delete failed');
    res.status(400).json({ error: 'Delete failed' });
  }
});
