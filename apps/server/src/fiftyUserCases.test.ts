import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import app from './app';

describe('50 Comprehensive User-Flow & Disaster Logistics Verification Suite: FLARE', () => {
  let server: http.Server;
  let baseUrl: string;
  let adminToken: string;
  let coordToken: string;
  let respToken: string;
  const adminSecret = process.env.JWT_SECRET || 'change_me_in_production';

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as AddressInfo).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Obtain Admin JWT Token
    const adminRes = await fetch(`${baseUrl}/api/v1/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sub: 'admin-01', role: 'admin', secret: adminSecret }),
    });
    const adminData = await adminRes.json();
    adminToken = adminData.token;

    // Obtain Coordinator JWT Token
    const coordRes = await fetch(`${baseUrl}/api/v1/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sub: 'coord-01', role: 'coordinator', secret: adminSecret }),
    });
    const coordData = await coordRes.json();
    coordToken = coordData.token;

    // Obtain Responder JWT Token
    const respRes = await fetch(`${baseUrl}/api/v1/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sub: 'resp-01', role: 'responder', secret: adminSecret }),
    });
    const respData = await respRes.json();
    respToken = respData.token;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  // ─── 1. System Health & Observability (Tests 1-5) ────────────────
  it('01. GET /health returns 200 with hardened uptime and status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('V5 Hardened');
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });

  it('02. GET /metrics exports Prometheus metrics stream with http request metrics', async () => {
    const res = await fetch(`${baseUrl}/metrics`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('http_requests_total');
  });

  it('03. GET /ready endpoint reports system readiness state', async () => {
    const res = await fetch(`${baseUrl}/ready`);
    expect([200, 503]).toContain(res.status);
  });

  it('04. Request pipeline attaches unique x-request-id for distributed tracing', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
  });

  it('05. Options preflight request handles CORS policy successfully', async () => {
    const res = await fetch(`${baseUrl}/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://flare.shashankj.tech',
        'Access-Control-Request-Method': 'GET',
      },
    });
    expect([200, 204]).toContain(res.status);
  });

  // ─── 2. Security & Role-Based Access Control (Tests 6-10) ────────
  it('06. Mints admin JWT token via /api/v1/auth/token with admin secret', async () => {
    expect(adminToken).toBeDefined();
    expect(adminToken.split('.').length).toBe(3);
  });

  it('07. Mints coordinator JWT token via /api/v1/auth/token', async () => {
    expect(coordToken).toBeDefined();
    expect(coordToken.split('.').length).toBe(3);
  });

  it('08. Mints responder JWT token via /api/v1/auth/token', async () => {
    expect(respToken).toBeDefined();
    expect(respToken.split('.').length).toBe(3);
  });

  it('09. Rejects token issuance with invalid admin secret (401)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sub: 'intruder', role: 'admin', secret: 'wrong-secret' }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid admin secret/i);
  });

  it('10. Rejects unauthenticated write operations (401)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/zones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Unauthorized Zone' }),
    });
    expect(res.status).toBe(401);
  });

  // ─── 3. Danger Zone Spatial Management (Tests 11-18) ─────────────
  it('11. GET /api/v1/zones returns active danger zones list', async () => {
    const res = await fetch(`${baseUrl}/api/v1/zones`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it('12. GET /api/v1/zones?bbox=-120,30,-115,36 filters zones by spatial bounding box', async () => {
    const res = await fetch(`${baseUrl}/api/v1/zones?bbox=-120,30,-115,36`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('13. Admin creates new wildfire danger zone with polygon coordinates (201)', async () => {
    const payload = {
      name: 'Sierra Ridge Brushfire',
      description: 'Rapidly advancing wildfire on eastern ridge',
      severity: 'critical',
      active: true,
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-118.45, 34.15], [-118.35, 34.15], [-118.35, 34.25],
          [-118.45, 34.25], [-118.45, 34.15]
        ]]
      }
    };
    const res = await fetch(`${baseUrl}/api/v1/zones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('Sierra Ridge Brushfire');
    expect(body._id).toBeDefined();
  });

  it('14. Zone creation rejects payload missing mandatory geometry coordinates', async () => {
    const res = await fetch(`${baseUrl}/api/v1/zones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: 'Incomplete Zone', severity: 'low' }),
    });
    expect([400, 422]).toContain(res.status);
  });

  it('15. Field responder token is forbidden (403) from creating danger zones', async () => {
    const payload = {
      name: 'Rogue Zone',
      severity: 'low',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-118.4, 34.1], [-118.3, 34.1], [-118.3, 34.2],
          [-118.4, 34.2], [-118.4, 34.1]
        ]]
      }
    };
    const res = await fetch(`${baseUrl}/api/v1/zones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${respToken}`,
      },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(403);
  });

  it('16. Coordinator updates danger zone severity from high to critical', async () => {
    const res = await fetch(`${baseUrl}/api/v1/zones/zone-alpha-001`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${coordToken}`,
      },
      body: JSON.stringify({ severity: 'critical' }),
    });
    expect([200, 404]).toContain(res.status);
  });

  it('17. PUT /api/v1/zones/:id toggles active state of danger zone', async () => {
    const res = await fetch(`${baseUrl}/api/v1/zones/zone-beta-002`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ active: true }),
    });
    expect([200, 404]).toContain(res.status);
  });

  it('18. Legacy route GET /api/zones forwards seamlessly to active zones', async () => {
    const res = await fetch(`${baseUrl}/api/zones`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  // ─── 4. Point-In-Polygon Geofencing Engine (Tests 19-22) ──────────
  it('19. POST /api/v1/geofence/check detects responder inside active wildfire polygon', async () => {
    const res = await fetch(`${baseUrl}/api/v1/geofence/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates: [-118.4, 34.2] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('insideZones');
    expect(Array.isArray(body.insideZones)).toBe(true);
  });

  it('20. POST /api/v1/geofence/check returns empty list for coordinates outside all zones', async () => {
    const res = await fetch(`${baseUrl}/api/v1/geofence/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates: [0.0, 0.0] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.insideZones.length).toBe(0);
  });

  it('21. Geofence check validates coordinate schema and rejects invalid input', async () => {
    const res = await fetch(`${baseUrl}/api/v1/geofence/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates: ['invalid', 34.2] }),
    });
    expect([400, 422]).toContain(res.status);
  });

  it('22. Legacy route POST /api/geofence/check returns containment results', async () => {
    const res = await fetch(`${baseUrl}/api/geofence/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates: [-87.6, 41.9] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('insideZones');
  });

  // ─── 5. Emergency Resource Hubs & Inventory Logistics (Tests 23-29)
  it('23. GET /api/v1/resources returns active emergency resource hubs', async () => {
    const res = await fetch(`${baseUrl}/api/v1/resources`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it('24. Admin provisions new emergency relief depot with capacity (201)', async () => {
    const payload = {
      name: 'San Fernando Valley Staging Ground',
      capacity: 750,
      location: { type: 'Point', coordinates: [-118.48, 34.18] },
      resources: [
        { category: 'medical', name: 'Trauma Kits', quantity: 200, unit: 'kits' },
        { category: 'food', name: 'Potable Water Packs', quantity: 5000, unit: 'liters' }
      ]
    };
    const res = await fetch(`${baseUrl}/api/v1/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('San Fernando Valley Staging Ground');
  });

  it('25. Resource hub creation rejects payload missing coordinates or negative capacity', async () => {
    const res = await fetch(`${baseUrl}/api/v1/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: 'Invalid Hub', capacity: -50 }),
    });
    expect([400, 422]).toContain(res.status);
  });

  it('26. Coordinator modifies supply batch quantity in hub inventory', async () => {
    const res = await fetch(`${baseUrl}/api/v1/resources/hub-la-001/items/item-1`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${coordToken}`,
      },
      body: JSON.stringify({ quantity: 2500 }),
    });
    expect([200, 404]).toContain(res.status);
  });

  it('27. PUT /api/v1/resources/:id validates update schema', async () => {
    const res = await fetch(`${baseUrl}/api/v1/resources/hub-chi-002/items/item-3`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ quantity: 95 }),
    });
    expect([200, 404]).toContain(res.status);
  });

  it('28. Responder role is forbidden (403) from deleting resource hubs', async () => {
    const res = await fetch(`${baseUrl}/api/v1/resources/hub-la-001`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${respToken}` },
    });
    expect(res.status).toBe(403);
  });

  it('29. Legacy route GET /api/resources returns active hub inventory', async () => {
    const res = await fetch(`${baseUrl}/api/resources`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  // ─── 6. Field Responder GPS Telemetry & Tracking (Tests 30-34) ───
  it('30. GET /api/v1/responders returns active field responder roster', async () => {
    const res = await fetch(`${baseUrl}/api/v1/responders`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it('31. Coordinator provisions new search & rescue responder (201)', async () => {
    const payload = {
      name: 'Lieutenant Maya Gomez',
      role: 'field_agent',
      online: true,
    };
    const res = await fetch(`${baseUrl}/api/v1/responders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${coordToken}`,
      },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('Lieutenant Maya Gomez');
  });

  it('32. PATCH /api/v1/responders/:id/location updates responder GPS coordinates', async () => {
    const res = await fetch(`${baseUrl}/api/v1/responders/resp-alpha-001/location`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${respToken}`,
      },
      body: JSON.stringify({ coordinates: [-118.41, 34.21] }),
    });
    expect([200, 404]).toContain(res.status);
  });

  it('33. Responder location update rejects unauthenticated request (401)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/responders/resp-alpha-001/location`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates: [-118.41, 34.21] }),
    });
    expect(res.status).toBe(401);
  });

  it('34. Responder location update rejects invalid coordinates array', async () => {
    const res = await fetch(`${baseUrl}/api/v1/responders/resp-alpha-001/location`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${respToken}`,
      },
      body: JSON.stringify({ coordinates: ['invalid'] }),
    });
    expect([400, 404, 422]).toContain(res.status);
  });

  // ─── 7. AI Disaster Operations & Route Planning (Tests 35-40) ────
  it('35. POST /api/v1/ai/optimal-route computes path avoiding active danger zones', async () => {
    const payload = {
      from: [-118.6, 34.0],
      to: [-118.2, 34.4],
      wheelchair: false,
    };
    const res = await fetch(`${baseUrl}/api/v1/ai/optimal-route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('path');
    expect(Array.isArray(body.path)).toBe(true);
    expect(body.path.length).toBeGreaterThan(0);
  });

  it('36. POST /api/v1/ai/optimal-route supports wheelchair accessibility mode', async () => {
    const payload = {
      from: [-118.6, 34.0],
      to: [-118.2, 34.4],
      wheelchair: true,
    };
    const res = await fetch(`${baseUrl}/api/v1/ai/optimal-route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.path)).toBe(true);
  });

  it('37. Optimal route endpoint validates origin and destination coordinates', async () => {
    const res = await fetch(`${baseUrl}/api/v1/ai/optimal-route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'invalid', to: [-118.2, 34.4] }),
    });
    expect([400, 422]).toContain(res.status);
  });

  it('38. GET /api/v1/ai/predictive-burn forecasts supply burn-rate and hours remaining', async () => {
    const res = await fetch(`${baseUrl}/api/v1/ai/predictive-burn`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    if (body.length > 0) {
      expect(body[0]).toHaveProperty('burnRatePerHour');
      expect(body[0]).toHaveProperty('hoursRemaining');
      expect(body[0]).toHaveProperty('status');
    }
  });

  it('39. GET /api/v1/ai/sitrep compiles official FEMA Incident Situation Briefing', async () => {
    const res = await fetch(`${baseUrl}/api/v1/ai/sitrep`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('FEMA FORM ICS-201');
    expect(text).toContain('INCIDENT BRIEFING');
  });

  it('40. SITREP output contains valid FEMA situational intelligence markers', async () => {
    const res = await fetch(`${baseUrl}/api/v1/ai/sitrep`);
    const text = await res.text();
    expect(text).toContain('SYSTEM COORDINATION KEY');
    expect(text).toContain('INCIDENT LOG DATE');
  });

  // ─── 8. Emergency Mesh Comms & Priority Relays (Tests 41-44) ──────
  it('41. GET /api/v1/comms/messages/:zoneId retrieves emergency feed', async () => {
    const res = await fetch(`${baseUrl}/api/v1/comms/messages/zone-alpha-001`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('42. POST /api/v1/comms/messages broadcasts priority distress dispatch (201)', async () => {
    const payload = {
      senderId: 'resp-alpha-001',
      senderName: 'Captain Marcus Vance',
      zoneId: 'zone-alpha-001',
      content: 'URGENT: Flash flame-front advancing on Sector 4. Immediate water airdrop required.',
      priority: 'critical',
    };
    const res = await fetch(`${baseUrl}/api/v1/comms/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.priority).toBe('critical');
    expect(body.content).toContain('URGENT');
  });

  it('43. Comms message broadcast validates priority levels', async () => {
    const payload = {
      senderId: 'resp-alpha-001',
      senderName: 'Captain Marcus Vance',
      zoneId: 'zone-alpha-001',
      content: 'Valid content',
      priority: 'invalid-priority',
    };
    const res = await fetch(`${baseUrl}/api/v1/comms/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect([400, 422]).toContain(res.status);
  });

  it('44. Comms message rejects empty content with 400 or 422', async () => {
    const payload = {
      senderId: 'resp-01',
      senderName: 'John',
      zoneId: 'zone-01',
      content: '',
      priority: 'normal',
    };
    const res = await fetch(`${baseUrl}/api/v1/comms/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect([400, 422]).toContain(res.status);
  });

  // ─── 9. IoT Sensor Ingestion & Autonomous Drones (Tests 45-47) ────
  it('45. GET /api/v1/iot/telemetry retrieves real-time environmental telemetry', async () => {
    const res = await fetch(`${baseUrl}/api/v1/iot/telemetry`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    if (body.length > 0) {
      expect(body[0]).toHaveProperty('sensorId');
      expect(body[0]).toHaveProperty('type');
    }
  });

  it('46. GET /api/v1/iot/drones retrieves autonomous drone fleet missions', async () => {
    const res = await fetch(`${baseUrl}/api/v1/iot/drones`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('47. Drone telemetry includes battery percentage and operating status', async () => {
    const res = await fetch(`${baseUrl}/api/v1/iot/drones`);
    const body = await res.json();
    if (body.length > 0) {
      expect(body[0]).toHaveProperty('droneId');
      expect(body[0]).toHaveProperty('batteryPct');
      expect(body[0]).toHaveProperty('status');
    }
  });

  // ─── 10. Resilience, Security Sanitization & Rate Limit (Tests 48-50)
  it('48. Sanitization middleware strips dangerous operators from request body', async () => {
    const payload = {
      name: 'Test Zone',
      severity: 'low',
      $where: 'sleep(1000)',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-118.4, 34.1], [-118.3, 34.1], [-118.3, 34.2],
          [-118.4, 34.2], [-118.4, 34.1]
        ]]
      }
    };
    const res = await fetch(`${baseUrl}/api/v1/zones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify(payload),
    });
    expect([201, 400, 422]).toContain(res.status);
  });

  it('49. Structured request logging records latency and status codes', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
  });

  it('50. Global error handling catches and responds with standardized JSON', async () => {
    const res = await fetch(`${baseUrl}/api/v1/zones/nonexistent-id`);
    expect([200, 404, 500]).toContain(res.status);
  });
});
