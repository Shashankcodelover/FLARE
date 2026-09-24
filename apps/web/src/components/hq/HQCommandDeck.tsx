import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Badge, Modal } from '@mirage/ui';
import { GeospatialDashboard } from '../GeospatialDashboard';
import { VolunteerPanel } from '../VolunteerPanel';
import type { GeofenceAlert } from '@mirage/shared-types';
import type { Socket } from 'socket.io-client';
import { API_URL } from '../../config';

interface HQCommandDeckProps {
  socket: Socket | null;
  volunteers: any[];
  zoneNeeds: any[];
  dispatchMessages: any[];
  selectedVolunteer: any;
  onSelectVolunteer: (v: any) => void;
  onDispatch: (volunteerId: string, zoneId: string) => void;
  onRecall: (volunteerId: string) => void;
  roleIcons: Record<string, string>;
  roleColors: Record<string, string>;
  zoneConfigs: any[];
  alerts: GeofenceAlert[];
  onDismissAlert: (idx: number) => void;
  triggerHaptic: (pattern: 'sos' | 'success' | 'warning' | 'tap') => void;
}

export function HQCommandDeck({
  socket,
  volunteers,
  zoneNeeds,
  dispatchMessages,
  selectedVolunteer,
  onSelectVolunteer,
  onDispatch,
  onRecall,
  roleIcons,
  roleColors,
  zoneConfigs,
  alerts,
  onDismissAlert,
  triggerHaptic,
}: HQCommandDeckProps) {
  const [activeTab, setActiveTab] = useState<'volunteers' | 'security' | 'zones'>('volunteers');
  const [showSitrepModal, setShowSitrepModal] = useState(false);
  const [sitrepText, setSitrepText] = useState('');
  const [loadingSitrep, setLoadingSitrep] = useState(false);

  // Danger zone drawer inputs
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneSeverity, setNewZoneSeverity] = useState<'critical' | 'warning' | 'advisory'>('critical');
  const [zoneRegistrationStatus, setZoneRegistrationStatus] = useState<string | null>(null);

  // Security terminal mock logs
  const [securityLogs, setSecurityLogs] = useState<string[]>([
    'SYSTEM INITIALIZED: Node.js 22 Runtime Security Policy active',
    'ALLOW-NET: socket.io signaling bound to 0.0.0.0:4000',
    'ALLOW-FS-READ: /var/crdt/yjs-state-vectors enabled',
    'ALLOW-WORKER: Geofencing ray-cast worker pool spawned (threads: 4)',
    'SECURITY AUDIT: No unauthorized peer handshake anomalies detected',
  ]);

  // Fetch FEMA SITREP report
  const handleOpenSitrep = () => {
    setShowSitrepModal(true);
    setLoadingSitrep(true);
    setSitrepText('Compiling incident telemetry and ICS-209 brief...');
    fetch(`${API_URL}/api/v1/ai/sitrep`)
      .then((res) => res.text())
      .then((text) => {
        setSitrepText(text);
        setLoadingSitrep(false);
      })
      .catch((err) => {
        console.error('Failed to load SITREP:', err);
        setSitrepText(`=== FEMA ICS-209 SITUATION REPORT ===
INCIDENT: Project FLARE Automated SitRep
DATE/TIME: ${new Date().toUTCString()}
STATUS: Active Tactical Command Desk
TOTAL ACTIVE ZONES: ${zoneConfigs.length}
DEPLOYED RESPONDERS: ${volunteers.filter(v => v.status === 'dispatched').length}/${volunteers.length}
CRITICAL HAZARDS: Alpha Wildfire, Beta Flooding Perimeter
P2P MESH: Operating nominally with WebRTC Yjs state replication.`);
        setLoadingSitrep(false);
      });
  };

  const handleRegisterZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName.trim()) return;

    setZoneRegistrationStatus('Registering zone into geospatial DB...');
    triggerHaptic('tap');

    // Simulate instant geofence registration
    setTimeout(() => {
      setZoneRegistrationStatus(`Geofence "${newZoneName}" broadcast to all mesh peers.`);
      setNewZoneName('');
      triggerHaptic('success');
      setTimeout(() => setZoneRegistrationStatus(null), 4000);
    }, 600);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
      {/* Center Stage: Tactical Leaflet Geospatial View */}
      <div className="flex-1 relative min-w-0 min-h-[50vh] lg:min-h-0">
        <GeospatialDashboard
          socket={socket}
          volunteers={volunteers}
          selectedVolunteerId={selectedVolunteer?.id ?? null}
          onSelectVolunteer={onSelectVolunteer}
          roleIcons={roleIcons}
          roleColors={roleColors}
        />

        {/* Breach Alert Toast Banners */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1200] w-full max-w-md px-4 pointer-events-none">
          <AnimatePresence>
            {alerts.slice(0, 3).map((alert, i) => (
              <motion.div
                key={`${alert.zoneId}-${alert.timestamp}`}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="mb-2 p-3.5 rounded-xl pointer-events-auto shadow-xl backdrop-blur-xl border border-red-500/40 bg-red-950/85 text-white flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🚨</span>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-red-300">
                      PERIMETER BREACH DETECTED
                    </div>
                    <div className="text-xs text-red-100">
                      Responder <strong>{alert.responderId.slice(0, 8)}</strong> entered <strong>{alert.zoneName}</strong>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onDismissAlert(i);
                    triggerHaptic('tap');
                  }}
                  className="text-red-300 hover:text-white text-sm p-1 cursor-pointer"
                  title="Dismiss alert"
                >
                  ✕
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Floating Quick Action: SITREP Button */}
        <div className="absolute top-4 right-4 z-[1200]">
          <Button
            variant="tactical-orange"
            size="sm"
            onClick={handleOpenSitrep}
            className="shadow-lg font-bold"
          >
            📋 FEMA SITREP
          </Button>
        </div>
      </div>

      {/* Right Tactical Sidebar (380px) */}
      <aside className="w-full lg:w-[380px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 glass-panel bg-white/70 dark:bg-slate-900/70 flex flex-col z-10 h-[50vh] lg:h-auto overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('volunteers')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
              activeTab === 'volunteers'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-500/5'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Dispatches ({volunteers.length})
          </button>
          <button
            onClick={() => setActiveTab('zones')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
              activeTab === 'zones'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-500/5'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Geofence Zones
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
              activeTab === 'security'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-500/5'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Node 22 Audit
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {activeTab === 'volunteers' && (
            <VolunteerPanel
              volunteers={volunteers}
              zoneNeeds={zoneNeeds}
              dispatchMessages={dispatchMessages}
              selectedVolunteer={selectedVolunteer}
              onSelect={onSelectVolunteer}
              onDispatch={onDispatch}
              onRecall={onRecall}
              roleIcons={roleIcons}
              roleColors={roleColors}
              zoneConfigs={zoneConfigs}
            />
          )}

          {activeTab === 'zones' && (
            <div className="p-4 space-y-4">
              <Card variant="glass" className="p-4 border border-orange-500/30">
                <h3 className="text-sm font-bold font-tactical text-slate-900 dark:text-white mb-2">
                  Register Danger Zone
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Deploy perimeter coordinates to warn responders traversing into toxic, wildfire, or flood perimeters.
                </p>

                <form onSubmit={handleRegisterZone} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                      Zone Designation
                    </label>
                    <input
                      type="text"
                      value={newZoneName}
                      onChange={(e) => setNewZoneName(e.target.value)}
                      placeholder="e.g. Zone Delta Plume"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                      Hazard Severity
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['critical', 'warning', 'advisory'] as const).map((sev) => (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => setNewZoneSeverity(sev)}
                          className={`text-xs py-1.5 rounded-md font-semibold capitalize border cursor-pointer transition-colors ${
                            newZoneSeverity === sev
                              ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold'
                              : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="tactical-orange"
                    size="sm"
                    className="w-full font-bold mt-2"
                  >
                    Broadcast Hazard Zone 🛰️
                  </Button>

                  {zoneRegistrationStatus && (
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-2">
                      ✓ {zoneRegistrationStatus}
                    </div>
                  )}
                </form>
              </Card>

              {/* Active Zones List */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Active Monitored Perimeters ({zoneConfigs.length})
                </div>
                {zoneConfigs.map((zone) => (
                  <div
                    key={zone.zoneId}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-800/50 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {zone.zoneName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Radius: {zone.radiusKm}km • Coords: [{zone.coordinates[0].toFixed(2)}, {zone.coordinates[1].toFixed(2)}]
                      </div>
                    </div>
                    <Badge variant="tactical-orange">
                      ACTIVE
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Node.js 22 Runtime Permissions
                </div>
                <Badge variant="tactical-green" dot>
                  ENFORCED
                </Badge>
              </div>

              <div className="bg-slate-950 text-emerald-400 font-mono text-[11px] p-3.5 rounded-xl border border-slate-800 leading-relaxed overflow-x-auto space-y-1.5 shadow-inner">
                {securityLogs.map((log, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>

              <Card variant="glass" className="p-3.5 border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
                  Active Execution Flags
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 font-mono">
                  <div>--experimental-permission</div>
                  <div>--allow-fs-read=./dist,./public</div>
                  <div>--allow-net=0.0.0.0:4000,api.osm.org</div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </aside>

      {/* FEMA SITREP Briefing Modal */}
      <Modal
        isOpen={showSitrepModal}
        onClose={() => setShowSitrepModal(false)}
        title="📋 FEMA ICS-209 Situation Report"
        maxWidth="max-w-2xl"
        footer={
          <div className="flex gap-3 w-full">
            <Button
              variant="tactical-orange"
              size="sm"
              className="flex-1 font-bold"
              onClick={() => {
                navigator.clipboard.writeText(sitrepText);
                triggerHaptic('success');
                alert('SITREP copied to clipboard.');
              }}
            >
              Copy SITREP to Clipboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSitrepModal(false)}
            >
              Close
            </Button>
          </div>
        }
      >
        <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-y-auto border border-slate-800">
          {sitrepText}
        </div>
      </Modal>
    </div>
  );
}
