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
    <div className="p-3" style={{ fontFamily: styles.fontFamily, color: styles.textColor }}>
      <div className="flex justify-between items-center mb-2.5">
        <span className={`text-[10px] uppercase tracking-[0.1em] ${isContrast ? 'text-green-500' : 'text-slate-500'}`}>
          Alert Log
        </span>
        <span className={`text-[10px] ${isContrast ? 'text-green-500' : 'text-slate-600'}`}>
          {alerts.length} events
        </span>
      </div>

      {alerts.length === 0 && (
        <div className={`text-center py-8 ${isContrast ? 'text-green-500' : 'text-[var(--text-secondary)]'}`}>
          <div className="text-[28px] mb-2">✅</div>
          <div className="text-xs">No active alerts</div>
          <div className={`text-[10px] mt-1 ${isContrast ? 'text-green-500 opacity-70' : 'text-[var(--text-footnote)]'}`}>All zones clear</div>
        </div>
      )}

      <AnimatePresence initial={false}>
        {alerts.map((alert, i) => (
          <motion.div
            key={`${alert.zoneId}-${alert.timestamp}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`mb-2.5 relative rounded-lg p-3 ${!isContrast ? 'glass-card' : ''}`}
            style={{
              background: isContrast 
                ? '#000000' 
                : (alert.type === 'enter' ? 'rgba(225, 29, 72, 0.05)' : 'rgba(14, 156, 116, 0.05)'),
              border: isContrast
                ? `2px solid ${alert.type === 'enter' ? '#ff3333' : '#00ff00'}`
                : `1px solid ${alert.type === 'enter' ? 'rgba(225, 29, 72, 0.3)' : 'rgba(14, 156, 116, 0.3)'}`,
              boxShadow: isContrast ? 'none' : 'var(--glass-shadow)',
            }}
          >
            <div className="flex justify-between items-start">
              <div className="flex gap-2.5 items-start">
                <span className="text-lg leading-[1.2]">{alert.type === 'enter' ? '🚨' : '✅'}</span>
                <div>
                  <div className={`text-xs font-bold ${isContrast ? (alert.type === 'enter' ? 'text-[#ff3333]' : 'text-green-500') : (alert.type === 'enter' ? 'text-[var(--rose)]' : 'text-[var(--mint)]')}`}>
                    {alert.type === 'enter' ? t('breach') : t('cleared')}
                  </div>
                  <div className={`text-[11px] mt-1 ${isContrast ? 'text-green-500' : 'text-[var(--text-secondary)]'}`}>
                    Zone: <strong className={isContrast ? 'text-green-500' : 'text-[var(--text-primary)]'}>{alert.zoneName}</strong>
                  </div>
                  <div className={`text-[10px] mt-0.5 ${isContrast ? 'text-green-500' : 'text-[var(--text-footnote)]'}`}>
                    Responder: {alert.responderId.slice(0, 12)}
                  </div>
                  <div className={`text-[9px] mt-1 ${isContrast ? 'text-green-500' : 'text-[var(--text-footnote)]'}`}>
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  onDismiss(i);
                  triggerHaptic('tap');
                }}
                className={`bg-transparent border-none cursor-pointer text-sm p-1 outline-none transition-colors duration-200 hover:opacity-75 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-400 rounded-full ${isContrast ? 'text-[#ff3333]' : 'text-[var(--text-footnote)]'}`}
                aria-label="Dismiss Alert"
              >✕</button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
