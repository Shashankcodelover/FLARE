import { useState, useEffect } from 'react';
import { useAppTheme } from '../hooks/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  connected: boolean;
  peerCount: number;
}

interface MeshCorridor {
  id: string;
  sourceNode: string;
  targetNode: string;
  protocol: 'WebRTC-Mesh' | 'LoRa-P2P' | 'Satellite-SBD' | 'UHF-Tactical' | 'gRPC-Tunnel';
  bandwidthMbps: number;
  latencyMs: number;
  packetLoss: number;
  encryption: 'PQC-Kyber' | 'ECDH-P256' | 'AES-256-GCM';
  status: 'active' | 'degraded' | 'severed';
  environment: 'operational' | 'contingency' | 'evacuation';
  lastHeartbeat: string;
}

interface TopologyMetrics {
  totalCorridors: number;
  activeCorridors: number;
  avgHopLatencyMs: number;
  avgPacketLossPct: number;
  totalThroughputMbps: number;
  encryptionCompliancePct: number;
}

export function MeshTopology({ connected, peerCount }: Props) {
  const { styles, themeMode, triggerHaptic } = useAppTheme();
  const isContrast = themeMode === 'contrast';

  const [corridors, setCorridors] = useState<MeshCorridor[]>([]);
  const [metrics, setMetrics] = useState<TopologyMetrics | null>(null);
  const [selectedEnv, setSelectedEnv] = useState<'all' | 'operational' | 'contingency' | 'evacuation'>('all');
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [sourceNode, setSourceNode] = useState('FEMA Incident Command Post (ICP)');
  const [targetNode, setTargetNode] = useState('');
  const [protocol, setProtocol] = useState<MeshCorridor['protocol']>('WebRTC-Mesh');
  const [bandwidthMbps, setBandwidthMbps] = useState('25.0');
  const [latencyMs, setLatencyMs] = useState('18.0');
  const [encryption, setEncryption] = useState<MeshCorridor['encryption']>('PQC-Kyber');

  const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';

  const fetchTopology = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/v1/topology`);
      const data = await res.json();
      if (data.success && data.data) {
        setCorridors(data.data.corridors);
        setMetrics(data.data.metrics);
      }
    } catch (err) {
      console.error('Failed to load topology:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopology();
    const timer = setInterval(fetchTopology, 8000);
    return () => clearInterval(timer);
  }, []);

  const handleSeverCorridor = async (id: string) => {
    if (!window.confirm(`⚠️ SEVER CORRIDOR CONFIRMATION\nSever mesh link ${id}? Traffic will be rerouted over secondary mesh relays.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/v1/topology/corridors/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCorridors((prev) => prev.filter((c) => c.id !== id));
        triggerHaptic('warning');
        fetchTopology();
      }
    } catch (err) {
      console.error('Sever failed:', err);
    }
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetNode.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/v1/topology/corridors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceNode,
          targetNode,
          protocol,
          bandwidthMbps: parseFloat(bandwidthMbps) || 10.0,
          latencyMs: parseFloat(latencyMs) || 20.0,
          encryption,
          environment: 'operational',
        }),
      });

      if (res.ok) {
        setShowProvisionModal(false);
        setTargetNode('');
        triggerHaptic('success');
        fetchTopology();
      }
    } catch (err) {
      console.error('Provision failed:', err);
    }
  };

  const filteredCorridors = corridors.filter(
    (c) => selectedEnv === 'all' || c.environment === selectedEnv
  );

  // Define graph layout parameters
  const width = 320;
  const height = 180;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 60;

  const displayNodes = filteredCorridors.slice(0, 6).map((c, i, arr) => {
    const angle = (i * 2 * Math.PI) / (arr.length || 1);
    return {
      id: c.id,
      name: c.targetNode.split(' ')[0] || `Node-${i + 1}`,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      protocol: c.protocol,
      latency: `${c.latencyMs}ms`,
      status: c.status,
    };
  });

  return (
    <div style={{ padding: 12, fontFamily: styles.fontFamily, color: styles.textColor, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 900, color: isContrast ? '#00ff00' : '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            🌐 Relational Mesh Topology
          </span>
          <div style={{ fontSize: 9, color: isContrast ? '#00ff00' : '#64748b' }}>
            Autonomous peer relays & zero-trust corridor management
          </div>
        </div>
        <button
          onClick={() => setShowProvisionModal(true)}
          style={{
            background: isContrast ? '#00ff00' : '#0284c7',
            color: isContrast ? '#000000' : '#ffffff',
            border: 'none',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 9,
            fontWeight: 800,
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          + Provision Corridor
        </button>
      </div>

      {/* Telemetry KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 8 }}>
        <div style={{ background: '#020617', border: `1px solid ${styles.borderColor}`, borderRadius: 4, padding: '4px 6px', textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: '#64748b' }}>ACTIVE RELAYS</div>
          <div style={{ fontSize: 12, fontWeight: 900, color: isContrast ? '#00ff00' : '#22c55e' }}>
            {metrics ? metrics.activeCorridors : peerCount + (connected ? 1 : 0)}
          </div>
        </div>
        <div style={{ background: '#020617', border: `1px solid ${styles.borderColor}`, borderRadius: 4, padding: '4px 6px', textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: '#64748b' }}>AVG RTT</div>
          <div style={{ fontSize: 12, fontWeight: 900, color: isContrast ? '#00ff00' : '#38bdf8' }}>
            {metrics ? `${metrics.avgHopLatencyMs}ms` : '18.4ms'}
          </div>
        </div>
        <div style={{ background: '#020617', border: `1px solid ${styles.borderColor}`, borderRadius: 4, padding: '4px 6px', textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: '#64748b' }}>THROUGHPUT</div>
          <div style={{ fontSize: 12, fontWeight: 900, color: isContrast ? '#00ff00' : '#a78bfa' }}>
            {metrics ? `${metrics.totalThroughputMbps}M` : '210M'}
          </div>
        </div>
        <div style={{ background: '#020617', border: `1px solid ${styles.borderColor}`, borderRadius: 4, padding: '4px 6px', textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: '#64748b' }}>PQC KYBER</div>
          <div style={{ fontSize: 12, fontWeight: 900, color: isContrast ? '#00ff00' : '#f59e0b' }}>
            {metrics ? `${metrics.encryptionCompliancePct}%` : '100%'}
          </div>
        </div>
      </div>

      {/* SVG Canvas Visualizer */}
      <div style={{
        background: '#020617',
        border: `${styles.borderWidth} solid ${styles.borderColor}`,
        borderRadius: 6,
        padding: 6,
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
          {/* Connector Beams to Central Command */}
          {displayNodes.map((node) => (
            <line
              key={`link-${node.id}`}
              x1={centerX}
              y1={centerY}
              x2={node.x}
              y2={node.y}
              stroke={isContrast ? '#00ff00' : node.status === 'degraded' ? '#f59e0b' : '#0369a1'}
              strokeWidth={1.5}
              strokeDasharray={node.protocol.includes('LoRa') || node.protocol.includes('Satellite') ? '3, 3' : undefined}
            />
          ))}

          {/* Inter-Node Links */}
          {displayNodes.map((node, idx) => {
            const nextNode = displayNodes[(idx + 1) % displayNodes.length];
            return (
              <line
                key={`inter-${node.id}`}
                x1={node.x}
                y1={node.y}
                x2={nextNode.x}
                y2={nextNode.y}
                stroke={isContrast ? '#00ff00' : '#1e293b'}
                strokeWidth={1}
                strokeDasharray="2, 2"
              />
            );
          })}

          {/* Central Command Node */}
          <g>
            <motion.circle
              cx={centerX}
              cy={centerY}
              r={20}
              fill="none"
              stroke={isContrast ? '#00ff00' : '#0284c7'}
              strokeWidth={1}
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.1, 0.6] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            />
            <circle
              cx={centerX}
              cy={centerY}
              r={12}
              fill={isContrast ? '#000000' : '#0f172a'}
              stroke={isContrast ? '#00ff00' : '#38bdf8'}
              strokeWidth={2}
            />
            <text
              x={centerX}
              y={centerY + 3}
              fill={isContrast ? '#00ff00' : '#38bdf8'}
              fontSize={7}
              fontWeight="900"
              textAnchor="middle"
            >
              ICP
            </text>
          </g>

          {/* Satellite Orbiting Nodes */}
          {displayNodes.map((node) => (
            <g key={`node-${node.id}`}>
              <circle
                cx={node.x}
                cy={node.y}
                r={9}
                fill={isContrast ? '#000000' : '#030712'}
                stroke={isContrast ? '#00ff00' : node.status === 'degraded' ? '#f59e0b' : '#a78bfa'}
                strokeWidth={2}
              />
              <text
                x={node.x}
                y={node.y + 16}
                fill={isContrast ? '#00ff00' : '#cbd5e1'}
                fontSize={7}
                fontWeight="700"
                textAnchor="middle"
              >
                {node.name}
              </text>
              <text
                x={(centerX + node.x) / 2}
                y={(centerY + node.y) / 2 - 2}
                fill={isContrast ? '#00ff00' : '#64748b'}
                fontSize={6}
                fontFamily="monospace"
                textAnchor="middle"
              >
                {node.latency}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {(['all', 'operational', 'contingency', 'evacuation'] as const).map((env) => (
          <button
            key={env}
            onClick={() => {
              setSelectedEnv(env);
              triggerHaptic('tap');
            }}
            style={{
              padding: '3px 6px',
              fontSize: 8,
              fontWeight: 800,
              textTransform: 'uppercase',
              borderRadius: 3,
              border: `1px solid ${selectedEnv === env ? (isContrast ? '#00ff00' : '#38bdf8') : styles.borderColor}`,
              background: selectedEnv === env ? (isContrast ? '#00ff00' : '#0369a1') : 'transparent',
              color: selectedEnv === env ? (isContrast ? '#000000' : '#ffffff') : (isContrast ? '#00ff00' : '#64748b'),
              cursor: 'pointer',
            }}
          >
            {env}
          </button>
        ))}
      </div>

      {/* Interactive Corridor Matrix */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filteredCorridors.map((corridor) => (
          <div
            key={corridor.id}
            style={{
              background: isContrast ? '#000000' : '#090d16',
              border: `1px solid ${styles.borderColor}`,
              borderRadius: 4,
              padding: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: corridor.status === 'active' ? '#22c55e' : corridor.status === 'degraded' ? '#f59e0b' : '#ef4444',
                }} />
                <span style={{ fontSize: 9, fontWeight: 800, color: isContrast ? '#00ff00' : '#f1f5f9' }}>
                  {corridor.sourceNode}
                </span>
                <span style={{ fontSize: 8, color: '#64748b' }}>➔</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: isContrast ? '#00ff00' : '#94a3b8' }}>
                  {corridor.targetNode}
                </span>
              </div>

              <button
                onClick={() => handleSeverCorridor(corridor.id)}
                title="Sever compromised or degraded link"
                style={{
                  background: 'transparent',
                  border: `1px solid ${isContrast ? '#ff3333' : '#dc2626'}`,
                  color: isContrast ? '#ff3333' : '#ef4444',
                  borderRadius: 3,
                  padding: '1px 6px',
                  fontSize: 8,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Sever
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, fontSize: 8, color: '#64748b', fontFamily: 'monospace' }}>
              <span style={{ color: isContrast ? '#00ff00' : '#38bdf8' }}>{corridor.protocol}</span>
              <span>BW: {corridor.bandwidthMbps}Mbps</span>
              <span>RTT: {corridor.latencyMs}ms</span>
              <span>Loss: {corridor.packetLoss}%</span>
              <span style={{ color: isContrast ? '#00ff00' : '#a78bfa' }}>{corridor.encryption}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Provision Modal */}
      <AnimatePresence>
        {showProvisionModal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: '100%', maxWidth: 360,
                background: isContrast ? '#000000' : '#0f172a',
                border: `2px solid ${styles.borderColor}`,
                borderRadius: 8,
                padding: 16,
              }}
            >
              <h3 style={{ fontSize: 12, fontWeight: 900, marginBottom: 10, color: isContrast ? '#00ff00' : '#f1f5f9', textTransform: 'uppercase' }}>
                + Provision Mesh Relay Corridor
              </h3>
              <form onSubmit={handleProvision} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase' }}>Source Node</label>
                  <input
                    value={sourceNode}
                    onChange={(e) => setSourceNode(e.target.value)}
                    style={{ width: '100%', background: '#020617', border: `1px solid ${styles.borderColor}`, color: '#fff', padding: 4, borderRadius: 3, fontSize: 9 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase' }}>Target Node (Relay / Hub / Sector)</label>
                  <input
                    value={targetNode}
                    onChange={(e) => setTargetNode(e.target.value)}
                    placeholder="e.g. Field Hospital Bravo"
                    required
                    style={{ width: '100%', background: '#020617', border: `1px solid ${styles.borderColor}`, color: '#fff', padding: 4, borderRadius: 3, fontSize: 9 }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div>
                    <label style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase' }}>Protocol</label>
                    <select
                      value={protocol}
                      onChange={(e) => setProtocol(e.target.value as any)}
                      style={{ width: '100%', background: '#020617', border: `1px solid ${styles.borderColor}`, color: '#fff', padding: 4, borderRadius: 3, fontSize: 9 }}
                    >
                      <option value="WebRTC-Mesh">WebRTC-Mesh</option>
                      <option value="LoRa-P2P">LoRa-P2P</option>
                      <option value="Satellite-SBD">Satellite-SBD</option>
                      <option value="UHF-Tactical">UHF-Tactical</option>
                      <option value="gRPC-Tunnel">gRPC-Tunnel</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase' }}>Encryption</label>
                    <select
                      value={encryption}
                      onChange={(e) => setEncryption(e.target.value as any)}
                      style={{ width: '100%', background: '#020617', border: `1px solid ${styles.borderColor}`, color: '#fff', padding: 4, borderRadius: 3, fontSize: 9 }}
                    >
                      <option value="PQC-Kyber">PQC-Kyber</option>
                      <option value="ECDH-P256">ECDH-P256</option>
                      <option value="AES-256-GCM">AES-256-GCM</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowProvisionModal(false)}
                    style={{ flex: 1, background: 'transparent', border: `1px solid ${styles.borderColor}`, color: '#94a3b8', padding: 6, borderRadius: 4, fontSize: 9, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ flex: 1, background: isContrast ? '#00ff00' : '#0284c7', border: 'none', color: isContrast ? '#000' : '#fff', padding: 6, borderRadius: 4, fontSize: 9, fontWeight: 800, cursor: 'pointer' }}
                  >
                    Provision Link
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
