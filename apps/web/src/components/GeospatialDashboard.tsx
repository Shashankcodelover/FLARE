import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import type { Socket } from 'socket.io-client';
import type { DangerZone, ResourceHub } from '@mirage/shared-types';
import { SOCKET_EVENTS } from '@mirage/shared-types';
import type { Volunteer, VolunteerRole } from '../hooks/useVolunteerSim';
import L from 'leaflet';
import { useAppTheme } from '../hooks/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

const SEVERITY_COLORS: Record<string, string> = {
  low: '#22c55e', medium: '#f59e0b', high: '#ef4444', critical: '#a855f7',
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
    if (zones.length > 0 && !fitted.current) {
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
    fetch(`${API}/api/zones`).then((r) => r.json()).then(setZones).catch(console.error);
    fetch(`${API}/api/resources`).then((r) => r.json()).then(setHubs).catch(console.error);
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
        fetch(`${API}/api/v1/ai/optimal-route`, {
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
      const res = await fetch(`${API}/api/zones`, {
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
    <div style={{ height: '100%', width: '100%', position: 'relative', fontFamily: styles.fontFamily }}>
      <MapContainer center={[30, -40]} zoom={3} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Tactical Disaster GIS'
          maxZoom={16}
        />
        <MapController zones={zones} />
        
        {/* Draw Geofence Map Events */}
        <MapDrawingEvents isDrawing={isDrawing} onMapClick={handleMapClick} />

        {/* Draw Line Visualizer */}
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

        {/* Optimal Route Path Visualizer */}
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

        {/* Danger zones */}
        {zones.map((zone) => {
          const positions = zone.geometry.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]);
          const color = isContrast ? '#00ff00' : (SEVERITY_COLORS[zone.severity] ?? '#ef4444');
          return (
            <Polygon key={zone._id} positions={positions}
              pathOptions={{ color, fillColor: isContrast ? 'transparent' : SEVERITY_GLOW[zone.severity], fillOpacity: 1, weight: 2, opacity: 0.9 }}>
              <Popup>
                <div style={{ background: '#0d1f35', color: '#e2e8f0', padding: '8px 12px', borderRadius: 6, minWidth: 180, fontFamily: styles.fontFamily }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{zone.name}</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: color + '33', color, border: `1px solid ${color}`, textTransform: 'uppercase' }}>{zone.severity}</span>
                    <span style={{ fontSize: 10, color: zone.active ? '#86efac' : '#f87171' }}>{zone.active ? '● ACTIVE' : '○ INACTIVE'}</span>
                  </div>
                  {zone.description && <div style={{ fontSize: 11, color: '#94a3b8' }}>{zone.description}</div>}
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* Resource hubs */}
        {hubs.map((hub) => {
          const [lng, lat] = hub.location.coordinates;
          return (
            <Marker key={hub._id} position={[lat, lng]} icon={hubIcon()}>
              <Popup>
                <div style={{ background: '#0d1f35', color: '#e2e8f0', padding: '8px 12px', borderRadius: 6, minWidth: 200, fontFamily: styles.fontFamily }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#38bdf8' }}>📦 {hub.name}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>Capacity: {hub.capacity}</div>
                  {hub.resources.map((item) => (
                    <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: '#94a3b8' }}>{item.name}</span>
                      <span style={{ color: item.quantity < 10 ? '#f87171' : '#86efac', fontWeight: 600 }}>{item.quantity} {item.unit}</span>
                    </div>
                  ))}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Live volunteer markers */}
        {volunteers.map((v) => (
          <Marker
            key={v.id}
            position={[v.lat, v.lng]}
            icon={volunteerIcon(v, roleColors, selectedVolunteerId === v.id)}
            eventHandlers={{ click: () => onSelectVolunteer(selectedVolunteerId === v.id ? null : v) }}
          >
            <Popup>
              <div style={{ background: '#0d1f35', color: '#e2e8f0', padding: '10px 14px', borderRadius: 6, minWidth: 200, fontFamily: styles.fontFamily }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>{v.gender === 'female' ? '👩' : '👨'}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{v.name}</div>
                    <div style={{ fontSize: 11, color: roleColors[v.role] }}>{roleIcons[v.role]} {v.role}</div>
                  </div>
                </div>
                <div style={{ fontSize: 10, marginBottom: 6 }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontWeight: 700,
                    background: v.status === 'in-zone' ? '#7f1d1d' : v.status === 'moving' ? '#14532d' : '#1e293b',
                    color: v.status === 'in-zone' ? '#fca5a5' : v.status === 'moving' ? '#86efac' : '#94a3b8',
                  }}>
                    {v.status === 'in-zone' ? '⚠ IN DANGER ZONE' : v.status === 'moving' ? '→ EN ROUTE' : '○ STANDBY'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {v.skills.map(s => (
                    <span key={s} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#1e3a5f', color: '#94a3b8' }}>{s}</span>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Top-Right Map Actions toolbar */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, display: 'flex', gap: 8 }}>
        {/* Wheelchair accessible routing filter checkbox */}
        <label style={{
          background: isContrast ? '#000000' : 'rgba(15, 23, 42, 0.9)',
          color: isContrast ? '#00ff00' : '#ffffff',
          border: `2px solid ${styles.borderColor}`,
          padding: '6px 12px',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          boxShadow: isContrast ? 'none' : '0 4px 12px rgba(0,0,0,0.5)',
          backdropFilter: styles.panelBackdrop,
          userSelect: 'none',
        }}>
          <input
            type="checkbox"
            checked={wheelchairMode}
            onChange={(e) => {
              setWheelchairMode(e.target.checked);
              triggerHaptic('success');
            }}
            style={{ cursor: 'pointer', accentColor: isContrast ? '#00ff00' : '#2563eb' }}
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
                style={{
                  background: isContrast ? '#000000' : 'rgba(15, 23, 42, 0.9)',
                  color: isContrast ? '#00ff00' : '#ffffff',
                  border: `2px solid ${styles.borderColor}`,
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: isContrast ? 'none' : '0 4px 12px rgba(0,0,0,0.5)',
                  backdropFilter: styles.panelBackdrop,
                }}
              >
                ✏ Draw Geofence
              </button>
            ) : (
              <div style={{ 
                background: isContrast ? '#000000' : 'rgba(15, 23, 42, 0.95)', 
                border: `2px solid ${styles.borderColor}`, 
                padding: '10px 14px', 
                borderRadius: 8, 
                display: 'flex', 
                flexDirection: 'column',
                gap: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                backdropFilter: styles.panelBackdrop,
              }}>
                <div style={{ fontSize: 10, color: isContrast ? '#00ff00' : '#38bdf8', fontWeight: 'bold' }}>
                  DRAWING MODE ACTIVE ({drawnPoints.length} pts)
                </div>
                <div style={{ fontSize: 9, color: isContrast ? '#00ff00' : '#94a3b8' }}>
                  Click points on map to construct polygon.
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={handleSaveGeofence}
                    disabled={drawnPoints.length < 3}
                    style={{
                      flex: 1,
                      background: drawnPoints.length < 3 ? '#1e293b' : (isContrast ? 'transparent' : '#10b981'),
                      color: drawnPoints.length < 3 ? '#64748b' : (isContrast ? '#00ff00' : '#ffffff'),
                      border: `1px solid ${drawnPoints.length < 3 ? '#334155' : (isContrast ? '#00ff00' : '#10b981')}`,
                      borderRadius: 4,
                      padding: '4px 8px',
                      fontSize: 9,
                      fontWeight: 'bold',
                      cursor: drawnPoints.length < 3 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ✓ Complete
                  </button>
                  <button
                    onClick={handleClearDraw}
                    style={{
                      background: 'transparent',
                      color: isContrast ? '#ff3333' : '#ef4444',
                      border: `1px solid ${isContrast ? '#ff3333' : '#ef4444'}`,
                      borderRadius: 4,
                      padding: '4px 8px',
                      fontSize: 9,
                      fontWeight: 'bold',
                      cursor: 'pointer',
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
                    style={{
                      background: 'transparent',
                      color: isContrast ? '#00ff00' : '#64748b',
                      border: `1px solid ${styles.borderColor}`,
                      borderRadius: 4,
                      padding: '4px 8px',
                      fontSize: 9,
                      fontWeight: 'bold',
                      cursor: 'pointer',
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
      <div style={{ position: 'absolute', bottom: 28, left: 12, zIndex: 1000, background: isContrast ? '#000000' : 'rgba(4,14,28,0.92)', border: `${styles.borderWidth} solid ${styles.borderColor}`, borderRadius: 8, padding: '10px 14px', backdropFilter: styles.panelBackdrop }}>
        <div style={{ fontSize: 9, color: isContrast ? '#00ff00' : '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{t('legend')}</div>
        {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
          <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <div style={{ width: 10, height: 10, background: isContrast ? '#00ff00' : color, borderRadius: 2, opacity: 0.8 }} />
            <span style={{ fontSize: 10, color: isContrast ? '#00ff00' : '#94a3b8', textTransform: 'capitalize' }}>{t(sev)} {t('dangerZone')}</span>
          </div>
        ))}
        <div style={{ borderTop: `1px solid ${styles.borderColor}`, marginTop: 5, paddingTop: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <div style={{ width: 10, height: 10, background: isContrast ? '#00ff00' : '#0ea5e9', borderRadius: '50%' }} />
            <span style={{ fontSize: 10, color: isContrast ? '#00ff00' : '#94a3b8' }}>{t('resourceHubs')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, background: isContrast ? '#00ff00' : '#a78bfa', borderRadius: '50%' }} />
            <span style={{ fontSize: 10, color: isContrast ? '#00ff00' : '#94a3b8' }}>{t('vol')} (click)</span>
          </div>
        </div>
      </div>

      {/* New Zone Form Modal */}
      <AnimatePresence>
        {showZoneModal && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1200,
            background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: '100%', maxWidth: 400,
                background: isContrast ? '#000000' : 'rgba(15, 23, 42, 0.98)',
                backdropFilter: styles.panelBackdrop,
                border: `2px solid ${styles.borderColor}`,
                borderRadius: 12, padding: 20,
                boxShadow: isContrast ? 'none' : '0 12px 40px rgba(0,0,0,0.6)',
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 16, color: isContrast ? '#00ff00' : '#e2e8f0', textTransform: 'uppercase' }}>
                ✏ Create Danger Zone
              </h2>
              <form onSubmit={handleSubmitZone} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label htmlFor="zone-name" style={{ fontSize: 10, textTransform: 'uppercase', color: isContrast ? '#00ff00' : '#94a3b8' }}>Zone Name</label>
                  <input
                    id="zone-name"
                    type="text"
                    required
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                    placeholder="Wildfire Zone Delta"
                    style={{
                      background: '#09111e', color: isContrast ? '#00ff00' : '#f1f5f9',
                      border: `1px solid ${styles.borderColor}`, borderRadius: 6,
                      padding: '8px 12px', fontSize: 12, outline: 'none',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label htmlFor="zone-desc" style={{ fontSize: 10, textTransform: 'uppercase', color: isContrast ? '#00ff00' : '#94a3b8' }}>Description</label>
                  <textarea
                    id="zone-desc"
                    value={newZoneDesc}
                    onChange={(e) => setNewZoneDesc(e.target.value)}
                    placeholder="Evacuation details and boundary notes"
                    rows={3}
                    style={{
                      background: '#09111e', color: isContrast ? '#00ff00' : '#f1f5f9',
                      border: `1px solid ${styles.borderColor}`, borderRadius: 6,
                      padding: '8px 12px', fontSize: 12, outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label htmlFor="zone-sev" style={{ fontSize: 10, textTransform: 'uppercase', color: isContrast ? '#00ff00' : '#94a3b8' }}>Severity Level</label>
                  <select
                    id="zone-sev"
                    value={newZoneSeverity}
                    onChange={(e) => setNewZoneSeverity(e.target.value as any)}
                    style={{
                      background: '#09111e', color: isContrast ? '#00ff00' : '#f1f5f9',
                      border: `1px solid ${styles.borderColor}`, borderRadius: 6,
                      padding: '8px 12px', fontSize: 12, outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="low">Low (Green)</option>
                    <option value="medium">Medium (Yellow)</option>
                    <option value="high">High (Red)</option>
                    <option value="critical">Critical (Purple)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1, background: isContrast ? 'transparent' : '#2563eb',
                      color: isContrast ? '#00ff00' : '#ffffff',
                      border: `1px solid ${isContrast ? '#00ff00' : '#2563eb'}`,
                      padding: '8px 16px', borderRadius: 6, fontWeight: 'bold', fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Save Zone
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowZoneModal(false)}
                    style={{
                      flex: 1, background: 'transparent',
                      color: isContrast ? '#ff3333' : '#94a3b8',
                      border: `1px solid ${isContrast ? '#ff3333' : '#334155'}`,
                      padding: '8px 16px', borderRadius: 6, fontWeight: 'bold', fontSize: 12,
                      cursor: 'pointer',
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
