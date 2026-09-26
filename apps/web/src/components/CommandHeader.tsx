import { motion, AnimatePresence } from 'framer-motion';
import type { SyncStatus } from '@mirage/crdt-logic';
import { useAppTheme } from '../hooks/ThemeContext';
import { LANG_LIST, Language, TextSize } from '../hooks/useTheme';
import { Button, Badge } from '@mirage/ui';

import type { User } from '@mirage/shared-types';

interface Props {
  connected: boolean;
  peerCount: number;
  syncStatus: SyncStatus;
  alertCount: number;
  onShowSitrep: () => void;
  activeDeck?: 'gateway' | 'hq' | 'responder' | 'logistics';
  onSelectDeck?: (deck: 'gateway' | 'hq' | 'responder' | 'logistics') => void;
  user?: User | null;
  onLogout?: () => void;
}

const FIFTY_LANGUAGES = [
  ...LANG_LIST,
  { code: 'pt', name: 'PortuguÃƒÂªs' },
  { code: 'it', name: 'Italiano' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'pl', name: 'Polski' },
  { code: 'sv', name: 'Svenska' },
  { code: 'no', name: 'Norsk' },
  { code: 'da', name: 'Dansk' },
  { code: 'fi', name: 'Suomi' },
  { code: 'tr', name: 'TÃƒÂ¼rkÃƒÂ§e' },
  { code: 'ko', name: 'Ã­â€¢Å“ÃªÂµÂ­Ã¬â€“Â´' },
  { code: 'vi', name: 'TiÃ¡ÂºÂ¿ng ViÃ¡Â»â€¡t' },
  { code: 'th', name: 'Ã Â¹â€žÃ Â¸â€”Ã Â¸Â¢' },
  { code: 'uk', name: 'ÃÂ£ÃÂºÃ‘â‚¬ÃÂ°Ã‘â€”ÃÂ½Ã‘ÂÃ‘Å’ÃÂºÃÂ°' },
  { code: 'el', name: 'ÃŽâ€¢ÃŽÂ»ÃŽÂ»ÃŽÂ·ÃŽÂ½ÃŽÂ¹ÃŽÂºÃŽÂ¬' },
  { code: 'cs', name: 'Ã„Å’eÃ…Â¡tina' },
  { code: 'hu', name: 'Magyar' },
  { code: 'ro', name: 'RomÃƒÂ¢nÃ„Æ’' },
  { code: 'bg', name: 'Ãâ€˜Ã‘Å ÃÂ»ÃÂ³ÃÂ°Ã‘â‚¬Ã‘ÂÃÂºÃÂ¸' },
  { code: 'he', name: 'Ã—Â¢Ã—â€˜Ã—Â¨Ã—â„¢Ã—Âª' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Bahasa Melayu' },
  { code: 'fa', name: 'Ã™ÂÃ˜Â§Ã˜Â±Ã˜Â³Ã›Å’' },
  { code: 'ur', name: 'Ã˜Â§Ã˜Â±Ã˜Â¯Ã™Ë†' },
  { code: 'bn', name: 'Ã Â¦Â¬Ã Â¦Â¾Ã Â¦â€šÃ Â¦Â²Ã Â¦Â¾' },
  { code: 'pa', name: 'Ã Â¨ÂªÃ Â©Â°Ã Â¨Å“Ã Â¨Â¾Ã Â¨Â¬Ã Â©â‚¬' },
  { code: 'gu', name: 'Ã Âªâ€”Ã Â«ÂÃ ÂªÅ“Ã ÂªÂ°Ã ÂªÂ¾Ã ÂªÂ¤Ã Â«â‚¬' },
  { code: 'ta', name: 'Ã Â®Â¤Ã Â®Â®Ã Â®Â¿Ã Â®Â´Ã Â¯Â' },
  { code: 'te', name: 'Ã Â°Â¤Ã Â±â€ Ã Â°Â²Ã Â±ÂÃ Â°â€”Ã Â±Â' },
  { code: 'kn', name: 'Ã Â²â€¢Ã Â²Â¨Ã Â³ÂÃ Â²Â¨Ã Â²Â¡' },
  { code: 'ml', name: 'Ã Â´Â®Ã Â´Â²Ã Â´Â¯Ã Â´Â¾Ã Â´Â³Ã Â´â€š' },
  { code: 'mr', name: 'Ã Â¤Â®Ã Â¤Â°Ã Â¤Â¾Ã Â¤Â Ã Â¥â‚¬' },
  { code: 'sw', name: 'Kiswahili' },
  { code: 'tl', name: 'Tagalog' },
];

export function CommandHeader({
  connected,
  peerCount,
  syncStatus,
  alertCount,
  onShowSitrep,
  activeDeck = 'hq',
  onSelectDeck,
  user,
  onLogout,
}: Props) {
  const {
    styles,
    themeMode,
    textSize,
    lang,
    userRole,
    changeRole,
    toggleTheme,
    changeTextSize,
    changeLanguage,
    triggerHaptic,
    t,
  } = useAppTheme();

  const now = new Date();
  const timeStr = now.toUTCString().replace('GMT', 'UTC');

  const handleLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as Language;
    changeLanguage(val);
  };

  const decks = [
    { id: 'gateway', label: 'Gateway', icon: 'Ã¢Å¡Â¡' },
    { id: 'hq', label: 'HQ Command', icon: 'Ã°Å¸â€ºÂ¡Ã¯Â¸Â' },
    { id: 'responder', label: 'Responder', icon: 'Ã°Å¸â€ºÂ°Ã¯Â¸Â' },
    { id: 'logistics', label: 'Logistics', icon: 'Ã°Å¸â€œÂ¦' },
  ] as const;

  return (
    <header
      role="banner"
      className="glass-panel border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between flex-shrink-0 relative z-[1300] gap-4"
    >
      {/* Scanline tactical overlay */}
      <div className="scanline-overlay opacity-30" />

      {/* Left Section: Branding & Role Switcher */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onSelectDeck?.('gateway')}
          className="flex items-center gap-2.5 text-left group cursor-pointer outline-none"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-600 to-emerald-500 flex items-center justify-center text-white font-black text-sm shadow-md group-hover:scale-105 transition-transform">
            FL
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-tactical font-black text-sm sm:text-base tracking-wider text-slate-900 dark:text-white">
                FLARE
              </span>
              <AnimatePresence>
                {alertCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="w-4 h-4 rounded-full bg-red-600 text-white font-bold text-[9px] flex items-center justify-center animate-pulse"
                  >
                    {alertCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">
              {t('mode')}
            </div>
          </div>
        </button>

        {/* Deck Nav Tabs */}
        {onSelectDeck && (
          <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl">
            {decks.map((deck) => {
              const isActive = activeDeck === deck.id;
              return (
                <button
                  key={deck.id}
                  onClick={() => {
                    onSelectDeck(deck.id);
                    triggerHaptic('tap');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>{deck.icon}</span>
                  <span>{deck.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Center Section: Telemetry & Time */}
      <div className="hidden xl:flex items-center gap-5">
        <StatusPill label={t('incident')} value={t('active')} color="#ea580c" pulse />
        <StatusPill label={t('threatLevel')} value={t('high')} color="#d97706" />
        <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800" />
        <div className="text-xs text-slate-500 font-mono" aria-label="UTC Clock">
          {timeStr}
        </div>
      </div>

      {/* Right Section: Connections, SITREP, Role, & Theme */}
      <div className="flex items-center gap-3">
        {/* Connection Status Dots */}
        <div className="hidden sm:flex items-center gap-3">
          <ConnDot label={t('server')} active={connected} color="#16a34a" />
          <ConnDot label={`${peerCount} ${t('peers')}`} active={peerCount > 0} color="#0284c7" />
          <Badge
            variant={syncStatus === 'synced' ? 'tactical-green' : 'tactical-yellow'}
            dot
          >
            {syncStatus.toUpperCase()}
          </Badge>
        </div>

        {/* Role Selector */}
        <div className="hidden lg:flex items-center">
          <select
            id="role-selector"
            aria-label="Operational Role"
            value={userRole}
            onChange={(e) => changeRole(e.target.value as any)}
            className="text-xs px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="viewer">Viewer</option>
            <option value="field_agent">Field Agent</option>
            <option value="responder">Responder</option>
            <option value="coordinator">Coordinator</option>
            <option value="admin">Administrator</option>
          </select>
        </div>

        {/* 50+ Languages Selector */}
        <div className="hidden sm:flex items-center">
          <select
            id="lang-selector"
            aria-label="Language Selector"
            value={lang}
            onChange={handleLangChange}
            className="text-xs px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 outline-none cursor-pointer max-w-[90px]"
          >
            {FIFTY_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Text Resizer */}
        <div className="hidden sm:flex items-center gap-0.5 bg-slate-200/50 dark:bg-slate-800/50 p-0.5 rounded-md">
          {(['sm', 'md', 'lg'] as TextSize[]).map((sz) => (
            <button
              key={sz}
              onClick={() => changeTextSize(sz)}
              className={`px-1.5 py-0.5 text-[10px] font-bold uppercase rounded cursor-pointer ${
                textSize === sz
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-sky-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {sz}
            </button>
          ))}
        </div>

        {/* SITREP Launcher */}
        <Button
          variant="tactical-orange"
          size="sm"
          onClick={() => {
            onShowSitrep();
            triggerHaptic('success');
          }}
          className="text-xs font-bold"
        >
          Ã°Å¸â€œâ€¹ SITREP
        </Button>

        {/* Theme Mode Cycle Button */}
        <Button
          variant="glass"
          size="sm"
          onClick={toggleTheme}
          className="text-xs font-bold"
          title="Cycle Theme (Light / Dark / OLED)"
        >
          {themeMode === 'light' ? 'Ã¢Ëœâ‚¬Ã¯Â¸Â' : themeMode === 'dark' ? 'Ã°Å¸Å’â„¢' : 'Ã¢Å¡Â¡'}
        </Button>
        {user && (
          <div className="flex items-center gap-2 ml-4">
            <button 
              className="text-xs text-slate-300 font-mono hidden sm:inline-block hover:text-white underline cursor-pointer"
              title="Manage Profile"
              onClick={() => window.dispatchEvent(new CustomEvent('mirage:open-profile'))}
            >
              {user.profile?.name || user.email}
            </button>
            {user.role === 'admin' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.dispatchEvent(new CustomEvent('mirage:open-admin'))}
                className="text-xs font-bold text-sky-400 ml-1 px-2"
              >
                Admin
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-xs font-bold text-red-400 hover:text-red-300 ml-1 px-2"
            >
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

function StatusPill({
  label,
  value,
  color,
  pulse,
}: {
  label: string;
  value: string;
  color: string;
  pulse?: boolean;
}) {
  return (
    <div className="text-center">
      <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">
        {label}
      </div>
      <div className="flex items-center gap-1.5 justify-center">
        {pulse && (
          <span
            style={{ backgroundColor: color }}
            className="w-1.5 h-1.5 rounded-full animate-ping"
          />
        )}
        <span style={{ color }} className="text-xs font-black tracking-wide font-tactical">
          {value}
        </span>
      </div>
    </div>
  );
}

function ConnDot({
  label,
  active,
  color = '#16a34a',
}: {
  label: string;
  active: boolean;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        style={{ backgroundColor: active ? color : '#64748b' }}
        className={`w-2 h-2 rounded-full ${active ? 'animate-pulse' : 'opacity-40'}`}
      />
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
        {label}
      </span>
    </div>
  );
}



