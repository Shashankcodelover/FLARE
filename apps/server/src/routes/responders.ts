import { Router } from 'express';
import { ResponderModel } from '../models/Responder';
import { PublicKeyModel } from '../models/PublicKey';
import { emergencyStore, TacticalResponder } from '../services/emergencyStore';
import logger from '../logger';

export const respondersRouter = Router();

// GET /api/v1/responders
respondersRouter.get('/', async (_req, res) => {
  try {
    if (emergencyStore.isMongoConnected()) {
      const responders = await ResponderModel.find();
      if (responders.length > 0) return res.json(responders);
    }
    res.json(emergencyStore.getResponders());
  } catch (err) {
    logger.warn({ err }, 'Falling back to autonomous memory responder store');
    res.json(emergencyStore.getResponders());
  }
});

// POST /api/v1/responders/upload — Enterprise Batch Ingestion (CSV / JSON)
respondersRouter.post('/upload', async (req, res) => {
  try {
    let items: Partial<TacticalResponder>[] = [];

    if (typeof req.body === 'string') {
      items = emergencyStore.parseResponderCSV(req.body);
    } else if (Array.isArray(req.body)) {
      items = req.body;
    } else if (req.body && typeof req.body === 'object') {
      if (req.body.csv && typeof req.body.csv === 'string') {
        items = emergencyStore.parseResponderCSV(req.body.csv);
      } else if (Array.isArray(req.body.responders)) {
        items = req.body.responders;
      } else {
        items = [req.body];
      }
    }

    if (items.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid responder records found in payload' });
    }

    if (emergencyStore.isMongoConnected()) {
      try {
        await ResponderModel.insertMany(items.map(r => ({
          name: r.name,
          role: r.role || 'medic',
          status: r.status || 'active',
          location: r.location || { type: 'Point', coordinates: [-118.25, 34.05] },
          batteryPct: r.batteryPct || 90,
        })));
      } catch (dbErr) {
        logger.warn({ dbErr }, 'Failed Mongo batch insert for responders, using memory store');
      }
    }

    const created = emergencyStore.bulkCreateResponders(items);
    logger.info({ count: created.length }, 'Batch responders ingested');
    res.status(201).json({
      success: true,
      message: `Successfully ingested ${created.length} tactical responders`,
      data: created,
    });
  } catch (err: any) {
    logger.error({ err }, 'Failed batch responder ingestion');
    res.status(500).json({ success: false, error: 'Failed to batch ingest responders' });
  }
});

// POST /api/v1/responders — Single creation
respondersRouter.post('/', async (req, res) => {
  try {
    let responder: any;
    if (emergencyStore.isMongoConnected()) {
      try {
        responder = await ResponderModel.create(req.body);
      } catch (e) {
        responder = emergencyStore.createResponder(req.body);
      }
    } else {
      responder = emergencyStore.createResponder(req.body);
    }
    logger.info({ responderId: responder._id }, 'Responder created');
    res.status(201).json(responder);
  } catch (err) {
    logger.error({ err }, 'Invalid responder data');
    res.status(400).json({ error: 'Invalid responder data' });
  }
});

// DELETE /api/v1/responders/all or DELETE /api/v1/responders — Universal Purge
respondersRouter.delete('/all', async (_req, res) => {
  try {
    if (emergencyStore.isMongoConnected()) {
      await ResponderModel.deleteMany({});
    }
    const purged = emergencyStore.deleteAllResponders();
    res.json({ success: true, message: `Universal purge: deleted all responders (${purged} removed)` });
  } catch (err) {
    logger.error({ err }, 'Universal responder purge failed');
    res.status(500).json({ error: 'Universal responder purge failed' });
  }
});

respondersRouter.delete('/', async (_req, res) => {
  try {
    if (emergencyStore.isMongoConnected()) {
      await ResponderModel.deleteMany({});
    }
    const purged = emergencyStore.deleteAllResponders();
    res.json({ success: true, message: `Universal purge: deleted all responders (${purged} removed)` });
  } catch (err) {
    logger.error({ err }, 'Universal responder purge failed');
    res.status(500).json({ error: 'Universal responder purge failed' });
  }
});

// DELETE /api/v1/responders/:id — Delete single responder
respondersRouter.delete('/:id', async (req, res) => {
  try {
    if (emergencyStore.isMongoConnected()) {
      await ResponderModel.findByIdAndDelete(req.params.id);
    }
    emergencyStore.deleteResponder(req.params.id);
    logger.info({ responderId: req.params.id }, 'Responder deleted');
    res.status(200).json({ success: true, message: `Responder ${req.params.id} deleted successfully` });
  } catch (err) {
    logger.error({ err }, 'Responder delete failed');
    res.status(400).json({ error: 'Delete failed' });
  }
});

// PATCH /api/v1/responders/:id/location — update GPS position
respondersRouter.patch('/:id/location', async (req, res) => {
  try {
    const { coordinates } = req.body;
    if (emergencyStore.isMongoConnected()) {
      const responder = await ResponderModel.findByIdAndUpdate(
        req.params.id,
        { location: { type: 'Point', coordinates } },
        { new: true }
      );
      if (responder) return res.json(responder);
    }

    const mem = emergencyStore.getResponderById(req.params.id);
    if (mem) {
      mem.location = { type: 'Point', coordinates };
      mem.lastPing = new Date().toISOString();
      return res.json(mem);
    }

    res.status(404).json({ error: 'Responder not found' });
  } catch (err) {
    logger.error({ err }, 'Location update failed');
    res.status(400).json({ error: 'Update failed' });
  }
});

// PKI for E2EE
respondersRouter.post('/keys', async (req, res) => {
  try {
    const responderId = req.body?.responderId || 'resp-current';
    const { publicKeyBase64, algorithm } = req.body;
    
    if (emergencyStore.isMongoConnected()) {
      await PublicKeyModel.findOneAndUpdate(
        { responderId },
        { publicKeyBase64, algorithm: algorithm || 'ECDH-P256', timestamp: new Date() },
        { upsert: true, new: true }
      );
    }
    
    logger.info({ responderId }, 'Public key published successfully');
    res.status(200).json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to publish public key');
    res.status(500).json({ error: 'Key publication failed' });
  }
});

respondersRouter.get('/:id/key', async (req, res) => {
  try {
    if (emergencyStore.isMongoConnected()) {
      const keyRecord = await PublicKeyModel.findOne({ responderId: req.params.id });
      if (keyRecord) {
        return res.json({
          responderId: keyRecord.responderId,
          publicKeyBase64: keyRecord.publicKeyBase64,
          algorithm: keyRecord.algorithm,
          timestamp: keyRecord.timestamp,
        });
      }
    }
    res.json({
      responderId: req.params.id,
      publicKeyBase64: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE+mock+key',
      algorithm: 'ECDH-P256',
      timestamp: new Date(),
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch public key');
    res.status(500).json({ error: 'Key fetch failed' });
  }
});
