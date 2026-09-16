import mongoose from 'mongoose';

export interface TacticalZone {
  _id: string;
  name: string;
  dangerLevel: 'critical' | 'high' | 'medium' | 'low';
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  description?: string;
  active: boolean;
  createdAt: string;
}

export interface TacticalResource {
  _id: string;
  name: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  capacity: number;
  resources: Array<{
    _id: string;
    type: string;
    quantity: number;
    unit: string;
    lastUpdated: string;
  }>;
}

export interface TacticalResponder {
  _id: string;
  name: string;
  role: 'medic' | 'firefighter' | 'rescue_diver' | 'drone_pilot' | 'k9_search' | 'hazmat_tech' | 'logistics';
  status: 'active' | 'en_route' | 'resting' | 'standby';
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  batteryPct: number;
  lastPing: string;
}

class EmergencyStore {
  private zones: TacticalZone[] = [
    {
      _id: 'zone-wildfire-alpha',
      name: 'Wildfire Hazard Perimeter — Sector 4',
      dangerLevel: 'critical',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-118.45, 34.05],
          [-118.40, 34.05],
          [-118.40, 34.10],
          [-118.45, 34.10],
          [-118.45, 34.05],
        ]],
      },
      description: 'Active rapid-spreading crown fire with wind gusts > 40mph. Mandatory evacuation.',
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'zone-flood-beta',
      name: 'Flash Flood Inundation Zone — River Basin',
      dangerLevel: 'high',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-118.35, 34.00],
          [-118.30, 34.00],
          [-118.30, 34.04],
          [-118.35, 34.04],
          [-118.35, 34.00],
        ]],
      },
      description: 'Levee breach imminent. Water levels rising 18 inches/hr.',
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'zone-hazmat-gamma',
      name: 'Toxic Plume Dispersion Buffer — Industrial South',
      dangerLevel: 'medium',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-118.25, 33.95],
          [-118.20, 33.95],
          [-118.20, 33.99],
          [-118.25, 33.99],
          [-118.25, 33.95],
        ]],
      },
      description: 'Airborne ammonia vapor cloud. Shelter-in-place with sealed ventilation required.',
      active: true,
      createdAt: new Date().toISOString(),
    },
  ];

  private resources: TacticalResource[] = [
    {
      _id: 'hub-main-depot',
      name: 'FEMA Logistics Staging Area (Central Depot)',
      location: {
        type: 'Point',
        coordinates: [-118.2437, 34.0522],
      },
      capacity: 10000,
      resources: [
        { _id: 'item-water-01', type: 'Potable Water (Liters)', quantity: 4500, unit: 'Liters', lastUpdated: new Date().toISOString() },
        { _id: 'item-blood-02', type: 'Emergency O- Blood Packs', quantity: 180, unit: 'Units', lastUpdated: new Date().toISOString() },
        { _id: 'item-mre-03', type: 'FEMA Disaster MRE Rations', quantity: 3200, unit: 'Meals', lastUpdated: new Date().toISOString() },
        { _id: 'item-trauma-04', type: 'ATLS Hemostatic Gauze Kits', quantity: 450, unit: 'Kits', lastUpdated: new Date().toISOString() },
      ],
    },
    {
      _id: 'hub-forward-north',
      name: 'Forward Medical Point — North Ridge Station',
      location: {
        type: 'Point',
        coordinates: [-118.4100, 34.0800],
      },
      capacity: 2500,
      resources: [
        { _id: 'item-burn-01', type: 'Burn Dressing & Saline IV', quantity: 850, unit: 'Units', lastUpdated: new Date().toISOString() },
        { _id: 'item-oxygen-02', type: 'Portable Medical O2 Cylinders', quantity: 65, unit: 'Tanks', lastUpdated: new Date().toISOString() },
        { _id: 'item-mesh-03', type: 'LoRa Repeaters & Power Banks', quantity: 30, unit: 'Nodes', lastUpdated: new Date().toISOString() },
      ],
    },
    {
      _id: 'hub-evac-south',
      name: 'Civic Center Evacuation Mega-Shelter',
      location: {
        type: 'Point',
        coordinates: [-118.2800, 33.9800],
      },
      capacity: 5000,
      resources: [
        { _id: 'item-cots-01', type: 'Emergency Sleeping Cots & Blankets', quantity: 2400, unit: 'Sets', lastUpdated: new Date().toISOString() },
        { _id: 'item-meals-02', type: 'Ready-to-Eat Emergency Meals', quantity: 6000, unit: 'Meals', lastUpdated: new Date().toISOString() },
        { _id: 'item-peds-03', type: 'Pediatric Formula & Medical Kits', quantity: 320, unit: 'Packs', lastUpdated: new Date().toISOString() },
      ],
    },
  ];

  private responders: TacticalResponder[] = [
    {
      _id: 'resp-captain-01',
      name: 'Capt. Marcus Vance (USAR Task Force 1)',
      role: 'firefighter',
      status: 'active',
      location: { type: 'Point', coordinates: [-118.4200, 34.0600] },
      batteryPct: 92,
      lastPing: new Date().toISOString(),
    },
    {
      _id: 'resp-medic-02',
      name: 'Dr. Elena Rostova (Critical Care Paramedic)',
      role: 'medic',
      status: 'en_route',
      location: { type: 'Point', coordinates: [-118.3900, 34.0750] },
      batteryPct: 78,
      lastPing: new Date().toISOString(),
    },
    {
      _id: 'resp-drone-03',
      name: 'Sgt. David Chen (UAV Swarm Recon Lead)',
      role: 'drone_pilot',
      status: 'active',
      location: { type: 'Point', coordinates: [-118.3200, 34.0200] },
      batteryPct: 88,
      lastPing: new Date().toISOString(),
    },
    {
      _id: 'resp-hazmat-04',
      name: 'Specialist Sarah Al-Mansoor (HazMat Recon)',
      role: 'hazmat_tech',
      status: 'standby',
      location: { type: 'Point', coordinates: [-118.2300, 33.9600] },
      batteryPct: 95,
      lastPing: new Date().toISOString(),
    },
  ];

  public isMongoConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  // --- ZONES ---
  public getZones(): TacticalZone[] {
    return this.zones.filter((z) => z.active);
  }

  public getZoneById(id: string): TacticalZone | undefined {
    return this.zones.find((z) => z._id === id);
  }

  public createZone(data: Partial<TacticalZone>): TacticalZone {
    const id = data._id || `zone-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const zone: TacticalZone = {
      _id: id,
      name: data.name || 'Tactical Hazard Perimeter',
      dangerLevel: data.dangerLevel || 'high',
      geometry: data.geometry || {
        type: 'Polygon',
        coordinates: [[
          [-118.30, 34.02],
          [-118.25, 34.02],
          [-118.25, 34.06],
          [-118.30, 34.06],
          [-118.30, 34.02],
        ]],
      },
      description: data.description || 'Emergency perimeter established via automated geofencing engine.',
      active: true,
      createdAt: new Date().toISOString(),
    };
    this.zones.unshift(zone);
    return zone;
  }

  public deleteZone(id: string): boolean {
    const zone = this.zones.find((z) => z._id === id);
    if (!zone) return false;
    zone.active = false;
    return true;
  }

  public deleteAllZones(): number {
    const count = this.zones.length;
    this.zones = [];
    return count;
  }

  public bulkCreateZones(items: Partial<TacticalZone>[]): TacticalZone[] {
    const created: TacticalZone[] = [];
    for (const item of items) {
      if (item.name) {
        created.push(this.createZone(item));
      }
    }
    return created;
  }

  public parseZoneCSV(csvText: string): Partial<TacticalZone>[] {
    const lines = csvText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length <= 1) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('zone'));
    const levelIdx = headers.findIndex((h) => h.includes('danger') || h.includes('level') || h.includes('severity'));
    const lngIdx = headers.findIndex((h) => h.includes('lng') || h.includes('lon'));
    const latIdx = headers.findIndex((h) => h.includes('lat'));
    const descIdx = headers.findIndex((h) => h.includes('desc') || h.includes('detail'));

    const parsed: Partial<TacticalZone>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 2) continue;

      const name = nameIdx !== -1 ? cols[nameIdx] : cols[0];
      if (!name) continue;

      const rawLevel = (levelIdx !== -1 ? cols[levelIdx] : 'high').toLowerCase();
      const dangerLevel = (['critical', 'high', 'medium', 'low'].includes(rawLevel) ? rawLevel : 'high') as TacticalZone['dangerLevel'];
      const lng = lngIdx !== -1 ? parseFloat(cols[lngIdx]) || -118.3 : -118.3;
      const lat = latIdx !== -1 ? parseFloat(cols[latIdx]) || 34.05 : 34.05;
      const desc = descIdx !== -1 ? cols[descIdx] : 'Rapidly evolving emergency condition.';

      // Generate polygon around center point with approx 0.04 deg offset
      const coordinates = [[
        [lng - 0.02, lat - 0.02],
        [lng + 0.02, lat - 0.02],
        [lng + 0.02, lat + 0.02],
        [lng - 0.02, lat + 0.02],
        [lng - 0.02, lat - 0.02],
      ]];

      parsed.push({
        name,
        dangerLevel,
        geometry: { type: 'Polygon', coordinates },
        description: desc,
        active: true,
      });
    }
    return parsed;
  }

  // --- RESOURCES ---
  public getResources(): TacticalResource[] {
    return [...this.resources];
  }

  public getResourceById(id: string): TacticalResource | undefined {
    return this.resources.find((r) => r._id === id);
  }

  public createResource(data: Partial<TacticalResource>): TacticalResource {
    const id = data._id || `hub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const hub: TacticalResource = {
      _id: id,
      name: data.name || 'Emergency Resource Staging Hub',
      location: data.location || { type: 'Point', coordinates: [-118.25, 34.05] },
      capacity: Number(data.capacity) || 5000,
      resources: data.resources || [
        { _id: `item-${Date.now()}`, type: 'Potable Drinking Water', quantity: 2000, unit: 'Liters', lastUpdated: new Date().toISOString() },
      ],
    };
    this.resources.unshift(hub);
    return hub;
  }

  public deleteResource(id: string): boolean {
    const idx = this.resources.findIndex((r) => r._id === id);
    if (idx === -1) return false;
    this.resources.splice(idx, 1);
    return true;
  }

  public deleteAllResources(): number {
    const count = this.resources.length;
    this.resources = [];
    return count;
  }

  public bulkCreateResources(items: Partial<TacticalResource>[]): TacticalResource[] {
    const created: TacticalResource[] = [];
    for (const item of items) {
      if (item.name) {
        created.push(this.createResource(item));
      }
    }
    return created;
  }

  public parseResourceCSV(csvText: string): Partial<TacticalResource>[] {
    const lines = csvText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length <= 1) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('hub'));
    const lngIdx = headers.findIndex((h) => h.includes('lng') || h.includes('lon'));
    const latIdx = headers.findIndex((h) => h.includes('lat'));
    const typeIdx = headers.findIndex((h) => h.includes('type') || h.includes('item'));
    const qtyIdx = headers.findIndex((h) => h.includes('qty') || h.includes('quantity'));
    const unitIdx = headers.findIndex((h) => h.includes('unit'));
    const capIdx = headers.findIndex((h) => h.includes('capacity'));

    const parsed: Partial<TacticalResource>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 2) continue;

      const name = nameIdx !== -1 ? cols[nameIdx] : cols[0];
      if (!name) continue;

      const lng = lngIdx !== -1 ? parseFloat(cols[lngIdx]) || -118.25 : -118.25;
      const lat = latIdx !== -1 ? parseFloat(cols[latIdx]) || 34.05 : 34.05;
      const type = typeIdx !== -1 ? cols[typeIdx] : 'Emergency Supply Units';
      const qty = qtyIdx !== -1 ? parseInt(cols[qtyIdx]) || 500 : 500;
      const unit = unitIdx !== -1 ? cols[unitIdx] : 'Packs';
      const capacity = capIdx !== -1 ? parseInt(cols[capIdx]) || 5000 : 5000;

      parsed.push({
        name,
        location: { type: 'Point', coordinates: [lng, lat] },
        capacity,
        resources: [
          { _id: `item-${Date.now()}-${i}`, type, quantity: qty, unit, lastUpdated: new Date().toISOString() },
        ],
      });
    }
    return parsed;
  }

  // --- RESPONDERS ---
  public getResponders(): TacticalResponder[] {
    return [...this.responders];
  }

  public getResponderById(id: string): TacticalResponder | undefined {
    return this.responders.find((r) => r._id === id);
  }

  public createResponder(data: Partial<TacticalResponder>): TacticalResponder {
    const id = data._id || `resp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const resp: TacticalResponder = {
      _id: id,
      name: data.name || 'Tactical Disaster Responder',
      role: data.role || 'medic',
      status: data.status || 'active',
      location: data.location || { type: 'Point', coordinates: [-118.25, 34.05] },
      batteryPct: Number(data.batteryPct) || 90,
      lastPing: new Date().toISOString(),
    };
    this.responders.unshift(resp);
    return resp;
  }

  public deleteResponder(id: string): boolean {
    const idx = this.responders.findIndex((r) => r._id === id);
    if (idx === -1) return false;
    this.responders.splice(idx, 1);
    return true;
  }

  public deleteAllResponders(): number {
    const count = this.responders.length;
    this.responders = [];
    return count;
  }

  public bulkCreateResponders(items: Partial<TacticalResponder>[]): TacticalResponder[] {
    const created: TacticalResponder[] = [];
    for (const item of items) {
      if (item.name) {
        created.push(this.createResponder(item));
      }
    }
    return created;
  }

  public parseResponderCSV(csvText: string): Partial<TacticalResponder>[] {
    const lines = csvText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length <= 1) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('responder'));
    const roleIdx = headers.findIndex((h) => h.includes('role') || h.includes('specialty'));
    const statusIdx = headers.findIndex((h) => h.includes('status'));
    const lngIdx = headers.findIndex((h) => h.includes('lng') || h.includes('lon'));
    const latIdx = headers.findIndex((h) => h.includes('lat'));
    const batIdx = headers.findIndex((h) => h.includes('battery') || h.includes('power'));

    const parsed: Partial<TacticalResponder>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 2) continue;

      const name = nameIdx !== -1 ? cols[nameIdx] : cols[0];
      if (!name) continue;

      const rawRole = (roleIdx !== -1 ? cols[roleIdx] : 'medic').toLowerCase().replace(/\s+/g, '_');
      const validRoles = ['medic', 'firefighter', 'rescue_diver', 'drone_pilot', 'k9_search', 'hazmat_tech', 'logistics'] as const;
      const role = (validRoles.find((r) => r === rawRole) || 'medic') as TacticalResponder['role'];

      const rawStatus = (statusIdx !== -1 ? cols[statusIdx] : 'active').toLowerCase().replace(/\s+/g, '_');
      const validStatuses = ['active', 'en_route', 'resting', 'standby'] as const;
      const status = (validStatuses.find((s) => s === rawStatus) || 'active') as TacticalResponder['status'];

      const lng = lngIdx !== -1 ? parseFloat(cols[lngIdx]) || -118.25 : -118.25;
      const lat = latIdx !== -1 ? parseFloat(cols[latIdx]) || 34.05 : 34.05;
      const batteryPct = batIdx !== -1 ? parseInt(cols[batIdx]) || 90 : 90;

      parsed.push({
        name,
        role,
        status,
        location: { type: 'Point', coordinates: [lng, lat] },
        batteryPct,
      });
    }
    return parsed;
  }
}

export const emergencyStore = new EmergencyStore();
