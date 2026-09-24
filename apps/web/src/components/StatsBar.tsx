import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppTheme } from '../hooks/ThemeContext';

interface Stat {
  labelKey: string;
  value: string | number;
  subKey?: string;
  subVal?: string;
  color?: string;
  critical?: boolean;
}

export function StatsBar() {
  const [tick, setTick] = useState(0);
  const { styles, themeMode, t } = useAppTheme();

  // Simulate live updating numbers
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const stats: Stat[] = [
    { labelKey: 'activeZones', value: 3, subVal: '1 ' + t('critical'), color: '#f87171', critical: true },
    { labelKey: 'responders', value: 4, subVal: '1 in danger', color: '#fbbf24' },
    { labelKey: 'resourceHubs', value: 3, subVal: '1,600 cap total', color: '#38bdf8' },
    { labelKey: 'geofenceChecks', value: `${(tick * 7 + 142).toLocaleString()}`, subVal: 'last 60s', color: '#a78bfa' },
    { labelKey: 'p2pSyncOps', value: `${(tick * 3 + 28).toLocaleString()}`, subVal: 'delta updates', color: '#34d399' },
    { labelKey: 'meshLatency', value: `${12 + (tick % 5)}ms`, subVal: 'avg round-trip', color: '#22c55e' },
    { labelKey: 'offlineQueue', value: 0, subVal: 'pending ops', color: '#64748b' },
    { labelKey: 'crdtConflicts', value: 0, subVal: 'resolved', color: '#64748b' },
  ];

  return (
    <div style={{
      display: 'flex',
      background: themeMode === 'contrast' ? styles.statsBarBg : 'var(--glass-bg)',
      backdropFilter: themeMode === 'contrast' ? 'none' : 'var(--glass-blur)',
      borderBottom: themeMode === 'contrast' ? `${styles.borderWidth} solid ${styles.borderColor}` : '1px solid var(--glass-border)',
      flexShrink: 0,
      overflowX: 'auto',
      fontFamily: styles.fontFamily,
    }}>
      {stats.map((stat) => (
        <div key={stat.labelKey} style={{
          flex: '0 0 auto',
          padding: '6px 20px',
          borderRight: themeMode === 'contrast' ? '1px solid #00ff00' : '1px solid var(--glass-border)',
          minWidth: 120,
        }}>
          <div style={{ 
            fontSize: 9, 
            color: themeMode === 'contrast' ? '#00ff00' : 'var(--text-secondary)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.12em', 
            marginBottom: 2 
          }}>
            {t(stat.labelKey)}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <motion.span
              key={`${stat.value}-${tick}`}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              style={{ 
                fontSize: 18, 
                fontWeight: 800, 
                color: themeMode === 'contrast' ? '#00ff00' : (stat.color ?? 'var(--text-primary)'), 
                fontFamily: 'monospace', 
                lineHeight: 1 
              }}
            >
              {stat.value}
            </motion.span>
            {stat.critical && (
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{ fontSize: 8, color: '#f87171', fontWeight: 700 }}
              >●</motion.span>
            )}
          </div>
          {stat.subVal && (
            <div style={{ 
              fontSize: 9, 
              color: themeMode === 'contrast' ? '#00ff00' : 'var(--text-footnote)', 
              opacity: themeMode === 'contrast' ? 0.7 : 1,
              marginTop: 1 
            }}>
              {stat.subVal}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
