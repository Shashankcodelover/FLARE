import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, Badge } from '@mirage/ui';
import { ResourcePanel } from '../ResourcePanel';
import type { Socket } from 'socket.io-client';

interface LogisticsDeckProps {
  socket: Socket | null;
  triggerHaptic: (pattern: 'sos' | 'success' | 'warning' | 'tap') => void;
}

export function LogisticsDeck({ socket, triggerHaptic }: LogisticsDeckProps) {
  const [mergeStatus, setMergeStatus] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  // Mock CRDT Ledger Entries
  const [ledger] = useState([
    { id: 'tx-101', item: 'Trauma Medical Kits', delta: '+50 units', peer: 'Peer_Alpha', state: 'Merged via YATA' },
    { id: 'tx-102', item: 'Potable Drinking Water (L)', delta: '-120 units', peer: 'Peer_Beta', state: 'Resolved (Last-Write-Wins)' },
    { id: 'tx-103', item: 'Blood Plasma Type O-', delta: '+15 units', peer: 'HQ_Field_Hub', state: 'Conflict-Free Synced' },
    { id: 'tx-104', item: 'Emergency Blankets', delta: '+200 units', peer: 'Peer_Gamma', state: 'Merged via YATA' },
  ]);

  const handleForceMerge = () => {
    setIsMerging(true);
    triggerHaptic('tap');
    setTimeout(() => {
      setIsMerging(false);
      setMergeStatus('Y.Doc State Vectors fully reconciled across 3 WebRTC peers and Redis cluster.');
      triggerHaptic('success');
      setTimeout(() => setMergeStatus(null), 5000);
    }, 800);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative p-4 sm:p-6 gap-6 max-w-7xl mx-auto w-full">
      {/* Left Column: Direct Supply Management Panel (4 cols) */}
      <div className="w-full lg:w-[420px] shrink-0 flex flex-col gap-4 overflow-y-auto">
        <Card variant="glass" className="p-5 border border-amber-500/30">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold font-tactical text-slate-900 dark:text-white">
                Logistics Supply Deck
              </h2>
              <p className="text-xs text-slate-500">
                CRDT-backed distributed resource inventories
              </p>
            </div>
            <Badge variant="tactical-yellow">
              YJS ACTIVE
            </Badge>
          </div>

          <Button
            variant="tactical-green"
            size="md"
            className="w-full font-bold shadow-lg mb-2"
            disabled={isMerging}
            onClick={handleForceMerge}
          >
            {isMerging ? 'Merging State Vectors...' : '⚡ Force CRDT State Merge'}
          </Button>

          {mergeStatus && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-emerald-600 dark:text-emerald-400 font-mono p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
            >
              ✓ {mergeStatus}
            </motion.div>
          )}
        </Card>

        {/* Existing ResourcePanel Component wrapped inside glass card */}
        <div className="flex-1 min-h-[350px] glass-panel bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl overflow-y-auto">
          <ResourcePanel socket={socket} />
        </div>
      </div>

      {/* Right Column: CRDT Ledger & Redis Telemetry (8 cols) */}
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto min-w-0">
        {/* Redis Horizontal Cluster Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="glass" className="p-4 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold uppercase text-slate-500 mb-1">
              Redis Horizontal Adapters
            </div>
            <div className="text-2xl font-black font-tactical text-slate-900 dark:text-white">
              3 Nodes
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-1">
              ● Cluster Health: 100%
            </div>
          </Card>

          <Card variant="glass" className="p-4 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold uppercase text-slate-500 mb-1">
              Message Replication Delay
            </div>
            <div className="text-2xl font-black font-tactical text-slate-900 dark:text-white">
              1.4 ms
            </div>
            <div className="text-xs text-slate-500 font-mono mt-1">
              Sub-millisecond intra-mesh
            </div>
          </Card>

          <Card variant="glass" className="p-4 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold uppercase text-slate-500 mb-1">
              YATA CRDT Operations
            </div>
            <div className="text-2xl font-black font-tactical text-slate-900 dark:text-white">
              1,248 ops
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-1">
              Zero Collisions Detected
            </div>
          </Card>
        </div>

        {/* Conflict-Free Transaction History Ledger */}
        <Card variant="glass" className="p-5 border border-slate-200 dark:border-slate-800 flex-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold font-tactical text-slate-900 dark:text-white">
                CRDT Distributed Transaction Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Peer mutations merged with mathematically proven convergence
              </p>
            </div>
            <Badge variant="tactical-yellow">
              TRANSACTIONAL LOG
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                  <th className="pb-3">Op ID</th>
                  <th className="pb-3">Resource Item</th>
                  <th className="pb-3">Quantity Delta</th>
                  <th className="pb-3">Origin Node</th>
                  <th className="pb-3">Convergence Rule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {ledger.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 text-slate-400">{row.id}</td>
                    <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">{row.item}</td>
                    <td className="py-3 text-emerald-600 dark:text-emerald-400 font-bold">{row.delta}</td>
                    <td className="py-3 text-slate-500">{row.peer}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {row.state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
