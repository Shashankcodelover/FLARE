import { useState } from 'react';
import { useAppTheme } from '../hooks/ThemeContext';

type IngestionEntity = 'zones' | 'resources' | 'responders' | 'corridors';

const TEMPLATES: Record<IngestionEntity, { csv: string; json: string; endpoint: string }> = {
  zones: {
    endpoint: '/api/v1/zones/upload',
    csv: `name,dangerLevel,lng,lat,description
Wildfire Perimeter Sector 7,critical,-118.42,34.08,Rapid crown fire with 45mph eastern gusts.
Flash Flood Inundation Delta,high,-118.35,34.02,Levee overflow active in lower residential sectors.
Industrial Ammonia Hazard Alpha,medium,-118.25,33.95,Chemical buffer perimeter with shelter-in-place order.`,
    json: JSON.stringify([
      {
        name: "Wildfire Perimeter Sector 7",
        dangerLevel: "critical",
        geometry: {
          type: "Polygon",
          coordinates: [[[-118.44, 34.06], [-118.40, 34.06], [-118.40, 34.10], [-118.44, 34.10], [-118.44, 34.06]]]
        },
        description: "Rapid crown fire with 45mph eastern gusts."
      }
    ], null, 2),
  },
  resources: {
    endpoint: '/api/v1/resources/upload',
    csv: `name,lng,lat,type,quantity,unit,capacity
Airfield Staging Depot,-118.38,34.11,Whole Blood Type O-,350,Units,10000
Forward Triage Center South,-118.29,33.97,Potable Drinking Water,5000,Liters,6000
Civilian Relief Mega-Hub,-118.24,34.05,FEMA Disaster MRE Rations,4200,Meals,12000`,
    json: JSON.stringify([
      {
        name: "Airfield Staging Depot",
        location: { type: "Point", coordinates: [-118.38, 34.11] },
        capacity: 10000,
        resources: [
          { type: "Whole Blood Type O-", quantity: 350, unit: "Units" }
        ]
      }
    ], null, 2),
  },
  responders: {
    endpoint: '/api/v1/responders/upload',
    csv: `name,role,status,lng,lat,battery
Capt. Elena Vasquez,firefighter,active,-118.41,34.07,92
Dr. Marcus Brody,medic,en_route,-118.33,34.04,86
Lt. Jordan Cole,drone_pilot,active,-118.28,34.01,98
Tech Specialist Sunita Rao,hazmat_tech,standby,-118.22,33.96,79`,
    json: JSON.stringify([
      {
        name: "Capt. Elena Vasquez",
        role: "firefighter",
        status: "active",
        location: { type: "Point", coordinates: [-118.41, 34.07] },
        batteryPct: 92
      }
    ], null, 2),
  },
  corridors: {
    endpoint: '/api/v1/topology/upload',
    csv: `sourceNode,targetNode,protocol,bandwidthMbps,latencyMs,encryption,environment
FEMA ICP Forward Command,Air Ops Helipad Alpha,WebRTC-Mesh,65.0,11.2,PQC-Kyber,operational
Air Ops Helipad Alpha,Mobile Medical Unit 4,LoRa-P2P,2.1,88.5,AES-256-GCM,contingency
FEMA ICP Forward Command,Evacuation Mega-Hub South,Satellite-SBD,1.5,210.0,PQC-Kyber,evacuation`,
    json: JSON.stringify([
      {
        sourceNode: "FEMA ICP Forward Command",
        targetNode: "Air Ops Helipad Alpha",
        protocol: "WebRTC-Mesh",
        bandwidthMbps: 65.0,
        latencyMs: 11.2,
        packetLoss: 0.1,
        encryption: "PQC-Kyber",
        environment: "operational"
      }
    ], null, 2),
  },
};

