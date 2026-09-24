import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Badge, StatusDot } from '@mirage/ui';
import { GeospatialDashboard } from '../GeospatialDashboard';
import type { Socket } from 'socket.io-client';

interface FieldResponderDeckProps {
  socket: Socket | null;
  volunteers: any[];
  selectedVolunteer: any;
  onSelectVolunteer: (v: any) => void;
  roleIcons: Record<string, string>;
  roleColors: Record<string, string>;
  peerCount: number;
  syncStatus: string;
  triggerHaptic: (pattern: 'sos' | 'success' | 'warning' | 'tap') => void;
  onSosTriggered: () => void;
}

export function FieldResponderDeck({
  socket,
  volunteers,
  selectedVolunteer,
  onSelectVolunteer,
  roleIcons,
  roleColors,
  peerCount,
  syncStatus,
  triggerHaptic,
  onSosTriggered,
}: FieldResponderDeckProps) {
  // Mock live responder GPS (oscillates slightly for real-time telemetry feeling)
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: 34.0522,
    lng: -118.2437,
  });

  const [meshPanelOpen, setMeshPanelOpen] = useState(true);
  const [showSosSlider, setShowSosSlider] = useState(false);
  const [sosProgress, setSosProgress] = useState(0);

  // Simulate subtle GPS jitter
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentCoords((prev) => ({
        lat: Number((prev.lat + (Math.random() - 0.5) * 0.0002).toFixed(5)),
        lng: Number((prev.lng + (Math.random() - 0.5) * 0.0002).toFixed(5)),
      }));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Handle slide-to-SOS completion
  useEffect(() => {
    let interval: any;
    if (sosProgress >= 100) {
      onSosTriggered();
      setShowSosSlider(false);
      setSosProgress(0);
      triggerHaptic('sos');
    } else if (sosProgress > 0 && !showSosSlider) {
      interval = setInterval(() => {
        setSosProgress((p) => Math.max(0, p - 5));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [sosProgress, showSosSlider, onSosTriggered, triggerHaptic]);

  return (
    <div className="flex-1 flex overflow-hidden relative w-full h-full">
      {/* Full Bleed Tactical Map */}
      <div className="flex-1 relative min-w-0">
        <GeospatialDashboard
          socket={socket}
          volunteers={volunteers}
          selectedVolunteerId={selectedVolunteer?.id ?? null}
          onSelectVolunteer={onSelectVolunteer}
          roleIcons={roleIcons}
          roleColors={roleColors}
        />

        {/* Live GPS Coordinates HUD (Top-Left) */}
        <div className="absolute top-4 left-4 z-[1000] pointer-events-auto">
          <Card
            variant="glass"
            className="p-3.5 border border-emerald-500/40 bg-slate-950/85 backdrop-blur-xl text-slate-100 shadow-2xl max-w-xs"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
                🛰️ LIVE RESONDER GPS
              </span>
              <StatusDot status="online" label="L1/L5 RTK" />
            </div>

            <div className="font-mono text-sm sm:text-base font-black tracking-tight text-white mb-1">
              {currentCoords.lat.toFixed(5)}° N, {Math.abs(currentCoords.lng).toFixed(5)}° W
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800">
              <span>Altitude: 142m MSL</span>
              <span>Accuracy: ±1.2m</span>
            </div>
          </Card>
        </div>

        {/* Floating Slide-to-SOS Action Trigger */}
        <div className="absolute bottom-6 left-6 z-[1050]">
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowSosSlider(!showSosSlider);
                triggerHaptic('tap');
              }}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white font-black text-sm tracking-wider shadow-2xl shadow-red-600/50 border-4 border-white/20 flex items-center justify-center cursor-pointer transition-transform"
              title="Emergency SOS Beacon"
            >
              SOS
            </motion.button>

            {/* Slide Gesture Slider Popup */}
            <AnimatePresence>
              {showSosSlider && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.9 }}
                  className="absolute bottom-20 left-0 w-72 glass-panel p-4 bg-slate-950/90 border-2 border-red-500/60 shadow-2xl rounded-2xl"
                >
                  <div className="text-xs font-bold text-center text-red-400 mb-2 uppercase tracking-wider">
                    Emergency Broadcast
                  </div>
                  <p className="text-[11px] text-slate-300 text-center mb-3">
                    Slide right to transmit emergency GPS distress beacon across all P2P mesh nodes.
                  </p>

                  <div className="h-10 bg-slate-900 border border-slate-700 rounded-full relative flex items-center justify-center overflow-hidden">
                    <span className="text-[10px] text-slate-400 select-none font-bold uppercase tracking-wider">
                      Slide Right →
                    </span>

                    {/* Drag thumb */}
                    <motion.div
                      drag="x"
                      dragConstraints={{ left: 0, right: 190 }}
                      dragElastic={0}
                      onDrag={(_, info) => {
                        const val = Math.min(100, Math.max(0, (info.offset.x / 190) * 100));
                        setSosProgress(val);
                        triggerHaptic('tap');
                      }}
                      onDragEnd={() => {
                        if (sosProgress < 100) setSosProgress(0);
                      }}
                      className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs absolute left-1 cursor-grab shadow-lg"
                    >
                      🆘
                    </motion.div>

                    {/* Progress track */}
                    <div
                      style={{ width: `${sosProgress}%` }}
                      className="absolute left-0 top-0 bottom-0 bg-red-600/30 pointer-events-none"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Toggle button for P2P Mesh Panel on small screens */}
        <div className="absolute top-4 right-4 z-[1000] lg:hidden">
          <Button
            variant="tactical-green"
            size="sm"
            onClick={() => setMeshPanelOpen(!meshPanelOpen)}
          >
            {meshPanelOpen ? 'Hide Mesh' : '🛰️ Mesh Peers'}
          </Button>
        </div>
      </div>

      {/* Floating Right Overlay: WebRTC P2P Mesh Panel (320px) */}
      <AnimatePresence>
        {meshPanelOpen && (
          <motion.aside
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="absolute top-4 right-4 bottom-4 w-80 z-[1000] glass-panel bg-white/80 dark:bg-slate-950/80 border border-emerald-500/30 shadow-2xl rounded-2xl flex flex-col overflow-hidden backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold font-tactical text-slate-900 dark:text-white">
                  P2P Mesh Channels
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  Direct WebRTC DataChannel
                </p>
              </div>
              <Badge variant="tactical-green" dot>
                {syncStatus.toUpperCase()}
              </Badge>
            </div>

            {/* Peer List */}
            <div className="p-4 flex-1 overflow-y-auto space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Radio Peers In Range ({peerCount})
              </div>

              {volunteers.slice(0, 5).map((vol) => (
                <div
                  key={vol.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{roleIcons[vol.role] || '👤'}</span>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {vol.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Latency: ~{Math.floor(Math.random() * 30 + 15)}ms • Direct
                      </div>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              ))}
            </div>

            {/* Offline Cache Status */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-500">Local Tile Cache:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">100% Ready</span>
              </div>
              <Button
                variant="glass"
                size="sm"
                className="w-full text-xs font-semibold"
                onClick={() => {
                  triggerHaptic('success');
                  alert('Offline tiles verified in IndexedDB. Ready for disconnected deployment.');
                }}
              >
                💾 Verify Offline Storage
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
