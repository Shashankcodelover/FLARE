import { Router } from 'express';
import { topologyService, MeshCorridor } from '../services/topologyService';
import logger from '../logger';

export const topologyRouter = Router();

// GET /api/v1/topology — Corridor list and live telemetry summary
topologyRouter.get('/', (_req, res) => {
  try {
    const corridors = topologyService.getAll();
    const metrics = topologyService.getMetrics();
    res.json({
      success: true,
      data: {
        corridors,
        metrics,
      },
    });
  } catch (err: any) {
    logger.error({ err }, 'Failed to fetch topology');
    res.status(500).json({ success: false, error: 'Failed to fetch topology' });
  }
});

// GET /api/v1/topology/corridors
topologyRouter.get('/corridors', (_req, res) => {
  res.json({ success: true, data: topologyService.getAll() });
});

// GET /api/v1/topology/metrics
topologyRouter.get('/metrics', (_req, res) => {
  res.json({ success: true, data: topologyService.getMetrics() });
});

// POST /api/v1/topology/corridors — Provision new mesh relay corridor
topologyRouter.post('/corridors', (req, res) => {
  try {
    const { sourceNode, targetNode, protocol, bandwidthMbps, latencyMs, packetLoss, encryption, environment } = req.body;
    if (!sourceNode || !targetNode) {
      return res.status(400).json({ success: false, error: 'sourceNode and targetNode are required' });
    }

    const corridor = topologyService.provision({
      sourceNode,
      targetNode,
      protocol,
      bandwidthMbps,
      latencyMs,
      packetLoss,
      encryption,
      environment,
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('topology:corridor_created', corridor);
    }

    logger.info({ corridorId: corridor.id }, 'Mesh corridor provisioned');
    res.status(201).json({ success: true, data: corridor });
  } catch (err: any) {
    logger.error({ err }, 'Failed to provision corridor');
    res.status(500).json({ success: false, error: 'Failed to provision corridor' });
  }
});

// DELETE /api/v1/topology/corridors/:id — Sever emergency corridor
topologyRouter.delete('/corridors/:id', (req, res) => {
  try {
    const ok = topologyService.sever(req.params.id);
    if (!ok) {
      return res.status(404).json({ success: false, error: 'Corridor not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('topology:corridor_severed', { id: req.params.id });
    }

    logger.info({ corridorId: req.params.id }, 'Mesh corridor severed');
    res.json({ success: true, message: `Corridor ${req.params.id} severed successfully` });
  } catch (err: any) {
    logger.error({ err }, 'Failed to sever corridor');
    res.status(500).json({ success: false, error: 'Failed to sever corridor' });
  }
});

// DELETE /api/v1/topology/corridors — Universal corridor purge
topologyRouter.delete('/corridors', (_req, res) => {
  try {
    const deletedCount = topologyService.deleteAll();
    res.json({ success: true, message: `Severed all ${deletedCount} mesh corridors`, deletedCount });
  } catch (err: any) {
    logger.error({ err }, 'Failed to purge corridors');
    res.status(500).json({ success: false, error: 'Failed to purge corridors' });
  }
});

// POST /api/v1/topology/upload — Enterprise Batch Ingestion (CSV or JSON)
topologyRouter.post('/upload', (req, res) => {
  try {
    let itemsToCreate: Partial<MeshCorridor>[] = [];

    if (typeof req.body === 'string') {
      // Raw CSV
      itemsToCreate = topologyService.parseCSV(req.body);
    } else if (Array.isArray(req.body)) {
      itemsToCreate = req.body;
    } else if (req.body && typeof req.body === 'object') {
      if (req.body.csv && typeof req.body.csv === 'string') {
        itemsToCreate = topologyService.parseCSV(req.body.csv);
      } else if (Array.isArray(req.body.corridors)) {
        itemsToCreate = req.body.corridors;
      } else {
        itemsToCreate = [req.body];
      }
    }

    if (itemsToCreate.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid corridor records found in payload' });
    }

    const created = topologyService.bulkCreate(itemsToCreate);
    const io = req.app.get('io');
    if (io) {
      io.emit('topology:bulk_provisioned', { count: created.length });
    }

    logger.info({ count: created.length }, 'Bulk mesh corridors provisioned');
    res.status(201).json({
      success: true,
      message: `Successfully provisioned ${created.length} mesh corridors`,
      data: created,
    });
  } catch (err: any) {
    logger.error({ err }, 'Bulk corridor upload failed');
    res.status(500).json({ success: false, error: 'Bulk upload failed' });
  }
});
