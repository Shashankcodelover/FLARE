import { Router } from 'express';
import mongoose from 'mongoose';
import { DangerZoneModel } from '../models/DangerZone';
import { SOCKET_EVENTS } from '../shared-constants';
import { validate, validateQuery } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';
import { createZoneSchema, updateZoneSchema, zoneQuerySchema } from '../schemas/zone.schema';
import { inMemoryZones } from '../memory-store';
import logger from '../logger';

export const zonesRouter = Router();

// GET /api/zones — optionally filter by bbox: ?bbox=minLng,minLat,maxLng,maxLat
zonesRouter.get('/', validateQuery(zoneQuerySchema), async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const query: Record<string, unknown> = { active: true };
      if (req.query.bbox) {
        const [minLng, minLat, maxLng, maxLat] = String(req.query.bbox).split(',').map(Number);
        query.geometry = {
          $geoIntersects: {
            $geometry: {
              type: 'Polygon',
              coordinates: [[
                [minLng, minLat], [maxLng, minLat],
                [maxLng, maxLat], [minLng, maxLat], [minLng, minLat],
              ]],
            },
          },
        };
      }
      const zones = await DangerZoneModel.find(query);
      return res.json(zones);
    }
  } catch (err) {
    logger.warn({ err }, 'MongoDB query failed, falling back to in-memory zones');
  }
  return res.json(inMemoryZones.filter(z => z.active));
});

zonesRouter.post('/', requireAuth, requireRole('admin', 'coordinator'), validate(createZoneSchema), async (req, res) => {
  try {
    let zone: any;
    if (mongoose.connection.readyState === 1) {
      zone = await DangerZoneModel.create(req.body);
    } else {
      zone = {
        _id: 'zone-' + Date.now(),
        ...req.body,
        active: req.body.active ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      inMemoryZones.push(zone);
    }
    const io = req.app.get('io');
    if (io) {
      io.emit(SOCKET_EVENTS.ZONE_CREATED, zone);
    }
    logger.info({ zoneId: zone._id, user: req.user?.sub }, 'Zone created');
    res.status(201).json(zone);
  } catch (err) {
    logger.error({ err }, 'Invalid zone data');
    res.status(400).json({ error: 'Invalid zone data' });
  }
});

zonesRouter.put('/:id', requireAuth, requireRole('admin', 'coordinator'), validate(updateZoneSchema), async (req, res) => {
  try {
    let zone: any;
    if (mongoose.connection.readyState === 1) {
      zone = await DangerZoneModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    } else {
      const idx = inMemoryZones.findIndex(z => z._id === req.params.id);
      if (idx !== -1) {
        inMemoryZones[idx] = { ...inMemoryZones[idx], ...req.body, updatedAt: new Date().toISOString() };
        zone = inMemoryZones[idx];
      }
    }
    if (!zone) return res.status(404).json({ error: 'Zone not found' });
    const io = req.app.get('io');
    if (io) {
      io.emit(SOCKET_EVENTS.ZONE_UPDATED, zone);
    }
    logger.info({ zoneId: zone._id, user: req.user?.sub }, 'Zone updated');
    res.json(zone);
  } catch (err) {
    logger.error({ err }, 'Zone update failed');
    res.status(400).json({ error: 'Update failed' });
  }
});

zonesRouter.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    let zone: any;
    if (mongoose.connection.readyState === 1) {
      zone = await DangerZoneModel.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    } else {
      const idx = inMemoryZones.findIndex(z => z._id === req.params.id);
      if (idx !== -1) {
        inMemoryZones[idx].active = false;
        zone = inMemoryZones[idx];
      }
    }
    const io = req.app.get('io');
    if (io && zone) {
      io.emit(SOCKET_EVENTS.ZONE_UPDATED, zone);
    }
    logger.info({ zoneId: req.params.id, user: req.user?.sub }, 'Zone soft-deleted');
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, 'Zone delete failed');
    res.status(400).json({ error: 'Delete failed' });
  }
});
