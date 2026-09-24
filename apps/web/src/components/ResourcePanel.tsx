import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Socket } from 'socket.io-client';
import type { ResourceHub } from '@mirage/shared-types';
import { SOCKET_EVENTS } from '@mirage/shared-types';
import { useAppTheme } from '../hooks/ThemeContext';

import { API_URL } from '../config';

const CATEGORY_ICONS: Record<string, string> = {
  food: '🍱', medical: '🏥', personnel: '👤', equipment: '🔧',
};
const CATEGORY_COLORS: Record<string, string> = {
  food: '#f59e0b', medical: '#f87171', personnel: '#38bdf8', equipment: '#a78bfa',
};

interface Props { socket: Socket | null; }

export function ResourcePanel({ socket }: Props) {
  const { styles, themeMode, triggerHaptic, t } = useAppTheme();
  const [hubs, setHubs] = useState<ResourceHub[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/resources`).then((r) => r.json()).then((data: ResourceHub[]) => {
      setHubs(safeData);
      if (safeData.length > 0) setExpanded(safeData[0]._id);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on(SOCKET_EVENTS.RESOURCE_UPDATED, (hub: ResourceHub) => {
      setHubs((prev) => prev.map((h) => (h._id === hub._id ? hub : h)));
      triggerHaptic('tap');
    });
    socket.on(SOCKET_EVENTS.RESOURCE_CREATED, (hub: ResourceHub) => {
      setHubs((prev) => [...prev, hub]);
      triggerHaptic('success');
    });
    socket.on(SOCKET_EVENTS.RESOURCE_DELETED, ({ id }: { id: string }) => {
      setHubs((prev) => prev.filter((h) => h._id !== id));
      triggerHaptic('warning');
    });
    return () => {
      socket.off(SOCKET_EVENTS.RESOURCE_UPDATED);
      socket.off(SOCKET_EVENTS.RESOURCE_CREATED);
      socket.off(SOCKET_EVENTS.RESOURCE_DELETED);
    };
  }, [socket]);

  const totalCapacity = hubs.reduce((s, h) => s + h.capacity, 0);
  const totalItems = hubs.reduce((s, h) => s + h.resources.reduce((r, i) => r + i.quantity, 0), 0);

  const isContrast = themeMode === 'contrast';

  return (
    <div style={{ padding: 12, fontFamily: styles.fontFamily, color: styles.textColor }}>
      {/* Summary row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, background: isContrast ? '#000000' : 'var(--glass-bg)', backdropFilter: isContrast ? 'none' : 'blur(var(--glass-blur))', border: `${styles.borderWidth} solid ${isContrast ? styles.borderColor : 'var(--glass-border)'}`, borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: isContrast ? '#00ff00' : '#38bdf8', fontFamily: 'monospace' }}>{hubs.length}</div>
          <div style={{ fontSize: 9, color: isContrast ? '#00ff00' : 'var(--text-footnote)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('hubs')}</div>
        </div>
        <div style={{ flex: 1, background: isContrast ? '#000000' : 'var(--glass-bg)', backdropFilter: isContrast ? 'none' : 'blur(var(--glass-blur))', border: `${styles.borderWidth} solid ${isContrast ? styles.borderColor : 'var(--glass-border)'}`, borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: isContrast ? '#00ff00' : '#34d399', fontFamily: 'monospace' }}>{totalCapacity}</div>
          <div style={{ fontSize: 9, color: isContrast ? '#00ff00' : 'var(--text-footnote)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('capacity')}</div>
        </div>
        <div style={{ flex: 1, background: isContrast ? '#000000' : 'var(--glass-bg)', backdropFilter: isContrast ? 'none' : 'blur(var(--glass-blur))', border: `${styles.borderWidth} solid ${isContrast ? styles.borderColor : 'var(--glass-border)'}`, borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: isContrast ? '#00ff00' : '#a78bfa', fontFamily: 'monospace' }}>{totalItems.toLocaleString()}</div>
          <div style={{ fontSize: 9, color: isContrast ? '#00ff00' : 'var(--text-footnote)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('items')}</div>
        </div>
      </div>

      {hubs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: isContrast ? '#00ff00' : 'var(--text-secondary)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
          <div style={{ fontSize: 12 }}>{t('noHubs')}</div>
        </div>
      )}

      {(Array.isArray(hubs) ? hubs : []).map((hub) => {
        const isOpen = expanded === hub._id;
        const lowStock = hub.resources.filter(r => r.quantity < 20).length;
        return (
          <motion.div key={hub._id} layout style={{ marginBottom: 8 }}>
            <div
              onClick={() => {
                setExpanded(isOpen ? null : hub._id);
                triggerHaptic('tap');
              }}
              style={{
                background: isOpen 
                  ? (isContrast ? '#000000' : 'var(--glass-bg-hover)') 
                  : (isContrast ? '#000000' : 'var(--glass-bg)'),
                backdropFilter: isContrast ? 'none' : 'blur(var(--glass-blur))',
                border: `${styles.borderWidth} solid ${isOpen ? (isContrast ? '#00ff00' : 'var(--blue)') : (isContrast ? styles.borderColor : 'var(--glass-border)')}`,
                borderRadius: isOpen ? '8px 8px 0 0' : 8,
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: isContrast ? 'none' : styles.glowShadow,
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 12, color: isContrast ? '#00ff00' : 'var(--text-primary)' }}>📦 {hub.name}</div>
                <div style={{ fontSize: 10, color: isContrast ? '#00ff00' : 'var(--text-secondary)', opacity: isContrast ? 0.8 : 1, marginTop: 2 }}>
                  {hub.resources.length} resource types · cap {hub.capacity}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {lowStock > 0 && (
                  <span style={{ 
                    fontSize: 9, 
                    fontWeight: 700, 
                    padding: '2px 6px', 
                    borderRadius: 4, 
                    background: isContrast ? 'transparent' : 'rgba(225, 29, 72, 0.1)', 
                    color: isContrast ? '#ff3333' : 'var(--rose)',
                    border: isContrast ? '1px solid #ff3333' : 'none'
                  }}>
                    {lowStock} LOW
                  </span>
                )}
                <span style={{ color: isContrast ? '#00ff00' : 'var(--text-secondary)', fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ 
                    overflow: 'hidden', 
                    background: isContrast ? '#000000' : 'var(--glass-bg)', 
                    backdropFilter: isContrast ? 'none' : 'blur(var(--glass-blur))',
                    border: `${styles.borderWidth} solid ${isContrast ? styles.borderColor : 'var(--glass-border)'}`, 
                    borderTop: 'none', 
                    borderRadius: '0 0 8px 8px' 
                  }}
                >
                  <div style={{ padding: '8px 12px' }}>
                    {hub.resources.map((item) => {
                      const pct = Math.min(100, (item.quantity / 2000) * 100);
                      const color = isContrast ? '#00ff00' : (CATEGORY_COLORS[item.category] ?? '#64748b');
                      return (
                        <div key={item._id} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: isContrast ? '#00ff00' : 'var(--text-secondary)' }}>
                              {CATEGORY_ICONS[item.category]} {item.name}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: item.quantity < 20 ? (isContrast ? '#ff3333' : 'var(--rose)') : (isContrast ? '#00ff00' : 'var(--mint)'), fontFamily: 'monospace' }}>
                              {item.quantity.toLocaleString()} {item.unit}
                            </span>
                          </div>
                          <div style={{ height: 4, background: isContrast ? '#111' : 'var(--glass-border)', borderRadius: 2 }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              style={{ 
                                height: '100%', 
                                background: color, 
                                borderRadius: 2,
                                boxShadow: isContrast ? '0 0 5px #00ff00' : 'none'
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