export function BulkIngestionStudio() {
  const { styles, themeMode, triggerHaptic } = useAppTheme();
  const isContrast = themeMode === 'contrast';

  const [entity, setEntity] = useState<IngestionEntity>('zones');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [payload, setPayload] = useState<string>(TEMPLATES.zones.csv);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';

  const handleEntityChange = (newEntity: IngestionEntity) => {
    setEntity(newEntity);
    setPayload(format === 'csv' ? TEMPLATES[newEntity].csv : TEMPLATES[newEntity].json);
    setStatusMsg(null);
    triggerHaptic('tap');
  };

  const handleFormatChange = (newFormat: 'csv' | 'json') => {
    setFormat(newFormat);
    setPayload(newFormat === 'csv' ? TEMPLATES[entity].csv : TEMPLATES[entity].json);
    setStatusMsg(null);
    triggerHaptic('tap');
  };

  const handleUpload = async () => {
    if (!payload.trim()) {
      setStatusMsg({ type: 'error', text: 'Payload buffer cannot be empty' });
      return;
    }

    setIsUploading(true);
    setStatusMsg(null);

    try {
      const endpoint = `${API_BASE}${TEMPLATES[entity].endpoint}`;
      const isCsv = format === 'csv';

      let bodyData: any = payload;
      const headers: Record<string, string> = {};

      if (isCsv) {
        headers['Content-Type'] = 'text/csv';
      } else {
        headers['Content-Type'] = 'application/json';
        try {
          bodyData = JSON.stringify(JSON.parse(payload));
        } catch (e: any) {
          throw new Error(`Invalid JSON syntax: ${e.message}`);
        }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: bodyData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Upload failed with status ${res.status}`);
      }

      setStatusMsg({
        type: 'success',
        text: data.message || `Successfully ingested ${data.data?.length || 0} records!`,
      });
      triggerHaptic('success');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Ingestion transaction failed' });
      triggerHaptic('warning');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUniversalPurge = async () => {
    const entityNames = {
      zones: 'All Hazard Zones',
      resources: 'All Emergency Supply Hubs',
      responders: 'All Tactical Responders',
      corridors: 'All Mesh Relay Corridors',
    };

    if (!window.confirm(`⚠️ UNIVERSAL DELETION WARNING\nAre you sure you want to permanently purge ${entityNames[entity]}? This cannot be undone.`)) {
      return;
    }

    try {
      const purgeEndpoints: Record<IngestionEntity, string> = {
        zones: '/api/v1/zones/all',
        resources: '/api/v1/resources/all',
        responders: '/api/v1/responders/all',
        corridors: '/api/v1/topology/corridors',
      };

      const res = await fetch(`${API_BASE}${purgeEndpoints[entity]}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      setStatusMsg({
        type: 'success',
        text: data.message || `Universal deletion completed successfully`,
      });
      triggerHaptic('warning');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Purge request failed' });
    }
  };

  const lineCount = payload.split('\n').length;
  const charCount = payload.length;

  return (
    <div style={{ padding: 12, fontFamily: styles.fontFamily, color: styles.textColor, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 900, color: isContrast ? '#00ff00' : '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            ⚡ ETL Ingestion & Purge Studio
          </span>
          <div style={{ fontSize: 9, color: isContrast ? '#00ff00' : '#64748b' }}>
            Multi-entity batch data ingestion & cascade controls
          </div>
        </div>
        <button
          onClick={handleUniversalPurge}
          title="Universal Deletion across current entity"
          style={{
            background: isContrast ? '#ff3333' : '#7f1d1d',
            color: '#ffffff',
            border: `1px solid ${isContrast ? '#ff3333' : '#dc2626'}`,
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 9,
            fontWeight: 800,
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          🗑️ Universal Purge
        </button>
      </div>

      {/* Entity Selector Chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 8 }}>
        {(['zones', 'resources', 'responders', 'corridors'] as IngestionEntity[]).map((ent) => (
          <button
            key={ent}
            onClick={() => handleEntityChange(ent)}
            style={{
              padding: '6px 2px',
              fontSize: 9,
              fontWeight: 800,
              borderRadius: 4,
              border: `1px solid ${entity === ent ? (isContrast ? '#00ff00' : '#38bdf8') : styles.borderColor}`,
              background: entity === ent ? (isContrast ? '#00ff00' : '#0369a1') : (isContrast ? '#000000' : '#0f172a'),
              color: entity === ent ? (isContrast ? '#000000' : '#ffffff') : (isContrast ? '#00ff00' : '#94a3b8'),
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {ent === 'zones' && '🚨 Zones'}
            {ent === 'resources' && '🏥 Supplies'}
            {ent === 'responders' && '🧑‍🚒 Units'}
            {ent === 'corridors' && '🌐 Corridors'}
          </button>
        ))}
      </div>

      {/* Format & Template Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => handleFormatChange('csv')}
            style={{
              padding: '2px 8px',
              fontSize: 9,
              fontWeight: 700,
              borderRadius: 3,
              border: `1px solid ${format === 'csv' ? (isContrast ? '#00ff00' : '#0284c7') : styles.borderColor}`,
              background: format === 'csv' ? (isContrast ? '#00ff00' : '#0284c7') : 'transparent',
              color: format === 'csv' ? (isContrast ? '#000000' : '#ffffff') : (isContrast ? '#00ff00' : '#94a3b8'),
              cursor: 'pointer',
            }}
          >
            CSV Format
          </button>
          <button
            onClick={() => handleFormatChange('json')}
            style={{
              padding: '2px 8px',
              fontSize: 9,
              fontWeight: 700,
              borderRadius: 3,
              border: `1px solid ${format === 'json' ? (isContrast ? '#00ff00' : '#0284c7') : styles.borderColor}`,
              background: format === 'json' ? (isContrast ? '#00ff00' : '#0284c7') : 'transparent',
              color: format === 'json' ? (isContrast ? '#000000' : '#ffffff') : (isContrast ? '#00ff00' : '#94a3b8'),
              cursor: 'pointer',
            }}
          >
            JSON Schema
          </button>
        </div>

        <button
          onClick={() => {
            setPayload(format === 'csv' ? TEMPLATES[entity].csv : TEMPLATES[entity].json);
            triggerHaptic('tap');
          }}
          style={{
            background: 'transparent',
            border: `1px dashed ${styles.borderColor}`,
            color: isContrast ? '#00ff00' : '#38bdf8',
            padding: '2px 6px',
            fontSize: 8,
            cursor: 'pointer',
            borderRadius: 3,
          }}
        >
          🔄 Reload Template
        </button>
      </div>

      {/* Live Monospace Buffer */}
      <div style={{ position: 'relative', flex: 1, minHeight: 180, display: 'flex', flexDirection: 'column' }}>
        <textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          spellCheck={false}
          style={{
            flex: 1,
            width: '100%',
            background: '#020617',
            color: isContrast ? '#00ff00' : '#e2e8f0',
            border: `${styles.borderWidth} solid ${styles.borderColor}`,
            borderRadius: 6,
            padding: 8,
            fontSize: 10,
            fontFamily: 'monospace',
            lineHeight: 1.4,
            resize: 'none',
            outline: 'none',
          }}
        />

        {/* Buffer Stats Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 8,
          color: isContrast ? '#00ff00' : '#64748b',
          marginTop: 4,
        }}>
          <span>{lineCount} lines | {charCount} chars</span>
          <span>Target: {TEMPLATES[entity].endpoint}</span>
        </div>
      </div>

      {/* Notification Toast */}
      {statusMsg && (
        <div style={{
          marginTop: 8,
          padding: '6px 10px',
          borderRadius: 4,
          fontSize: 9,
          fontWeight: 700,
          background: statusMsg.type === 'success' ? (isContrast ? '#000000' : '#064e3b') : (isContrast ? '#000000' : '#7f1d1d'),
          color: statusMsg.type === 'success' ? (isContrast ? '#00ff00' : '#34d399') : (isContrast ? '#ff3333' : '#f87171'),
          border: `1px solid ${statusMsg.type === 'success' ? (isContrast ? '#00ff00' : '#10b981') : (isContrast ? '#ff3333' : '#ef4444')}`,
        }}>
          {statusMsg.type === 'success' ? '✅ ' : '❌ '}
          {statusMsg.text}
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleUpload}
        disabled={isUploading}
        style={{
          marginTop: 8,
          padding: '10px',
          background: isContrast ? '#00ff00' : 'linear-gradient(135deg, #0284c7, #2563eb)',
          color: isContrast ? '#000000' : '#ffffff',
          border: 'none',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: '0.08em',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          opacity: isUploading ? 0.7 : 1,
          textTransform: 'uppercase',
          boxShadow: isContrast ? '0 0 10px #00ff00' : '0 4px 14px rgba(2,132,199,0.35)',
        }}
      >
        {isUploading ? 'Ingesting Batch...' : `🚀 Execute Bulk Ingestion (${format.toUpperCase()})`}
      </button>
    </div>
  );
}
