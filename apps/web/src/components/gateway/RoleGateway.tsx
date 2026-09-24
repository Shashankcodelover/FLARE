import { motion } from 'framer-motion';
import { Card, Button, Badge, StatusDot } from '@mirage/ui';
import { useAppTheme } from '../../hooks/ThemeContext';

export type OperationalRole = 'responder' | 'hq' | 'logistics';

interface RoleGatewayProps {
  onSelectRole: (role: OperationalRole) => void;
  connected: boolean;
  peerCount: number;
  activeZonesCount: number;
}

export function RoleGateway({
  onSelectRole,
  connected,
  peerCount,
  activeZonesCount,
}: RoleGatewayProps) {
  const { themeMode, toggleTheme } = useAppTheme();

  const roles = [
    {
      id: 'responder' as OperationalRole,
      title: 'Field Responder',
      badge: 'OFFLINE MESH CAPABLE',
      variant: 'tactical-green' as const,
      accentBorder: 'border-emerald-500/50 hover:border-emerald-500',
      accentGlow: 'hover:shadow-emerald-500/20',
      description:
        'Access the offline tactical map, broadcast live GPS telemetry, establish direct WebRTC data mesh channels, and trigger emergency SOS beacons.',
      buttonText: 'Activate Mesh Client',
      buttonVariant: 'tactical-green' as const,
      icon: '🛰️',
      features: ['Live GPS Telemetry HUD', 'WebRTC P2P DataMesh', 'Slide-to-SOS Beacon'],
    },
    {
      id: 'hq' as OperationalRole,
      title: 'HQ Command',
      badge: 'TACTICAL INCIDENT DESK',
      variant: 'tactical-orange' as const,
      accentBorder: 'border-orange-500/50 hover:border-orange-500',
      accentGlow: 'hover:shadow-orange-500/20',
      description:
        'Map global geofences, draw hazard evacuation perimeters, dispatch tactical volunteer units, monitor breaches, and generate FEMA ICS-209 SITREPs.',
      buttonText: 'Enter HQ Command',
      buttonVariant: 'tactical-orange' as const,
      icon: '🛡️',
      features: ['Polygon Geofence Editor', 'Breach Detection Toasts', 'FEMA SITREP Briefing'],
    },
    {
      id: 'logistics' as OperationalRole,
      title: 'Logistics Sync',
      badge: 'CRDT CONFLICT-FREE SYNC',
      variant: 'tactical-yellow' as const,
      accentBorder: 'border-amber-500/50 hover:border-amber-500',
      accentGlow: 'hover:shadow-amber-500/20',
      description:
        'Coordinate emergency supply inventories, verify Yjs CRDT state vectors, resolve supply race conditions, and monitor Redis pub/sub horizontal clusters.',
      buttonText: 'Open Logistics Deck',
      buttonVariant: 'tactical-yellow' as const,
      icon: '📦',
      features: ['Yjs Y.Doc Ledger', 'Conflict-Free Auto Merge', 'Redis Cluster Metrics'],
    },
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden p-4 sm:p-8 transition-colors duration-300">
      {/* Background Ambient Glow & Scanline */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-500/10 blur-[100px]" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-orange-500/10 blur-[120px]" />
        <div className="scanline-overlay opacity-30" />
      </div>

      {/* Top Bar with Brand & Mode Switcher */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 via-emerald-600 to-sky-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-500/20">
            FL
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight font-tactical">
                PROJECT FLARE
              </h1>
              <Badge variant="tactical-orange" dot>
                v2.0 TACTICAL
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Decentralized Disaster Response & Geofencing System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="glass"
            size="sm"
            onClick={toggleTheme}
            className="text-xs font-semibold capitalize"
          >
            {themeMode === 'light' ? '☀️ Light' : themeMode === 'dark' ? '🌙 Dark' : '⚡ OLED'}
          </Button>
        </div>
      </header>

      {/* Hero Header Section */}
      <main className="w-full max-w-7xl mx-auto my-auto py-8 sm:py-12 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mb-10 sm:mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel text-xs font-semibold mb-4 text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            MISSION DISPATCH GATEWAY — SELECT OPERATIONAL INTERFACE
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight font-tactical mb-4">
            Resilient Field Coordination <br />
            <span className="gradient-text">Under Complete Network Blackout</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Peer-to-peer WebRTC CRDT synchronization eliminates single points of failure.
            Choose your specialized role deck to initialize geospatial geofences, monitor mesh nodes,
            or allocate disaster relief supplies.
          </p>
        </motion.div>

        {/* 3-Card Role Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
          {roles.map((role, idx) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              whileHover={{ y: -6 }}
              className="flex"
            >
              <Card
                variant="glass"
                className={`flex-1 flex flex-col justify-between p-6 sm:p-7 border-2 transition-all duration-300 ${role.accentBorder} ${role.accentGlow}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 shadow-inner">
                      {role.icon}
                    </span>
                    <Badge variant={role.variant}>
                      {role.badge}
                    </Badge>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold font-tactical text-slate-900 dark:text-white mb-2">
                    {role.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                    {role.description}
                  </p>

                  <div className="space-y-2 mb-6 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Deck Capabilities
                    </div>
                    {role.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        <span className="text-emerald-500 font-bold">✓</span>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  variant={role.buttonVariant}
                  size="lg"
                  className="w-full font-bold shadow-lg"
                  onClick={() => onSelectRole(role.id)}
                >
                  {role.buttonText} →
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Bottom Live System Telemetry Bar */}
      <footer className="w-full max-w-7xl mx-auto pt-6 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-6">
          <StatusDot
            status={connected ? 'online' : 'offline'}
            label={connected ? 'Central Uplink Active' : 'Offline / Standalone Mesh'}
          />
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
          <span className="font-mono">
            🛰️ P2P Radio Peers: <strong className="text-slate-800 dark:text-slate-200">{peerCount} Connected</strong>
          </span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
          <span className="font-mono">
            ⚠️ Active Danger Zones: <strong className="text-slate-800 dark:text-slate-200">{activeZonesCount}</strong>
          </span>
        </div>

        <div className="font-mono text-[11px] text-slate-400">
          Node 22 Permitted • Yjs CRDT v13 • WebRTC DataChannel
        </div>
      </footer>
    </div>
  );
}
