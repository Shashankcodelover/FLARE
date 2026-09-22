/**
 * Local copy of constants from @mirage/shared-types.
 *
 * Duplicated here so that @vercel/node's ncc bundler can resolve them
 * without needing to traverse monorepo workspace symlinks to
 * packages/shared-types/dist at bundle time.
 *
 * Keep in sync with packages/shared-types/src/constants.ts.
 */

export const SOCKET_EVENTS = {
  // Geofencing
  ZONE_ENTER: 'zone:enter',
  ZONE_EXIT: 'zone:exit',
  ZONE_UPDATED: 'zone:updated',
  ZONE_CREATED: 'zone:created',

  // Resources
  RESOURCE_UPDATED: 'resource:updated',
  RESOURCE_CREATED: 'resource:created',
  RESOURCE_DELETED: 'resource:deleted',

  // P2P / CRDT sync
  CRDT_UPDATE: 'crdt:update',
  PEER_OFFER: 'peer:offer',
  PEER_ANSWER: 'peer:answer',
  PEER_ICE: 'peer:ice',
  PEER_JOINED: 'peer:joined',
  PEER_LEFT: 'peer:left',

  // System
  ALERT: 'alert',
} as const;

export const RESOURCE_CATEGORIES = ['food', 'medical', 'personnel', 'equipment'] as const;

export const ZONE_SEVERITY = ['low', 'medium', 'high', 'critical'] as const;
