# Product Requirements Document (PRD)
## Project FLARE (Mirage) — Decentralized Disaster Response Resource Geofencing System

**Document Version:** 2.0.0  
**Status:** In Progress / Modernization Overhaul  
**Target Architecture:** Turborepo Monorepo (`apps/web`, `apps/server`, `packages/ui`, `packages/crdt-logic`, `packages/shared-types`)

---

## 1. Executive Summary & Problem Statement

During catastrophic disasters (hurricanes, earthquakes, wildfires), centralized telecommunication infrastructure frequently collapses. First responders, incident commanders, and volunteer logistics teams face:
- Total cloud connectivity dropouts and high packet loss.
- Inability to safely coordinate hazard perimeters (danger zones / toxic plumes).
- Supply chain race conditions (double allocation of emergency aid like blood, water, food).
- Cluttered, stress-inducing interfaces that degrade tactical awareness in low-visibility or high-glare environments.

**FLARE (Fast Localized Autonomous Response Engine)** resolves this by combining:
1. **Decentralized P2P Mesh (WebRTC DataChannels + Yjs CRDTs):** Conflict-free local data synchronization without internet access.
2. **High-Precision Geospatial Geofencing:** Client-side ray-casting and server 2dsphere indexing for instant perimeter breach detection.
3. **Prism Glass & Tactical High-Contrast Design System:** Ergonomic, high-visibility UI with role-based specialized workspaces (HQ Command, Field Responder, Logistics Sync).
4. **Resilient Mission-Critical UX:** 5-second undo dispatch safety buffers, gesture-based Slide-to-SOS emergency beacons, and voice-assisted commands.

---

## 2. Personas & Core Workspaces

### 2.1 The Dynamic Role Gateway (Splash Screen)
Upon launching the application, users are greeted with a high-fidelity tactical splash screen allowing immediate entry into their designated operational role or seamless role-switching:
- **Card 1: Field Responder:** Mobile-first, map-centric view with live GPS HUD, P2P mesh radio status, fast SOS slide trigger, and peer discovery.
- **Card 2: HQ Command:** Tactical command center with polygon danger zone drawing tools, incident severity management, breach alert toasts, and Node.js 22 runtime permission audits.
- **Card 3: Logistics Coordinator:** Conflict-free CRDT inventory tables (water, medical, food, power), real-time stock sync with peer conflict resolution, and Redis pub/sub cluster health monitor.

### 2.2 Operational Views
1. **HQ Command Deck:**
   - Interactive drawing controls for danger zones & evacuation corridors.
   - Global responder tracking and situational telemetry.
   - Automated FEMA ICS-209 Situation Report (SITREP) generator.
2. **Field Responder Workspace:**
   - Full-bleed tactical map with high-visibility responder pins.
   - P2P Mesh status overlay (active radio channels, direct WebRTC connections).
   - Instant emergency beacon (Slide-to-SOS) with 5s cancel buffer.
3. **Logistics Sync Hub:**
   - Frosted real-time supply inventory grid with state-based badges.
   - CRDT conflict-free merge visualizer (Yjs Y.Doc state vectors).
   - Redis horizontal adapter and message latency telemetry.

---

## 3. Design System & Aesthetics: "Prism Glass" & Tactical Clarity

### 3.1 Design Principles
- **Dual Aesthetic Support:**
  - **Prism Glass (Light & Dark):** Modern frosted glassmorphism (`backdrop-filter: blur(20px)`), luminous borders (`border: 1px solid rgba(255,255,255,0.8)` in light, `rgba(255,255,255,0.08)` in dark), dynamic gradients, and refined shadows.
  - **Tactical High-Contrast (OLED Black):** High-visibility stark pure black (`#000000`), neon green (`#00ff00`), and hazardous amber/crimson accents for sunlight readability and zero OLED battery drain.
- **Typography:**
  - Headings & Accents: `Space Grotesk`, uppercase tracking (`letter-spacing: 0.05em`).
  - Data / Coordinates / Telemetry: `JetBrains Mono` or tabular monospace.
  - Body & Form Controls: `Inter`, system-ui.
- **Micro-Interactions & Motion:**
  - Framer Motion transitions for alert toasts, modal overlays, drawer toggles, and coordinate HUD updates.
  - Haptic feedback (Vibration API) on critical events (SOS, warning, dispatch tap).

---

## 4. Technical Architecture & Component Hierarchy

### 4.1 Monorepo Structure
```
├── apps/
│   ├── web/                    # React 19 + Vite frontend client
│   │   ├── src/
│   │   │   ├── components/     # Specialized tactical widgets & panels
│   │   │   │   ├── gateway/    # Role Gateway / Splash Screen components
│   │   │   │   ├── hq/         # HQ Command Deck widgets & drawing tools
│   │   │   │   ├── responder/  # Field Responder HUD & SOS controls
│   │   │   │   ├── logistics/  # Logistics CRDT inventory & sync views
│   │   │   │   └── common/     # Headers, stats bar, sitrep modal
│   │   │   ├── hooks/          # useTheme, useSocket, useVolunteerSim
│   │   │   ├── styles/         # CSS variables, prism glass utilities
│   │   │   └── App.tsx         # Clean routing & state orchestrator
│   └── server/                 # Express + Socket.io + Redis + Mongoose API
├── packages/
│   ├── crdt-logic/             # Yjs CRDT synchronization & WebRTC mesh
│   ├── shared-types/           # Shared TypeScript interfaces & schemas
│   └── ui/                     # Reusable Prism Glass UI components
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       ├── StatusDot.tsx
│       ├── Modal.tsx
│       └── Tabs.tsx
```

---

## 5. Non-Functional Requirements & Performance
- **Zero-Crash Resiliency:** Strict error boundaries wrapped around Leaflet map instances and WebRTC streams.
- **Bundle Optimization:** Code splitting with Vite, lazy loading of heavy geospatial modules.
- **Responsive Layouts:** Seamless adaptation from ultra-wide HQ command displays (2560px+) down to handheld rugged field responder phones (360px).
- **Accessibility:** Full WCAG 2.1 AA compliance, high contrast mode, keyboard navigability, ARIA landmarks, and multi-language support (50+ locales).

---

## 6. Implementation Roadmap & Milestones
- **Phase 1: Design System & Shared UI Tokens:** Modernize `packages/ui` and `apps/web/src/index.css` with cohesive Prism Glass tokens.
- **Phase 2: Global Architecture & Role Gateway:** Introduce the Dynamic Role Splash Gateway and decouple `App.tsx` into modular role views.
- **Phase 3: Core Workspace Refactoring:**
  - Modernize HQ Command Deck (Leaflet drawing, alerts, FEMA briefing).
  - Modernize Field Responder View (live HUD, WebRTC peer list, SOS gesture).
  - Modernize Logistics Sync Hub (Yjs CRDT table, stock operations, Redis stats).
- **Phase 4: Animations, Polish & Accessibility:** Framer Motion spring physics, haptics, dark/light/contrast toggle, keyboard navigation.
- **Phase 5: Codebase Quality, Types & Verification:** Strict type check, production build validation, and CodeRabbit pre-commit audit.
