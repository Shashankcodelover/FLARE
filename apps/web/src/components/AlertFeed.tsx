import { motion, AnimatePresence } from 'framer-motion';
import type { GeofenceAlert } from '@mirage/shared-types';
import { useAppTheme } from '../hooks/ThemeContext';

interface Props {
  alerts: GeofenceAlert[];
  onDismiss: (index: number) => void;
}

export function AlertFeed({ alerts, onDismiss }: Props) {
  const { styles, themeMode, triggerHaptic, t } = useAppTheme();
  const isContrast = themeMode === 'contrast';

  return (
    <div style={{ padding: 12, fontFamily: styles.fontFamily, color: styles.textColor }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 10, color: isContrast ? '#00ff00' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Alert Log
        </span>
        <span style={{ fontSize: 10, color: isContrast ? '#00ff00' : '#475569' }}>{alerts.length} events</span>
      </div>

      {alerts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: isContrast ? '#00ff00' : 'var(--text-secondary)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 12 }}>No active alerts</div>
          <div style={{ fontSize: 10, marginTop: 4, color: isContrast ? '#00ff00' : 'var(--text-footnote)', opacity: isContrast ? 0.7 : 1 }}>All zones clear</div>
        </div>
      )}

      <AnimatePresence initial={false}>
        {alerts.map((alert, i) => (
          <motion.div
            key={`${alert.zoneId}-${alert.timestamp}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={!isContrast ? 'glass-card' : ''}
            style={{
              marginBottom: 10,
              background: isContrast 
                ? '#000000' 
                : (alert.type === 'enter' ? 'rgba(225, 29, 72, 0.05)' : 'rgba(14, 156, 116, 0.05)'),
              border: isContrast
                ? `2px solid ${alert.type === 'enter' ? '#ff3333' : '#00ff00'}`
                : `1px solid ${alert.type === 'enter' ? 'rgba(225, 29, 72, 0.3)' : 'rgba(14, 156, 116, 0.3)'}`,
              borderRadius: 8,
              padding: '12px',
              position: 'relative',
              boxShadow: isContrast ? 'none' : 'var(--glass-shadow)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18, lineHeight: 1.2 }}>{alert.type === 'enter' ? '🚨' : '✅'}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isContrast ? (alert.type === 'enter' ? '#ff3333' : '#00ff00') : (alert.type === 'enter' ? 'var(--rose)' : 'var(--mint)') }}>
                    {alert.type === 'enter' ? t('breach') : t('cleared')}
                  </div>
                  <div style={{ fontSize: 11, color: isContrast ? '#00ff00' : 'var(--text-secondary)', marginTop: 4 }}>
                    Zone: <strong style={{ color: isContrast ? '#00ff00' : 'var(--text-primary)' }}>{alert.zoneName}</strong>
                  </div>
                  <div style={{ fontSize: 10, color: isContrast ? '#00ff00' : 'var(--text-footnote)', marginTop: 2 }}>
                    Responder: {alert.responderId.slice(0, 12)}
                  </div>
                  <div style={{ fontSize: 9, color: isContrast ? '#00ff00' : 'var(--text-footnote)', marginTop: 4 }}>
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  onDismiss(i);
                  triggerHaptic('tap');
                }}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: isContrast ? '#ff3333' : 'var(--text-footnote)', 
                  cursor: 'pointer', 
                  fontSize: 14, 
                  padding: 4,
                  outline: 'none',
                  transition: 'color 0.2s',
                }}
              >✕</button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
