import { useAppTheme } from '../hooks/ThemeContext';
import { motion } from 'framer-motion';

interface Props {
  connected: boolean;
  peerCount: number;
}

export function MeshTopology({ connected, peerCount }: Props) {
  const { styles, themeMode } = useAppTheme();
  const isContrast = themeMode === 'contrast';

  // Define graph layout parameters
  const width = 300;
  const height = 220;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 65;

  // Generate peer node coordinates orbiting the center
  const peers = Array.from({ length: peerCount }).map((_, i) => {
    const angle = (i * 2 * Math.PI) / peerCount;
    return {
      id: `Peer-${i + 1}`,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      latency: `${12 + (i * 4) + (Math.floor(Math.random() * 3))}ms`,
    };
  });

  return (
    <div className="p-3 flex flex-col h-full" style={{ fontFamily: styles.fontFamily, color: styles.textColor }}>
      <div className="flex justify-between items-center mb-2.5">
        <span className={`text-[10px] uppercase tracking-widest ${isContrast ? 'text-green-500' : 'text-slate-500'}`}>
          Mesh Health & Topology
        </span>
        <span className={`text-[10px] ${isContrast ? 'text-green-500' : 'text-slate-600'}`}>
          {peerCount + (connected ? 1 : 0)} Active Nodes
        </span>
      </div>

      {/* Topology SVG Canvas */}
      <div 
        className={`rounded-lg p-2 flex items-center justify-center relative ${isContrast ? 'bg-black border border-green-500' : 'bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-[var(--glass-blur)]'}`}
      >
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          {/* Connector lines to Central Server */}
          {connected && peers.map((peer) => (
            <motion.line
              key={`link-srv-${peer.id}`}
              x1={centerX}
              y1={centerY}
              x2={peer.x}
              y2={peer.y}
              stroke={isContrast ? '#00ff00' : '#1e3a5f'}
              strokeWidth={1.5}
              strokeDasharray={isContrast ? '4, 4' : '4 4'}
              animate={{ strokeDashoffset: [0, -8] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          ))}

          {/* Peer-to-Peer Mesh connector links */}
          {peers.map((peer, idx) => {
            const nextPeer = peers[(idx + 1) % peers.length];
            if (peer.id === nextPeer?.id) return null;
            return (
              <motion.line
                key={`link-mesh-${peer.id}`}
                x1={peer.x}
                y1={peer.y}
                x2={nextPeer.x}
                y2={nextPeer.y}
                stroke={isContrast ? '#00ff00' : '#0369a1'}
                strokeWidth={1}
                strokeDasharray="2, 2"
                animate={{ strokeDashoffset: [0, -4] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            );
          })}

          {/* Central Server Node */}
          {connected && (
            <g>
              {/* Pulse glow */}
              <motion.circle
                cx={centerX}
                cy={centerY}
                r={24}
                fill="none"
                stroke={isContrast ? '#00ff00' : '#0284c7'}
                strokeWidth={1}
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <circle
                cx={centerX}
                cy={centerY}
                r={12}
                fill={isContrast ? '#000000' : '#0f172a'}
                stroke={isContrast ? '#00ff00' : '#0ea5e9'}
                strokeWidth={2}
              />
              <text
                x={centerX}
                y={centerY + 3}
                fill={isContrast ? '#00ff00' : '#38bdf8'}
                fontSize={8}
                fontWeight="bold"
                textAnchor="middle"
              >
                SRV
              </text>
            </g>
          )}

          {/* Offline Server marker */}
          {!connected && (
            <circle
              cx={centerX}
              cy={centerY}
              r={12}
              fill={isContrast ? '#000000' : '#1e293b'}
              stroke={isContrast ? '#ff3333' : '#64748b'}
              strokeWidth={2}
              opacity={0.5}
            />
          )}

          {/* Orbiting Peer Nodes */}
          {peers.map((peer, i) => (
            <g key={peer.id}>
              {/* Connection links label */}
              <text
                x={(centerX + peer.x) / 2}
                y={(centerY + peer.y) / 2 - 3}
                fill={isContrast ? '#00ff00' : '#64748b'}
                fontSize={7}
                fontFamily="monospace"
                textAnchor="middle"
              >
                {peer.latency}
              </text>

              <circle
                cx={peer.x}
                cy={peer.y}
                r={8}
                fill={isContrast ? '#000000' : '#030712'}
                stroke={isContrast ? '#00ff00' : '#a78bfa'}
                strokeWidth={2}
              />
              <text
                x={peer.x}
                y={peer.y + 12}
                fill={isContrast ? '#00ff00' : '#e2e8f0'}
                fontSize={7}
                fontWeight="bold"
                textAnchor="middle"
              >
                PEER {i + 1}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className={`mt-3 text-[10px] leading-relaxed ${isContrast ? 'text-green-500' : 'text-slate-500'}`}>
        <div className={`font-bold mb-1 ${isContrast ? 'text-green-500' : 'text-slate-400'}`}>Mesh Network Parameters</div>
        * Protocol: WebRTC full-mesh data channels<br />
        * Multi-hop status: Active (relay enabled)<br />
        * Standalone sync: CRDT delta updates active
      </div>
    </div>
  );
}
