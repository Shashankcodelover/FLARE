import { motion, AnimatePresence } from 'framer-motion';
import type { Volunteer, ZoneNeed, VolunteerRole } from '../hooks/useVolunteerSim';
import { useAppTheme } from '../hooks/ThemeContext';

interface Props {
  volunteers: Volunteer[];
  zoneNeeds: ZoneNeed[];
  dispatchMessages: string[];
  selectedVolunteer: Volunteer | null;
  onSelect: (v: Volunteer | null) => void;
  onDispatch: (volunteerId: string, zoneId: string) => void;
  onRecall: (volunteerId: string) => void;
  roleIcons: Record<VolunteerRole, string>;
  roleColors: Record<VolunteerRole, string>;
  zoneConfigs: { zoneId: string; zoneName: string; severity: string }[];
}

const STATUS_STYLE: Record<string, { bg: string; color: string; labelKey: string }> = {
  idle:     { bg: '#1e293b', color: '#94a3b8', labelKey: 'standby' },
  moving:   { bg: '#1c3a1c', color: '#86efac', labelKey: 'enRoute' },
  'in-zone':{ bg: '#3b1c1c', color: '#fca5a5', labelKey: 'insideDangerZone' },
  offline:  { bg: '#0f172a', color: '#475569', labelKey: 'offline' },
};

const NEED_STYLE: Record<string, { bg: string; color: string; icon: string; labelKey: string }> = {
  'critical-need': { bg: '#450a0a', color: '#fca5a5', icon: '🆘', labelKey: 'critical' },
  'needs-support': { bg: '#431407', color: '#fdba74', icon: '⚠', labelKey: 'medium' },
  'adequate':      { bg: '#052e16', color: '#86efac', icon: '✅', labelKey: 'active' },
  'overcrowded':   { bg: '#1e1b4b', color: '#c4b5fd', icon: '⬆', labelKey: 'high' },
};

