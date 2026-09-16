import { Router } from 'express';
import { ResourceHubModel } from '../models/ResourceHub';
import { SOCKET_EVENTS } from '@mirage/shared-types';
import { emergencyStore, TacticalResource } from '../services/emergencyStore';
import logger from '../logger';

export const resourcesRouter = Router();

// GET /api/v1/resources — optionally filter by proximity: ?lng=&lat=&maxDistance=5000
resourcesRouter.get('/', async (req, res) => {
  try {
    const { lng, lat, maxDistance } = req.query;
    if (emergencyStore.isMongoConnected()) {
      if (lng && lat) {
        const hubs = await ResourceHubModel.find({
          location: {
            $near: {
              $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
              $maxDistance: Number(maxDistance ?? 10000),
            },
          },
        });
        if (hubs.length > 0) return res.json(hubs);
      } else {
        const hubs = await ResourceHubModel.find();
        if (hubs.length > 0) return res.json(hubs);
      }
    }
    // Resilient autonomous fallback
    res.json(emergencyStore.getResources());
  } catch (err) {
    logger.warn({ err }, 'Falling back to autonomous memory resource hub store');
    res.json(emergencyStore.getResources());
  }
});

// POST /api/v1/resources/upload — Enterprise Batch Ingestion (CSV / JSON)
resourcesRouter.post('/upload', async (req, res) => {
  try {
    let items: Partial<TacticalResource>[] = [];

    if (typeof req.body === 'string') {
      items = emergencyStore.parseResourceCSV(req.body);
    } else if (Array.isArray(req.body)) {
      items = req.body;
    } else if (req.body && typeof req.body === 'object') {
      if (req.body.csv && typeof req.body.csv === 'string') {
        items = emergencyStore.parseResourceCSV(req.body.csv);
      } else if (Array.isArray(req.body.resources)) {
        items = req.body.resources;
      } else {
        items = [req.body];
      }
    }

    if (items.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid resource records found in payload' });
    }

    if (emergencyStore.isMongoConnected()) {
      try {
        await ResourceHubModel.insertMany(items.map(h => ({
          name: h.name,
          location: h.location || { type: 'Point', coordinates: [-118.25, 34.05] },
          capacity: h.capacity || 5000,
          resources: h.resources || [],
        })));
      } catch (dbErr) {
        logger.warn({ dbErr }, 'Failed Mongo batch insert for resources, using memory store');
      }
    }

    const created = emergencyStore.bulkCreateResources(items);
    const io = req.app.get('io');
    if (io) {
      io.emit(SOCKET_EVENTS.RESOURCE_CREATED, { count: created.length });
    }

    logger.info({ count: created.length }, 'Batch resource hubs ingested');
    res.status(201).json({
      success: true,
      message: `Successfully ingested ${created.length} emergency resource hubs`,
      data: created,
    });
  } catch (err: any) {
    logger.error({ err }, 'Failed batch resource ingestion');
    res.status(500).json({ success: false, error: 'Failed to batch ingest resource hubs' });
  }
});

// POST /api/v1/resources — Single resource hub creation
resourcesRouter.post('/', async (req, res) => {
  try {
    let hub: any;
    if (emergencyStore.isMongoConnected()) {
      try {
        hub = await ResourceHubModel.create(req.body);
      } catch (e) {
        hub = emergencyStore.createResource(req.body);
      }
    } else {
      hub = emergencyStore.createResource(req.body);
    }

    const io = req.app.get('io');
    if (io) {
      io.emit(SOCKET_EVENTS.RESOURCE_CREATED, hub);
    }
    logger.info({ hubId: hub._id }, 'Resource hub created');
    res.status(201).json(hub);
  } catch (err) {
    logger.error({ err }, 'Invalid hub data');
    res.status(400).json({ error: 'Invalid hub data' });
  }
});

// PATCH /api/v1/resources/:hubId/items/:itemId — update stock
resourcesRouter.patch('/:hubId/items/:itemId', async (req, res) => {
  try {
    if (emergencyStore.isMongoConnected()) {
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
      if (hub) {
        const io = req.app.get('io');
        if (io) io.emit(SOCKET_EVENTS.RESOURCE_UPDATED, hub);
        return res.json(hub);
      }
    }

    const memHub = emergencyStore.getResourceById(req.params.hubId);
    if (memHub) {
      const item = memHub.resources.find(r => r._id === req.params.itemId);
      if (item) {
        item.quantity = req.body.quantity;
        item.lastUpdated = new Date().toISOString();
        return res.json(memHub);
      }
    }

    res.status(404).json({ error: 'Hub or item not found' });
  } catch (err) {
    logger.error({ err }, 'Stock update failed');
    res.status(400).json({ error: 'Update failed' });
  }
});

// DELETE /api/v1/resources/all or DELETE /api/v1/resources — Universal Purge
resourcesRouter.delete('/all', async (_req, res) => {
  try {
    if (emergencyStore.isMongoConnected()) {
      await ResourceHubModel.deleteMany({});
    }
    const purged = emergencyStore.deleteAllResources();
    res.json({ success: true, message: `Universal purge: deleted all emergency supply hubs (${purged} removed)` });
  } catch (err) {
    logger.error({ err }, 'Universal resource purge failed');
    res.status(500).json({ error: 'Universal resource purge failed' });
  }
});

resourcesRouter.delete('/', async (_req, res) => {
  try {
    if (emergencyStore.isMongoConnected()) {
      await ResourceHubModel.deleteMany({});
    }
    const purged = emergencyStore.deleteAllResources();
    res.json({ success: true, message: `Universal purge: deleted all emergency supply hubs (${purged} removed)` });
  } catch (err) {
    logger.error({ err }, 'Universal resource purge failed');
    res.status(500).json({ error: 'Universal resource purge failed' });
  }
});

// DELETE /api/v1/resources/:id — Delete single resource hub
resourcesRouter.delete('/:id', async (req, res) => {
  try {
    if (emergencyStore.isMongoConnected()) {
      await ResourceHubModel.findByIdAndDelete(req.params.id);
    }
    emergencyStore.deleteResource(req.params.id);
    const io = req.app.get('io');
    if (io) {
      io.emit(SOCKET_EVENTS.RESOURCE_DELETED, { id: req.params.id });
    }
    logger.info({ hubId: req.params.id }, 'Resource hub deleted');
    res.status(200).json({ success: true, message: `Resource hub ${req.params.id} deleted successfully` });
  } catch (err) {
    logger.error({ err }, 'Resource delete failed');
    res.status(400).json({ error: 'Delete failed' });
  }
});
