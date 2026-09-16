import { Router } from 'express';
import { DangerZoneModel } from '../models/DangerZone';
import { SOCKET_EVENTS } from '@mirage/shared-types';
import { emergencyStore, TacticalZone } from '../services/emergencyStore';
import logger from '../logger';

export const zonesRouter = Router();

// GET /api/v1/zones — optionally filter by bbox: ?bbox=minLng,minLat,maxLng,maxLat
zonesRouter.get('/', async (req, res) => {
  try {
    if (emergencyStore.isMongoConnected()) {
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
      if (zones.length > 0) return res.json(zones);
    }
    // Resilient autonomous fallback
    const fallbackZones = emergencyStore.getZones();
    res.json(fallbackZones);
  } catch (err) {
    logger.warn({ err }, 'Falling back to autonomous memory zone store');
    res.json(emergencyStore.getZones());
  }
});

// POST /api/v1/zones/upload — Enterprise Batch Ingestion (CSV / JSON)
zonesRouter.post('/upload', async (req, res) => {
  try {
    let items: Partial<TacticalZone>[] = [];

    if (typeof req.body === 'string') {
      items = emergencyStore.parseZoneCSV(req.body);
    } else if (Array.isArray(req.body)) {
      items = req.body;
    } else if (req.body && typeof req.body === 'object') {
      if (req.body.csv && typeof req.body.csv === 'string') {
        items = emergencyStore.parseZoneCSV(req.body.csv);
      } else if (Array.isArray(req.body.zones)) {
        items = req.body.zones;
      } else {
        items = [req.body];
      }
    }

    if (items.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid danger zone records found in payload' });
    }

    // Persist to Mongo if connected
    if (emergencyStore.isMongoConnected()) {
      try {
        await DangerZoneModel.insertMany(items.map(z => ({
          name: z.name,
          dangerLevel: z.dangerLevel || 'high',
          geometry: z.geometry || {
            type: 'Polygon',
            coordinates: [[
              [-118.3, 34.0], [-118.25, 34.0], [-118.25, 34.05], [-118.3, 34.05], [-118.3, 34.0]
            ]]
          },
          description: z.description || 'Ingested batch zone',
          active: true
        })));
      } catch (dbErr) {
        logger.warn({ dbErr }, 'Failed Mongo batch insert for zones, using memory store');
      }
    }

    const created = emergencyStore.bulkCreateZones(items);
    const io = req.app.get('io');
    if (io) {
      io.emit(SOCKET_EVENTS.ZONE_CREATED, { count: created.length });
    }

    logger.info({ count: created.length }, 'Batch danger zones ingested');
    res.status(201).json({
      success: true,
      message: `Successfully ingested ${created.length} hazard zones`,
      data: created,
    });
  } catch (err: any) {
    logger.error({ err }, 'Failed batch zone ingestion');
    res.status(500).json({ success: false, error: 'Failed to batch ingest danger zones' });
  }
});

// POST /api/v1/zones — Single zone creation
zonesRouter.post('/', async (req, res) => {
  try {
    let zone: any;
    if (emergencyStore.isMongoConnected()) {
      try {
        zone = await DangerZoneModel.create(req.body);
      } catch (e) {
        zone = emergencyStore.createZone(req.body);
      }
    } else {
      zone = emergencyStore.createZone(req.body);
    }

    const io = req.app.get('io');
    if (io) {
      io.emit(SOCKET_EVENTS.ZONE_CREATED, zone);
    }
    logger.info({ zoneId: zone._id }, 'Zone created');
    res.status(201).json(zone);
  } catch (err) {
    logger.error({ err }, 'Invalid zone data');
    res.status(400).json({ error: 'Invalid zone data' });
  }
});

// DELETE /api/v1/zones/all or DELETE /api/v1/zones — Universal Cascading Deletion
zonesRouter.delete('/all', async (_req, res) => {
  try {
    if (emergencyStore.isMongoConnected()) {
      await DangerZoneModel.updateMany({}, { active: false });
    }
    const purged = emergencyStore.deleteAllZones();
    res.json({ success: true, message: `Universal purge: deactivated all hazard zones (${purged} from active mesh)` });
  } catch (err) {
    logger.error({ err }, 'Universal zone purge failed');
    res.status(500).json({ error: 'Universal zone purge failed' });
  }
});

zonesRouter.delete('/', async (_req, res) => {
  try {
    if (emergencyStore.isMongoConnected()) {
      await DangerZoneModel.updateMany({}, { active: false });
    }
    const purged = emergencyStore.deleteAllZones();
    res.json({ success: true, message: `Universal purge: deactivated all hazard zones (${purged} from active mesh)` });
  } catch (err) {
    logger.error({ err }, 'Universal zone purge failed');
    res.status(500).json({ error: 'Universal zone purge failed' });
  }
});

// PUT /api/v1/zones/:id
zonesRouter.put('/:id', async (req, res) => {
  try {
    let zone: any;
    if (emergencyStore.isMongoConnected()) {
      zone = await DangerZoneModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    }
    if (!zone) {
      const mem = emergencyStore.getZoneById(req.params.id);
      if (mem) {
        Object.assign(mem, req.body);
        zone = mem;
      }
    }
    if (!zone) return res.status(404).json({ error: 'Zone not found' });
    const io = req.app.get('io');
    if (io) io.emit(SOCKET_EVENTS.ZONE_UPDATED, zone);
    res.json(zone);
  } catch (err) {
    logger.error({ err }, 'Zone update failed');
    res.status(400).json({ error: 'Update failed' });
  }
});

// DELETE /api/v1/zones/:id — Single zone deletion
zonesRouter.delete('/:id', async (req, res) => {
  try {
    if (emergencyStore.isMongoConnected()) {
      await DangerZoneModel.findByIdAndUpdate(req.params.id, { active: false });
    }
    emergencyStore.deleteZone(req.params.id);
    const io = req.app.get('io');
    if (io) io.emit(SOCKET_EVENTS.ZONE_UPDATED, { id: req.params.id, active: false });
    logger.info({ zoneId: req.params.id }, 'Zone deactivated');
    res.status(200).json({ success: true, message: `Zone ${req.params.id} deactivated successfully` });
  } catch (err) {
    logger.error({ err }, 'Zone delete failed');
    res.status(400).json({ error: 'Delete failed' });
  }
});
