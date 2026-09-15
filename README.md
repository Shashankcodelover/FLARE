# Decentralized Disaster Response System (Project Mirage)

A state-of-the-art emergency management platform designed for resilient coordination during natural disasters when centralized cloud and cellular infrastructure fail.

## 🚀 Key Features

- **Real-time Geofencing Engine**: Automated alerts when responders enter or exit critical danger zones using MongoDB Geospatial (`2dsphere`) indexing.
- **Offline-First P2P Mesh Sync**: Resilient peer-to-peer data synchronization over WebRTC DataChannels using **Yjs CRDTs** (Conflict-free Replicated Data Types).
- **Interactive Command Dashboard**: Live Leaflet map visualization of hazard zones, active responders, resource hubs, and AI-optimized evacuation routes.
- **Mission-Critical Crash Resilience**: Protected by a top-level **React Error Boundary** with automated recovery diagnostics, preventing full dashboard outages during crisis operations.
- **AI-Assisted Dispatch & SITREP**: Intelligent volunteer resource simulation and automatic FEMA Situation Briefing generation.

## 🛠 Tech Stack

- **Monorepo Architecture**: Turborepo, npm workspaces (`apps/server`, `apps/web`, `packages/*`)
- **Frontend**: React 19, TypeScript, Tailwind CSS, Framer Motion, Leaflet Maps, Yjs
- **Backend API**: Node.js v22, Express, Socket.io, Mongoose (MongoDB 2dsphere), Pino
- **Resilience Layer**: WebRTC P2P DataChannels, Yjs CRDT logic, React Error Boundaries

## 📦 Monorepo Structure

```text
Decentralized-Disaster-Response-Resource-Geofencing-System/
├── apps/
│   ├── server/           # Express API, Socket.io, MongoDB models & AI services
│   └── web/              # React 19 Leaflet dashboard, P2P mesh hook & Error Boundary
└── packages/
    ├── crdt-logic/       # Yjs CRDT synchronization helpers & useP2PSync hook
    ├── shared-types/     # TypeScript interfaces & socket event constants
    ├── shared/           # Reserved workspace package container
    └── ui/               # Shared UI component library (Badge, Button, Card, StatusDot)
```

## ⚡ Quick Start

### Prerequisites
- Node.js >= 22.0.0
- npm >= 10.0.0
- MongoDB running locally or accessible via URI

### Installation & Run

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

3. **Start development mode**:
   ```bash
   npm run dev
   ```

4. **Build production bundles**:
   ```bash
   npm run build
   ```

## 🌐 Vision

Providing a decentralized, open-source infrastructure for humanitarian organizations to coordinate life-saving efforts without relying on single points of failure.

<!-- Deployment trigger: 2026-09-15 21:12:22 -->
