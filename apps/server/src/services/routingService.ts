import mongoose from 'mongoose';
import { DangerZoneModel } from '../models/DangerZone';
import { inMemoryZones } from '../memory-store';
import logger from '../logger';

interface Node {
  id: string;
  lng: number;
  lat: number;
}

interface Edge {
  from: string;
  to: string;
  weight: number;
}

/**
 * Implements Dijkstra's pathfinding algorithm on a dynamic spatial graph.
 * Weights are heavily penalized if routing through active danger zones,
 * forcing the calculated path to go *around* active disaster areas.
 */
export async function calculateOptimalRoute(
  fromCoord: [number, number], // [lng, lat]
  toCoord: [number, number],
  wheelchair = false
): Promise<[number, number][]> {
  try {
    // 1. Fetch active danger zones to check intersection penalties
    let activeZones: any[] = [];
    if (mongoose.connection.readyState === 1) {
      activeZones = await DangerZoneModel.find({ active: true });
    } else {
      activeZones = inMemoryZones.filter(z => z.active);
    }

    // Helper to calculate danger penalty multiplier at a point
    const getPointPenaltyMultiplier = (lng: number, lat: number): number => {
      let multiplier = 1.0;
      for (const zone of activeZones) {
        if (isPointInPolygon([lng, lat], zone.geometry.coordinates[0])) {
          // If responder is using a wheelchair, critical/high zones are completely impassable
          if (zone.severity === 'critical') multiplier = Math.max(multiplier, wheelchair ? 500.0 : 100.0);
          else if (zone.severity === 'high') multiplier = Math.max(multiplier, wheelchair ? 80.0 : 10.0);
          else if (zone.severity === 'medium') multiplier = Math.max(multiplier, wheelchair ? 15.0 : 3.0);
          else if (zone.severity === 'low') multiplier = Math.max(multiplier, wheelchair ? 5.0 : 1.5);
        }
      }
      
      // Simulate accessible slopes/unpaved road weights when wheelchair mode is enabled
      if (wheelchair) {
        // Add random terrain roughness penalty
        const terrainRoughness = 1.25;
        multiplier *= terrainRoughness;
      }
      
      return multiplier;
    };

    // 2. Generate a grid of coordinate vertices between from and to locations
    // We construct a grid with 6x6 spacing covering the bounding box of starting and ending coords
    const minLng = Math.min(fromCoord[0], toCoord[0]) - 0.2;
    const maxLng = Math.max(fromCoord[0], toCoord[0]) + 0.2;
    const minLat = Math.min(fromCoord[1], toCoord[1]) - 0.2;
    const maxLat = Math.max(fromCoord[1], toCoord[1]) + 0.2;

    const gridSteps = 7; // creates a 7x7 graph grid = 49 nodes
    const lngStep = (maxLng - minLng) / (gridSteps - 1);
    const latStep = (maxLat - minLat) / (gridSteps - 1);

    const nodes: Node[] = [];
    // Add start and end points as explicit nodes
    nodes.push({ id: 'start', lng: fromCoord[0], lat: fromCoord[1] });
    nodes.push({ id: 'end', lng: toCoord[0], lat: toCoord[1] });

    for (let i = 0; i < gridSteps; i++) {
      for (let j = 0; j < gridSteps; j++) {
        const lng = minLng + i * lngStep;
        const lat = minLat + j * latStep;
        nodes.push({ id: `n_${i}_${j}`, lng, lat });
      }
    }

    // 3. Connect nodes with edges to form the graph
    const edges: Edge[] = [];
    const connectNodes = (n1: Node, n2: Node) => {
      const dist = Math.sqrt(Math.pow(n1.lng - n2.lng, 2) + Math.pow(n1.lat - n2.lat, 2));
      // Calculate intermediate point to check danger zone penalty
      const midLng = (n1.lng + n2.lng) / 2;
      const midLat = (n1.lat + n2.lat) / 2;
      const penalty = getPointPenaltyMultiplier(midLng, midLat);
      
      edges.push({
        from: n1.id,
        to: n2.id,
        weight: dist * penalty,
      });
    };

    // Connect grid neighbors
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];
        // Connect start and end to all close grid nodes, and grid nodes to close neighbors
        const dist = Math.sqrt(Math.pow(n1.lng - n2.lng, 2) + Math.pow(n1.lat - n2.lat, 2));
        if (
          (n1.id === 'start' || n2.id === 'start' || n1.id === 'end' || n2.id === 'end') && dist < 0.25 ||
          (n1.id.startsWith('n_') && n2.id.startsWith('n_') && dist < Math.max(lngStep, latStep) * 1.5)
        ) {
          connectNodes(n1, n2);
          connectNodes(n2, n1); // Undirected graph
        }
      }
    }

    // 4. Run Dijkstra's shortest path algorithm
    const dists: Record<string, number> = {};
    const prev: Record<string, string | null> = {};
    const unvisited = new Set<string>();

    for (const node of nodes) {
      dists[node.id] = Infinity;
      prev[node.id] = null;
      unvisited.add(node.id);
    }
    dists['start'] = 0;

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let currId: string | null = null;
      let minDist = Infinity;
      for (const id of unvisited) {
        if (dists[id] < minDist) {
          minDist = dists[id];
          currId = id;
        }
      }

      if (currId === null || currId === 'end') break;
      unvisited.delete(currId);

      // Relax neighbors
      const neighbors = edges.filter((e) => e.from === currId);
      for (const edge of neighbors) {
        if (!unvisited.has(edge.to)) continue;
        const alt = dists[currId] + edge.weight;
        if (alt < dists[edge.to]) {
          dists[edge.to] = alt;
          prev[edge.to] = currId;
        }
      }
    }

    // Reconstruct path
    const path: [number, number][] = [];
    let curr: string | null = 'end';
    
    // If start is unreachable
    if (dists['end'] === Infinity) {
      logger.warn({ fromCoord, toCoord }, 'Dijkstra route failed: target destination unreachable outside hazard boundaries');
      return [fromCoord, toCoord]; // fallback to direct line
    }

    while (curr !== null) {
      const node = nodes.find((n) => n.id === curr);
      if (node) {
        path.unshift([node.lng, node.lat]);
      }
      curr = prev[curr];
    }

    logger.info({ fromCoord, toCoord, segments: path.length }, 'Dijkstra optimal path calculated successfully');
    return path;
  } catch (err) {
    logger.error({ err }, 'Error in calculateOptimalRoute');
    return [fromCoord, toCoord]; // Fallback to direct path
  }
}

// Ray-casting algorithm to determine if a point is inside a polygon
function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const x = point[0];
  const y = point[1];
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
}
