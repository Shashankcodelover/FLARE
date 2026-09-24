import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppTheme } from '../hooks/ThemeContext';

interface Stat {
  labelKey: string;
  value: string | number;
  subKey?: string;
  subVal?: string;
  colorClass?: string;
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
    { labelKey: 'activeZones', value: 3, subVal: '1 ' + t('critical'), colorClass: 'text-red-400', critical: true },
    { labelKey: 'responders', value: 4, subVal: '1 in danger', colorClass: 'text-yellow-400' },
    { labelKey: 'resourceHubs', value: 3, subVal: '1,600 cap total', colorClass: 'text-sky-400' },
    { labelKey: 'geofenceChecks', value: `${(tick * 7 + 142).toLocaleString()}`, subVal: 'last 60s', colorClass: 'text-purple-400' },
    { labelKey: 'p2pSyncOps', value: `${(tick * 3 + 28).toLocaleString()}`, subVal: 'delta updates', colorClass: 'text-emerald-400' },
    { labelKey: 'meshLatency', value: `${12 + (tick % 5)}ms`, subVal: 'avg round-trip', colorClass: 'text-green-500' },
    { labelKey: 'offlineQueue', value: 0, subVal: 'pending ops', colorClass: 'text-slate-500' },
    { labelKey: 'crdtConflicts', value: 0, subVal: 'resolved', colorClass: 'text-slate-500' },
  ];

  const isContrast = themeMode === 'contrast';

  return (
    <div 
      className={`flex shrink-0 overflow-x-auto ${isContrast ? 'bg-black border-b border-green-500' : 'bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border-b border-[var(--glass-border)]'}`} 
      style={{ fontFamily: styles.fontFamily }}
    >
      {stats.map((stat) => (
        <div 
          key={stat.labelKey} 
          className={`flex-none px-4 py-2 min-w-[120px] transition-colors hover:bg-black/5 ${isContrast ? 'border-r border-green-500' : 'border-r border-[var(--glass-border)]'}`}
        >
          <div className={`text-[9px] uppercase tracking-[0.12em] mb-0.5 ${isContrast ? 'text-green-500' : 'text-[var(--text-secondary)]'}`}>
            {t(stat.labelKey)}
          </div>
          <div className="flex items-baseline gap-1.5">
            <motion.span
              key={`${stat.value}-${tick}`}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              className={`text-lg font-extrabold font-mono leading-none ${isContrast ? 'text-green-500' : (stat.colorClass ?? 'text-[var(--text-primary)]')}`}
            >
              {stat.value}
            </motion.span>
            {stat.critical && (
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-[8px] text-red-400 font-bold"
              >
                ●
              </motion.span>
            )}
          </div>
          {stat.subVal && (
            <div className={`text-[9px] mt-[1px] ${isContrast ? 'text-green-500 opacity-70' : 'text-[var(--text-footnote)]'}`}>
              {stat.subVal}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
