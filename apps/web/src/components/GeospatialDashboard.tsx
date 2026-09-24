import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import type { Socket } from 'socket.io-client';
import type { DangerZone, ResourceHub } from '@mirage/shared-types';
import { SOCKET_EVENTS } from '@mirage/shared-types';
import type { Volunteer, VolunteerRole } from '../hooks/useVolunteerSim';
import L from 'leaflet';
import { useAppTheme } from '../hooks/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

import { API_URL } from '../config';

const SEVERITY_COLORS: Record<string, string> = {
  low: '#22c55e', medium: '#f59e0b', high: '#ef4444', critical: '#3b82f6',
};
const SEVERITY_GLOW: Record<string, string> = {
  low: 'rgba(34,197,94,0.15)', medium: 'rgba(245,158,11,0.2)',
  high: 'rgba(239,68,68,0.25)', critical: 'rgba(168,85,247,0.3)',
};

function hubIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="background:#0ea5e9;border:2px solid #38bdf8;border-radius:50%;width:14px;height:14px;box-shadow:0 0 8px #38bdf8,0 0 16px rgba(56,189,248,0.4)"></div>`,
    iconSize: [14, 14], iconAnchor: [7, 7],
  });
}

function volunteerIcon(v: Volunteer, roleColors: Record<VolunteerRole, string>, isSelected: boolean) {
  const color = roleColors[v.role];
  const pulse = v.status === 'in-zone' || v.status === 'moving';
  const size = isSelected ? 18 : 13;
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${size}px;height:${size}px">
      ${pulse ? `<div style="position:absolute;inset:-5px;border:2px solid ${color};border-radius:50%;opacity:0.5;animation:none"></div>` : ''}
      <div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:${color};
        border:${isSelected ? '3px solid white' : '2px solid rgba(255,255,255,0.6)'};
        box-shadow:0 0 ${isSelected ? 12 : 6}px ${color};
        display:flex;align-items:center;justify-content:center;
        font-size:${size * 0.6}px;line-height:1;
      ">${v.gender === 'female' ? '♀' : '♂'}</div>
    </div>`,
    iconSize: [size, size], iconAnchor: [size / 2, size / 2],
  });
}

function MapController({ zones }: { zones: DangerZone[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (Array.isArray(zones) && zones.length > 0 && !fitted.current) {
      fitted.current = true;
      try {
        const allCoords = zones.flatMap(z =>
          z.geometry.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number])
        );
        map.fitBounds(L.latLngBounds(allCoords), { padding: [60, 60] });
      } catch { /* ignore */ }
    }
  }, [zones, map]);
  return null;
}

