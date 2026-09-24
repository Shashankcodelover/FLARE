export interface MockZone {
  _id: string;
  name: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  active: boolean;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface MockResourceHub {
  _id: string;
  name: string;
  capacity: number;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  resources: Array<{
    _id?: string;
    category: 'food' | 'medical' | 'personnel' | 'equipment';
    name: string;
    quantity: number;
    unit: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export const inMemoryZones: MockZone[] = [
  {
    _id: 'zone-alpha-001',
    name: 'Wildfire Zone Alpha',
    description: 'Active wildfire spreading northeast',
    severity: 'critical',
    active: true,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-118.5, 34.1], [-118.3, 34.1], [-118.3, 34.3],
        [-118.5, 34.3], [-118.5, 34.1],
      ]],
    },
  },
  {
    _id: 'zone-beta-002',
    name: 'Flood Zone Beta',
    description: 'Flash flood warning in valley',
    severity: 'high',
    active: true,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-87.7, 41.8], [-87.5, 41.8], [-87.5, 42.0],
        [-87.7, 42.0], [-87.7, 41.8],
      ]],
    },
  },
  {
    _id: 'zone-gamma-003',
    name: 'Evacuation Zone C',
    description: 'Mandatory evacuation order',
    severity: 'medium',
    active: true,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-73.95, 40.7], [-73.85, 40.7], [-73.85, 40.8],
        [-73.95, 40.8], [-73.95, 40.7],
      ]],
    },
  },
];

export const inMemoryHubs: MockResourceHub[] = [
  {
    _id: 'hub-la-001',
    name: 'LA Emergency Depot',
    capacity: 500,
    location: { type: 'Point', coordinates: [-118.25, 34.05] },
    resources: [
      { _id: 'item-1', category: 'food', name: 'MRE Packs', quantity: 2000, unit: 'units' },
      { _id: 'item-2', category: 'medical', name: 'First Aid Kits', quantity: 150, unit: 'kits' },
    ],
  },
  {
    _id: 'hub-chi-002',
    name: 'Chicago Relief Center',
    capacity: 300,
    location: { type: 'Point', coordinates: [-87.63, 41.88] },
    resources: [
      { _id: 'item-3', category: 'personnel', name: 'Volunteers', quantity: 80, unit: 'people' },
      { _id: 'item-4', category: 'equipment', name: 'Generators', quantity: 12, unit: 'units' },
    ],
  },
  {
    _id: 'hub-nyc-003',
    name: 'NYC Coordination Hub',
    capacity: 800,
    location: { type: 'Point', coordinates: [-74.0, 40.71] },
    resources: [
      { _id: 'item-5', category: 'medical', name: 'Ventilators', quantity: 25, unit: 'units' },
      { _id: 'item-6', category: 'food', name: 'Water Bottles', quantity: 10000, unit: 'bottles' },
    ],
  },
];
