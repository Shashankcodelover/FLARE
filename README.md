# Decentralized Disaster Response & Resource Geofencing System (Project Mirage)

A disaster response coordination platform providing geospatial geofencing, peer-to-peer data synchronization, resource inventory tracking, and interactive mapping for emergency operations.

---

## Key Features

### Geospatial Geofencing & Mapping
- **Geofence Detection**: Evaluates responder coordinates against active hazard zones using MongoDB `2dsphere` geospatial indexing (`$geoIntersects`) and in-memory ray-casting algorithms.
- **Real-Time Alerts**: Emits geofence entry and exit events over Socket.io to floating alert banners and a persistent alert log.
- **Interactive Geofence Drawing**: Allows coordinators and administrators to draw custom polygon hazard boundaries directly on the Leaflet map and persist them to the database.
- **Hazard-Aware Route Planning**: Calculates evacuation paths using Dijkstra's shortest path algorithm across a coordinate grid, penalizing routes through danger zones and offering an accessible route toggle for wheelchair clearance.

### P2P Synchronization & Offline Support
- **WebRTC DataChannel Sync**: Synchronizes shared state between connected peers using Yjs Conflict-free Replicated Data Types (CRDTs).
- **Signaling Relay**: Relays WebRTC session descriptions (offer, answer, ICE candidates) and CRDT delta updates through Socket.io when online.
- **Service Worker Tile Caching**: Caches application assets and map raster tiles (CartoDB, OpenStreetMap) via a Service Worker using a stale-while-revalidate strategy for offline map availability.
- **Mesh Topology Display**: Visualizes connected WebRTC peer nodes, central server connection status, and round-trip ping estimates in an SVG graph.

### Logistics & Incident Briefing
- **Resource Depots**: Tracks inventory quantities across categories (food, medical, personnel, equipment) with stock level visualization and low-quantity alerts.
- **Depletion Burn Forecasts**: Computes estimated consumption rates and hours remaining per supply item based on active responders and adjacent threat severities.
- **FEMA Incident Briefings**: Generates formatted FEMA ICS-201 / ICS-214 Situation Briefing reports signed with SHA-256 HMAC cryptographic checksums.

### Responder Coordination & Accessibility
- **Volunteer Simulation**: Tracks volunteer positions, skills, statuses (standby, moving, in-zone), and zone staffing needs, with manual dispatch and recall controls.
- **Undo Buffer**: Provides a 5-second countdown timer allowing operators to cancel accidental dispatch or recall commands.
- **Emergency SOS Trigger**: Includes a slide-to-activate swipe gesture for high-priority SOS emergency broadcasts.
- **Voice Commands**: Processes spoken instructions through the Web Speech API to trigger emergency alerts, toggle themes, clear feeds, and dispatch responders.
- **Accessible UI & Localization**: Supports high-contrast tactical and glassmorphism display modes, text scaling, haptic vibration feedback, and translations across 9 languages with RTL support for Arabic.
- **Crash Recovery Boundary**: Catches rendering failures with a root React Error Boundary that displays stack diagnostics, provides clipboard export, and offers reset options.

### Security & Observability
- **Role-Based Access Control**: Validates JSON Web Tokens (JWT) on mutating endpoints with role enforcement (`admin`, `coordinator`, `field_agent`, `responder`, `viewer`).
- **Input Validation & Sanitization**: Validates payloads with Zod schemas and recursively strips NoSQL operator injection patterns from requests.
- **Logging & Metrics**: Emits structured JSON logs via Pino with request IDs and exposes Prometheus-compatible metrics at `/metrics`.

---

## Tech Stack

- **Monorepo**: Turborepo, npm workspaces
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Leaflet, React-Leaflet, Yjs
- **Backend API**: Node.js, Express 5, Socket.io, Mongoose (MongoDB 7 `2dsphere`), Redis (`ioredis`, `@socket.io/redis-adapter`), Pino, Helmet, Zod, jsonwebtoken
- **Infrastructure**: Docker, Docker Compose, Nginx (Alpine)

---

## Monorepo Structure

```text
Decentralized-Disaster-Response-Resource-Geofencing-System/
├── apps/
│   ├── server/           # Express API, Socket.io server, MongoDB models, Dockerfile
│   └── web/              # React Leaflet dashboard, Service Worker, Nginx SPA config, Dockerfile
├── packages/
│   ├── crdt-logic/       # Yjs CRDT synchronization helpers and useP2PSync hook
│   ├── shared-types/     # TypeScript interfaces and socket event constants
│   ├── shared/           # Shared package workspace placeholder
│   └── ui/               # Shared UI components (Badge, Button, Card, StatusDot)
├── docker-compose.yml    # Multi-container orchestration (API, Web, Mongo, Redis)
├── SETUP.md              # Environment configuration and file inventory
└── EXPLAINER.md          # Architecture and design notes
```

---

## Quick Start

### Option 1: Docker Compose

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Build and start containers
docker-compose up -d --build
```

- **Web Dashboard**: `http://localhost:3000`
- **API Health Check**: `http://localhost:4000/health`
- **Prometheus Metrics**: `http://localhost:4000/metrics`

### Option 2: Local Development

Prerequisites: Node.js >= 22, running instances of MongoDB (port `27017`) and Redis (port `6379`).

```bash
# 1. Install dependencies
npm install

# 2. Start all workspaces in dev mode
npm run dev

# 3. Seed initial hazard zones and resource depots (optional)
npm --workspace=@mirage/api run dev src/seed.ts

# 4. Build all workspaces
npm run build
```

---

## Primary API Routes

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server and MongoDB connection status |
| `GET` | `/metrics` | Prometheus performance metrics |
| `POST` | `/api/v1/auth/token` | Issues demo JWT for role-based authentication |
| `GET` | `/api/v1/zones` | Fetches active danger zones (supports `?bbox=` query) |
| `POST` | `/api/v1/zones` | Creates a new danger zone (requires auth) |
| `GET` | `/api/v1/resources` | Lists resource hubs (supports `?lng=&lat=&maxDistance=` query) |
| `PATCH` | `/api/v1/resources/:hubId/items/:itemId` | Updates inventory stock quantity |
| `POST` | `/api/v1/geofence/check` | Checks point intersection against active danger zones |
| `POST` | `/api/v1/ai/optimal-route` | Calculates Dijkstra path around active hazard zones |
| `GET` | `/api/v1/ai/predictive-burn` | Returns estimated resource depletion rates |
| `GET` | `/api/v1/ai/sitrep` | Generates FEMA ICS-201 Incident Situation Briefing report |
| `GET` | `/api/v1/comms/messages/:zoneId` | Returns recent zone communications |
| `POST` | `/api/v1/comms/messages` | Broadcasts priority communication message |

---

## Documentation

- 📖 **[SETUP.md](SETUP.md)**: Detailed environment variable guide and workspace inventory.
- 📖 **[EXPLAINER.md](EXPLAINER.md)**: Architecture notes on geofencing, CRDTs, and WebRTC mesh sync.