// Sub-component to catch Map events for custom geofence drawing
function MapDrawingEvents({
  isDrawing,
  onMapClick,
}: {
  isDrawing: boolean;
  onMapClick: (latlng: L.LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
}

interface Props {
  socket: Socket | null;
  volunteers: Volunteer[];
  selectedVolunteerId: string | null;
  onSelectVolunteer: (v: Volunteer | null) => void;
  roleIcons: Record<VolunteerRole, string>;
  roleColors: Record<VolunteerRole, string>;
}

export function GeospatialDashboard({ socket, volunteers, selectedVolunteerId, onSelectVolunteer, roleIcons, roleColors }: Props) {
  const { styles, themeMode, token, userRole, triggerHaptic, t } = useAppTheme();
  
  const [zones, setZones] = useState<DangerZone[]>([]);
  const [hubs, setHubs] = useState<ResourceHub[]>([]);
  
  // Geofence drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([]);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneDesc, setNewZoneDesc] = useState('');
  const [newZoneSeverity, setNewZoneSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  // Optimal route path & accessibility states
  const [selectedPath, setSelectedPath] = useState<[number, number][] | null>(null);
  const [wheelchairMode, setWheelchairMode] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/zones`).then((r) => r.json()).then(setZones).catch(console.error);
    fetch(`${API_URL}/api/resources`).then((r) => r.json()).then(setHubs).catch(console.error);
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on(SOCKET_EVENTS.ZONE_UPDATED, (zone: DangerZone) =>
      setZones((prev) => prev.map((z) => (z._id === zone._id ? zone : z))));
    socket.on(SOCKET_EVENTS.ZONE_CREATED, (zone: DangerZone) =>
      setZones((prev) => [...prev, zone]));
    socket.on(SOCKET_EVENTS.RESOURCE_UPDATED, (hub: ResourceHub) =>
      setHubs((prev) => prev.map((h) => (h._id === hub._id ? hub : h))));
    return () => {
      socket.off(SOCKET_EVENTS.ZONE_UPDATED);
      socket.off(SOCKET_EVENTS.ZONE_CREATED);
      socket.off(SOCKET_EVENTS.RESOURCE_UPDATED);
    };
  }, [socket]);

  // Fetch optimal path when volunteer selection or wheelchair filter changes
  useEffect(() => {
    if (!selectedVolunteerId) {
      setSelectedPath(null);
      return;
    }
    const vol = volunteers.find(v => v.id === selectedVolunteerId);
    if (vol && vol.assignedZoneId && vol.status === 'moving') {
      let targetCoords: [number, number] | null = null;
      if (vol.assignedZoneId === 'zone-la') targetCoords = [-118.4, 34.2];
      else if (vol.assignedZoneId === 'zone-chi') targetCoords = [-87.6, 41.9];
      else if (vol.assignedZoneId === 'zone-nyc') targetCoords = [-73.9, 40.75];

      if (targetCoords) {
        fetch(`${API_URL}/api/v1/ai/optimal-route`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: [vol.lng, vol.lat],
            to: targetCoords,
            wheelchair: wheelchairMode,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.path) {
              setSelectedPath(data.path);
            }
          })
          .catch(console.error);
      }
    } else {
      setSelectedPath(null);
    }
  }, [selectedVolunteerId, volunteers, wheelchairMode]);

  const handleMapClick = (latlng: L.LatLng) => {
    setDrawnPoints((prev) => [...prev, [latlng.lng, latlng.lat]]);
    triggerHaptic('tap');
  };

  const handleClearDraw = () => {
    setDrawnPoints([]);
    triggerHaptic('warning');
  };

  const handleSaveGeofence = () => {
    if (drawnPoints.length < 3) {
      alert('A geofence requires at least 3 points.');
      return;
    }
    triggerHaptic('success');
    setShowZoneModal(true);
  };

  const handleSubmitZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName.trim()) return;

    const closedCoordinates = [...drawnPoints, drawnPoints[0]];

    const body = {
      name: newZoneName,
      description: newZoneDesc,
      severity: newZoneSeverity,
      geometry: {
        type: 'Polygon',
        coordinates: [closedCoordinates],
      },
      active: true,
    };

    try {
      const res = await fetch(`${API_URL}/api/zones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save zone');
      }

      const savedZone = await res.json();
      setZones((prev) => [...prev, savedZone]);
      
      setIsDrawing(false);
      setDrawnPoints([]);
      setShowZoneModal(false);
      setNewZoneName('');
      setNewZoneDesc('');
      setNewZoneSeverity('medium');
      triggerHaptic('success');
    } catch (err: any) {
      alert(err.message || 'Error saving danger zone.');
      triggerHaptic('warning');
    }
  };

  const canDraw = userRole === 'admin' || userRole === 'coordinator';
  const isContrast = themeMode === 'contrast';

  return (
    <div className="h-full w-full relative" style={{ fontFamily: styles.fontFamily }}>
      <MapContainer center={[30, -40]} zoom={3} className="h-full w-full z-0">
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={19}
        />
        <MapController zones={zones} />
        
        <MapDrawingEvents isDrawing={isDrawing} onMapClick={handleMapClick} />

        {drawnPoints.length > 0 && (
          <Polygon
            positions={drawnPoints.map(([lng, lat]) => [lat, lng])}
            pathOptions={{
              color: isContrast ? '#00ff00' : '#38bdf8',
              fillColor: isContrast ? 'transparent' : 'rgba(56,189,248,0.2)',
              fillOpacity: 0.5,
              weight: 3,
              dashArray: '5, 5',
            }}
          />
        )}

        {selectedPath && (
          <Polyline
            positions={selectedPath.map(([lng, lat]) => [lat, lng])}
            pathOptions={{
              color: isContrast ? '#00ff00' : '#a78bfa',
              weight: 4,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round',
              dashArray: isContrast ? '8, 8' : undefined,
            }}
          />
        )}

        {(Array.isArray(zones) ? zones : []).map((zone) => {
          const positions = zone.geometry.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]);
          const color = isContrast ? '#00ff00' : (SEVERITY_COLORS[zone.severity] ?? '#ef4444');
          return (
            <Polygon key={zone._id} positions={positions}
              pathOptions={{ color, fillColor: isContrast ? 'transparent' : SEVERITY_GLOW[zone.severity], fillOpacity: 1, weight: 2, opacity: 0.9 }}>
              <Popup>
                <div 
                  className="px-3 py-2 rounded-md min-w-[180px] text-slate-200"
                  style={{ background: isContrast ? '#000' : 'var(--glass-bg)', fontFamily: styles.fontFamily, border: `1px solid ${styles.borderColor}`, backdropFilter: isContrast ? 'none' : 'blur(var(--glass-blur))' }}>
                  <div className="font-bold text-sm mb-1">{zone.name}</div>
                  <div className="flex gap-1.5 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase border" style={{ background: color + '33', color, borderColor: color }}>{zone.severity}</span>
                    <span className={`text-[10px] ${zone.active ? 'text-green-300' : 'text-red-400'}`}>{zone.active ? '● ACTIVE' : '○ INACTIVE'}</span>
                  </div>
                  {zone.description && <div className="text-[11px] text-slate-400">{zone.description}</div>}
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {(Array.isArray(hubs) ? hubs : []).map((hub) => {
          const [lng, lat] = hub.location.coordinates;
          return (
            <Marker key={hub._id} position={[lat, lng]} icon={hubIcon()}>
              <Popup>
                <div 
                  className="px-3 py-2 rounded-md min-w-[200px] text-slate-200"
                  style={{ background: isContrast ? '#000' : 'var(--glass-bg)', fontFamily: styles.fontFamily, border: `1px solid ${styles.borderColor}`, backdropFilter: isContrast ? 'none' : 'blur(var(--glass-blur))' }}>
                  <div className="font-bold text-[13px] mb-1.5 text-sky-400">📦 {hub.name}</div>
                  <div className="text-[10px] text-slate-500 mb-1.5">Capacity: {hub.capacity}</div>
                  {hub.resources.map((item) => (
                    <div key={item._id} className="flex justify-between text-[11px] mb-[3px]">
                      <span className="text-slate-400">{item.name}</span>
                      <span className={`font-semibold ${item.quantity < 10 ? 'text-red-400' : 'text-green-300'}`}>{item.quantity} {item.unit}</span>
                    </div>
                  ))}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {(Array.isArray(volunteers) ? volunteers : []).map((v) => (
          <Marker
            key={v.id}
            position={[v.lat, v.lng]}
            icon={volunteerIcon(v, roleColors, selectedVolunteerId === v.id)}
            eventHandlers={{ click: () => onSelectVolunteer(selectedVolunteerId === v.id ? null : v) }}
          >
            <Popup>
              <div 
                className="px-3.5 py-2.5 rounded-md min-w-[200px] text-slate-200"
                style={{ background: isContrast ? '#000' : 'var(--glass-bg)', fontFamily: styles.fontFamily, border: `1px solid ${styles.borderColor}`, backdropFilter: isContrast ? 'none' : 'blur(var(--glass-blur))' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[22px]">{v.gender === 'female' ? '👩' : '👨'}</span>
                  <div>
                    <div className="font-bold text-[13px]">{v.name}</div>
                    <div className="text-[11px]" style={{ color: roleColors[v.role] }}>{roleIcons[v.role]} {v.role}</div>
                  </div>
                </div>
                <div className="text-[10px] mb-1.5">
                  <span className="px-2 py-0.5 rounded font-bold" style={{
                    background: v.status === 'in-zone' ? '#7f1d1d' : v.status === 'moving' ? '#14532d' : 'rgba(255,255,255,0.1)',
                    color: v.status === 'in-zone' ? '#fca5a5' : v.status === 'moving' ? '#86efac' : '#94a3b8',
                  }}>
                    {v.status === 'in-zone' ? '⚠ IN DANGER ZONE' : v.status === 'moving' ? '→ EN ROUTE' : '○ STANDBY'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-[3px]">
                  {v.skills.map(s => (
                    <span key={s} className="text-[9px] px-1.5 py-[1px] rounded bg-white/10 text-slate-400">{s}</span>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Top-Right Map Actions toolbar */}
      <div className="absolute top-3 right-3 z-[1000] flex gap-2">
        <label 
          className={`px-3 py-1.5 rounded-md text-[11px] font-bold cursor-pointer flex items-center gap-1.5 select-none transition-colors hover:opacity-90 ${isContrast ? 'text-green-500' : 'text-white shadow-lg'}`}
          style={{
            background: isContrast ? '#000' : 'var(--glass-bg)',
            border: `2px solid ${styles.borderColor}`,
            backdropFilter: isContrast ? 'none' : 'blur(var(--glass-blur))',
          }}>
          <input
            type="checkbox"
            checked={wheelchairMode}
            onChange={(e) => {
              setWheelchairMode(e.target.checked);
              triggerHaptic('success');
            }}
            className="cursor-pointer"
            style={{ accentColor: isContrast ? '#00ff00' : '#2563eb' }}
          />
          ♿ Accessible Route
        </label>

        {canDraw && (
          <>
            {!isDrawing ? (
              <button
                onClick={() => {
                  setIsDrawing(true);
                  triggerHaptic('success');
                }}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold cursor-pointer transition-colors hover:opacity-90 focus:ring-2 focus:ring-sky-500 focus:outline-none ${isContrast ? 'text-green-500' : 'text-white shadow-lg'}`}
                style={{
                  background: isContrast ? '#000' : 'var(--glass-bg)',
                  border: `2px solid ${styles.borderColor}`,
                  backdropFilter: isContrast ? 'none' : 'blur(var(--glass-blur))',
                }}
              >
                ✏ Draw Geofence
              </button>
            ) : (
              <div 
                className="p-3 rounded-lg flex flex-col gap-2 shadow-lg"
                style={{ 
                  background: isContrast ? '#000' : 'var(--glass-bg)', 
                  border: `2px solid ${styles.borderColor}`, 
                  backdropFilter: isContrast ? 'none' : 'blur(var(--glass-blur))',
                }}>
                <div className={`text-[10px] font-bold ${isContrast ? 'text-green-500' : 'text-sky-400'}`}>
                  DRAWING MODE ACTIVE ({drawnPoints.length} pts)
                </div>
                <div className={`text-[9px] ${isContrast ? 'text-green-500' : 'text-slate-400'}`}>
                  Click points on map to construct polygon.
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleSaveGeofence}
                    disabled={drawnPoints.length < 3}
                    className="flex-1 px-2 py-1 text-[9px] font-bold rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: drawnPoints.length < 3 ? 'var(--glass-bg)' : (isContrast ? 'transparent' : '#10b981'),
                      color: drawnPoints.length < 3 ? '#64748b' : (isContrast ? '#00ff00' : '#ffffff'),
                      border: `1px solid ${drawnPoints.length < 3 ? styles.borderColor : (isContrast ? '#00ff00' : '#10b981')}`,
                    }}
                  >
                    ✓ Complete
                  </button>
                  <button
                    onClick={handleClearDraw}
                    className="px-2 py-1 text-[9px] font-bold rounded bg-transparent focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors hover:bg-red-500/10"
                    style={{
                      color: isContrast ? '#ff3333' : '#ef4444',
                      border: `1px solid ${isContrast ? '#ff3333' : '#ef4444'}`,
                    }}
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => {
                      setIsDrawing(false);
                      setDrawnPoints([]);
                      triggerHaptic('warning');
                    }}
                    className="px-2 py-1 text-[9px] font-bold rounded bg-transparent focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors hover:bg-slate-500/10"
                    style={{
                      color: isContrast ? '#00ff00' : '#64748b',
                      border: `1px solid ${styles.borderColor}`,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Legend */}
      <div 
        className="absolute bottom-7 left-3 z-[1000] rounded-lg px-3.5 py-2.5"
        style={{ background: isContrast ? '#000' : 'var(--glass-bg)', border: `${styles.borderWidth} solid ${styles.borderColor}`, backdropFilter: isContrast ? 'none' : 'blur(var(--glass-blur))' }}>
        <div className={`text-[9px] uppercase tracking-widest mb-1.5 ${isContrast ? 'text-green-500' : 'text-slate-600'}`}>{t('legend')}</div>
        {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
          <div key={sev} className="flex items-center gap-1.5 mb-1">
            <div className="w-2.5 h-2.5 rounded-sm opacity-80" style={{ background: isContrast ? '#00ff00' : color }} />
            <span className={`text-[10px] capitalize ${isContrast ? 'text-green-500' : 'text-slate-400'}`}>{t(sev)} {t('dangerZone')}</span>
          </div>
        ))}
        <div className="mt-1 pt-1" style={{ borderTop: `1px solid ${styles.borderColor}` }}>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: isContrast ? '#00ff00' : '#0ea5e9' }} />
            <span className={`text-[10px] ${isContrast ? 'text-green-500' : 'text-slate-400'}`}>{t('resourceHubs')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: isContrast ? '#00ff00' : '#a78bfa' }} />
            <span className={`text-[10px] ${isContrast ? 'text-green-500' : 'text-slate-400'}`}>{t('vol')} (click)</span>
          </div>
        </div>
      </div>

      {/* New Zone Form Modal */}
      <AnimatePresence>
        {showZoneModal && (
          <div className="absolute inset-0 z-[1200] bg-black/60 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[400px] rounded-xl p-5"
              style={{
                background: isContrast ? '#000' : 'var(--glass-bg)',
                backdropFilter: isContrast ? 'none' : 'blur(var(--glass-blur))',
                border: `2px solid ${styles.borderColor}`,
                boxShadow: isContrast ? 'none' : '0 12px 40px rgba(0,0,0,0.6)',
              }}
            >
              <h2 className={`text-base font-black mb-4 uppercase ${isContrast ? 'text-green-500' : 'text-slate-200'}`}>
                ✏ Create Danger Zone
              </h2>
              <form onSubmit={handleSubmitZone} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="zone-name" className={`text-[10px] uppercase ${isContrast ? 'text-green-500' : 'text-slate-400'}`}>Zone Name</label>
                  <input
                    id="zone-name"
                    type="text"
                    required
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                    placeholder="Wildfire Zone Delta"
                    className="bg-black/20 rounded-md px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-sky-500 transition-shadow"
                    style={{
                      color: isContrast ? '#00ff00' : '#f1f5f9',
                      border: `1px solid ${styles.borderColor}`,
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="zone-desc" className={`text-[10px] uppercase ${isContrast ? 'text-green-500' : 'text-slate-400'}`}>Description</label>
                  <textarea
                    id="zone-desc"
                    value={newZoneDesc}
                    onChange={(e) => setNewZoneDesc(e.target.value)}
                    placeholder="Evacuation details and boundary notes"
                    rows={3}
                    className="bg-black/20 rounded-md px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-sky-500 transition-shadow resize-none"
                    style={{
                      color: isContrast ? '#00ff00' : '#f1f5f9',
                      border: `1px solid ${styles.borderColor}`,
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="zone-sev" className={`text-[10px] uppercase ${isContrast ? 'text-green-500' : 'text-slate-400'}`}>Severity Level</label>
                  <select
                    id="zone-sev"
                    value={newZoneSeverity}
                    onChange={(e) => setNewZoneSeverity(e.target.value as any)}
                    className="bg-black/20 rounded-md px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-sky-500 transition-shadow cursor-pointer"
                    style={{
                      color: isContrast ? '#00ff00' : '#f1f5f9',
                      border: `1px solid ${styles.borderColor}`,
                    }}
                  >
                    <option value="low" className="bg-[#09111e]">Low (Green)</option>
                    <option value="medium" className="bg-[#09111e]">Medium (Yellow)</option>
                    <option value="high" className="bg-[#09111e]">High (Red)</option>
                    <option value="critical" className="bg-[#09111e]">Critical (blue)</option>
                  </select>
                </div>
                <div className="flex gap-2.5 mt-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 rounded-md font-bold text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors hover:opacity-90"
                    style={{
                      background: isContrast ? 'transparent' : '#2563eb',
                      color: isContrast ? '#00ff00' : '#ffffff',
                      border: `1px solid ${isContrast ? '#00ff00' : '#2563eb'}`,
                    }}
                  >
                    Save Zone
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowZoneModal(false)}
                    className="flex-1 bg-transparent px-4 py-2 rounded-md font-bold text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors hover:bg-slate-800"
                    style={{
                      color: isContrast ? '#ff3333' : '#94a3b8',
                      border: `1px solid ${isContrast ? '#ff3333' : '#334155'}`,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
