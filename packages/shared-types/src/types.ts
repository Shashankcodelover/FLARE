import type { RESOURCE_CATEGORIES, ZONE_SEVERITY } from './constants';

// GeoJSON types
export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

// Danger Zone
export interface DangerZone {
  _id: string;
  name: string;
  description?: string;
  geometry: GeoPolygon;
  severity: (typeof ZONE_SEVERITY)[number];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Resource Hub
export interface ResourceHub {
  _id: string;
  name: string;
  location: GeoPoint;
  address?: string;
  capacity: number;
  resources: ResourceItem[];
  createdAt: string;
  updatedAt: string;
}

// Resource Item
export interface ResourceItem {
  _id: string;
  hubId: string;
  category: (typeof RESOURCE_CATEGORIES)[number];
  name: string;
  quantity: number;
  unit: string;
  lastUpdated: string;
}

// User / Responder
export interface Responder {
  _id: string;
  name: string;
  role: 'coordinator' | 'field_agent' | 'volunteer';
  location?: GeoPoint;
  online: boolean;
}

// Alert
export interface GeofenceAlert {
  type: 'enter' | 'exit';
  zoneId: string;
  zoneName: string;
  responderId: string;
  timestamp: string;
}

// CRDT Sync Payload
export interface CRDTSyncPayload {
  docId: string;
  update: Uint8Array;
  peerId: string;
  timestamp: number;
}

// WebRTC Signaling
export interface SignalPayload {
  from: string;
  to: string;
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

// User Auth & Profile
export interface UserProfile {
  name: string;
  phone?: string;
  bio?: string;
}

export interface User {
  _id: string;
  email: string;
  role: 'admin' | 'hq' | 'responder' | 'logistics' | 'demo';
  profile: UserProfile;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