export function VolunteerPanel({
  volunteers, zoneNeeds, dispatchMessages,
  selectedVolunteer, onSelect, onDispatch, onRecall,
  roleIcons, roleColors, zoneConfigs,
}: Props) {
  const { styles, themeMode, triggerHaptic, t } = useAppTheme();
  const isContrast = themeMode === 'contrast';

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: styles.fontFamily, color: styles.textColor }}>
      {/* Zone needs overview */}
      <div className={`px-3 py-2.5 shrink-0 border-b ${isContrast ? 'border-green-500' : 'border-[var(--glass-border)]'}`}>
        <div className={`text-[9px] uppercase tracking-widest mb-2 ${isContrast ? 'text-green-500' : 'text-[var(--text-footnote)]'}`}>
          {t('zoneCoverage')}
        </div>
        {zoneNeeds.map(need => {
          const style = NEED_STYLE[need.status];
          const pct = Math.min(100, (need.currentCount / need.requiredCount) * 100);
          return (
            <div 
              key={need.zoneId} 
              className={`mb-2 rounded-md px-2.5 py-1.5 border ${isContrast ? 'bg-black border-green-500' : ''}`}
              style={!isContrast ? { backgroundColor: style.bg, borderColor: style.color + '33' } : undefined}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`text-[11px] font-semibold ${isContrast ? 'text-green-500' : 'text-[var(--text-primary)]'}`}>
                  {need.zoneName}
                </span>
                <span 
                  className={`text-[9px] font-bold px-1.5 py-[1px] rounded-sm border ${isContrast ? 'text-green-500 bg-black border-green-500' : ''}`}
                  style={!isContrast ? { color: style.color, backgroundColor: style.bg, borderColor: style.color + '55' } : undefined}
                >
                  {style.icon} {t(style.labelKey)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`flex-1 h-1 rounded-full ${isContrast ? 'bg-[#111]' : 'bg-[var(--glass-border)]'}`}>
                  <motion.div
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5 }}
                    className={`h-full rounded-full ${isContrast ? 'bg-green-500 shadow-[0_0_5px_#00ff00]' : ''}`}
                    style={!isContrast ? { backgroundColor: style.color } : undefined}
                  />
                </div>
                <span 
                  className={`text-[10px] font-mono whitespace-nowrap ${isContrast ? 'text-green-500' : ''}`} 
                  style={!isContrast ? { color: style.color } : undefined}
                >
                  {need.currentCount}/{need.requiredCount}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Volunteer list */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 scrollbar-thin scrollbar-thumb-gray-500 hover:scrollbar-thumb-gray-400">
        <div className={`text-[9px] uppercase tracking-wider mb-2 ${isContrast ? 'text-green-500' : 'text-[var(--text-footnote)]'}`}>
          {t('volunteers')} ({volunteers.length})
        </div>

        {volunteers.map(v => {
          const st = STATUS_STYLE[v.status];
          const isSelected = selectedVolunteer?.id === v.id;
          return (
            <motion.div
              key={v.id}
              layout
              onClick={() => {
                onSelect(isSelected ? null : v);
                triggerHaptic('tap');
              }}
              className={`mb-1.5 rounded-lg cursor-pointer overflow-hidden transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 border ${
                isSelected 
                  ? (isContrast ? 'bg-black border-green-500' : 'bg-[var(--glass-bg-hover)] border-[var(--blue)] shadow-md') 
                  : (isContrast ? 'bg-black border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] border-[var(--glass-border)]')
              }`}
            >
              {/* Volunteer row */}
              <div className="px-2.5 py-2 flex items-center gap-2">
                {/* Avatar */}
                <div 
                  className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm border-2 ${isContrast ? 'bg-transparent border-green-500' : ''}`}
                  style={!isContrast ? { backgroundColor: roleColors[v.role] + '22', borderColor: roleColors[v.role] } : undefined}
                >
                  {v.gender === 'female' ? '👩' : '👨'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-semibold truncate ${isContrast ? 'text-green-500' : 'text-[var(--text-primary)]'}`}>
                      {v.name}
                    </span>
                    <span 
                      className={`text-[9px] font-bold px-1.5 py-[1px] rounded-sm border ml-2 shrink-0 ${isContrast ? 'bg-black text-green-500 border-green-500' : ''}`}
                      style={!isContrast ? { backgroundColor: st.bg, color: st.color, borderColor: st.color + '44' } : undefined}
                    >
                      {t(st.labelKey)}
                    </span>
                  </div>
                  <div 
                    className={`text-[10px] mt-0.5 ${isContrast ? 'text-green-500' : ''}`} 
                    style={!isContrast ? { color: roleColors[v.role] } : undefined}
                  >
                    {roleIcons[v.role]} {v.role.charAt(0).toUpperCase() + v.role.slice(1)}
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              <AnimatePresence initial={false}>
                {isSelected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`overflow-hidden border-t ${isContrast ? 'border-green-500' : 'border-[var(--glass-border)]'}`}
                  >
                    <div className="px-3 py-2.5">
                      {/* Skills */}
                      <div className="mb-2.5">
                        <div className={`text-[9px] uppercase tracking-wider mb-1.5 ${isContrast ? 'text-green-500' : 'text-[var(--text-footnote)]'}`}>
                          {t('skills')}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {v.skills.map(s => (
                            <span 
                              key={s} 
                              className={`text-[9px] px-2 py-0.5 rounded border ${isContrast ? 'bg-transparent text-green-500 border-green-500' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)]'}`}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Location */}
                      <div className={`text-[10px] mb-2.5 ${isContrast ? 'text-green-500' : 'text-[var(--text-secondary)]'}`}>
                        📍 {v.lat.toFixed(4)}, {v.lng.toFixed(4)}
                        {v.currentZoneId && (
                          <span className="text-[var(--rose)] ml-1.5 font-medium">
                            ⚠ {t('insideDangerZone')}
                          </span>
                        )}
                      </div>

                      {/* Dispatch controls */}
                      <div className={`text-[9px] uppercase tracking-wider mb-1.5 ${isContrast ? 'text-green-500' : 'text-[var(--text-footnote)]'}`}>
                        {t('dispatchTo')}
                      </div>
                      <div className="flex flex-col gap-1">
                        {zoneConfigs.map(z => (
                          <button
                            key={z.zoneId}
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              onDispatch(v.id, z.zoneId); 
                              triggerHaptic('success');
                            }}
                            disabled={v.assignedZoneId === z.zoneId}
                            className={`px-2.5 py-1.5 rounded text-[10px] font-semibold text-left border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 ${
                              v.assignedZoneId === z.zoneId
                                ? (isContrast ? 'bg-black text-[#555] border-[#555] cursor-default' : 'bg-[var(--glass-bg)] text-[var(--text-footnote)] border-[var(--glass-border)] cursor-default')
                                : (isContrast ? 'bg-black text-green-500 border-green-500 hover:bg-green-500/10 cursor-pointer' : 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--blue)] cursor-pointer hover:bg-white/10')
                            }`}
                          >
                            {v.assignedZoneId === z.zoneId ? `✓ ${t('assigned')}` : `→ ${t('sendTo')}`} {z.zoneName}
                          </button>
                        ))}
                        {v.assignedZoneId && (
                          <button
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              onRecall(v.id); 
                              triggerHaptic('warning');
                            }}
                            className={`px-2.5 py-1.5 rounded text-[10px] font-semibold text-left border outline-none cursor-pointer mt-1 transition-colors focus-visible:ring-2 focus-visible:ring-red-500 ${
                              isContrast ? 'bg-black text-[#ff3333] border-[#ff3333] hover:bg-[#ff3333]/10' : 'bg-[rgba(225,29,72,0.1)] text-[var(--rose)] border-[var(--rose)] hover:bg-[rgba(225,29,72,0.2)]'
                            }`}
                          >
                            ↩ {t('recallToBase')}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Dispatch log */}
      {dispatchMessages.length > 0 && (
        <div className={`p-2.5 shrink-0 max-h-[120px] overflow-y-auto border-t z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.2)] ${
          isContrast ? 'bg-black border-green-500' : 'bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border-[var(--glass-border)]'
        }`}>
          <div className={`text-[9px] uppercase tracking-wider mb-1.5 ${isContrast ? 'text-green-500' : 'text-[var(--text-footnote)]'}`}>
            {t('dispatchLog')}
          </div>
          {dispatchMessages.map((msg, i) => (
            <div key={i} className={`text-[10px] mb-1 font-mono break-words ${isContrast ? 'text-green-500 opacity-70' : 'text-[var(--text-secondary)]'}`}>
              {msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
