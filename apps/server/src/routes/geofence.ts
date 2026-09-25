import { Router } from 'express';
import mongoose from 'mongoose';
import { DangerZoneModel } from '../models/DangerZone';
import { validate } from '../middleware/validate';
import { geofenceCheckSchema } from '../schemas/responder.schema';
import { inMemoryZones } from '../memory-store';
import logger from '../logger';

export const geofenceRouter = Router();

function pointInPolygon(point: [number, number], vs: number[][]): boolean {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * POST /api/geofence/check
 * Body: { coordinates: [lng, lat] }
 * Returns all active danger zones that contain the given point.
 */
geofenceRouter.post('/check', validate(geofenceCheckSchema), async (req, res) => {
  try {
    const { coordinates } = req.body as { coordinates: [number, number] };
    if (mongoose.connection.readyState === 1) {
      const zones = await DangerZoneModel.find({
        active: true,
        geometry: {
          $geoIntersects: {
            $geometry: { type: 'Point', coordinates },
          },
        },
      });
      return res.json({ insideZones: zones });
    }

    // In-memory fallback
    const insideZones = inMemoryZones.filter(z => {
      if (!z.active || !z.geometry || !z.geometry.coordinates) return false;
      return pointInPolygon(coordinates, z.geometry.coordinates[0]);
    });
    return res.json({ insideZones });
  } catch (err) {
    logger.error({ err }, 'Geofence check failed');
    res.status(500).json({ error: 'Geofence check failed' });
  }
});
