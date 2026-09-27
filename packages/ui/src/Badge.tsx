import type { ReactNode } from 'react';

export type BadgeVariant = 
  | 'default' 
  | 'success' 
  | 'warning' 
  | 'danger' 
  | 'info' 
  | 'tactical-orange' 
  | 'tactical-green' 
  | 'tactical-yellow' 
  | 'breach' 
  | 'mesh';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-slate-200  text-slate-700  border-slate-300 border-slate-700',
  success: 'bg-emerald-500/10 text-emerald-600  border-emerald-500/30',
  warning: 'bg-amber-500/10 text-amber-600  border-amber-500/30',
  danger: 'bg-rose-500/10 text-rose-600  border-rose-500/30',
  info: 'bg-sky-500/10 text-sky-600  border-sky-500/30',
  'tactical-orange': 'bg-[#ea580c]/15 text-[#ea580c] text-[#f97316] border-[#ea580c]/40 font-mono',
  'tactical-green': 'bg-[#16a34a]/15 text-[#16a34a] text-[#22c55e] border-[#16a34a]/40 font-mono',
  'tactical-yellow': 'bg-[#d97706]/15 text-[#d97706] text-[#f59e0b] border-[#d97706]/40 font-mono',
  breach: 'bg-red-500/20 text-red-600  border-red-500/50 animate-pulse font-mono font-bold',
  mesh: 'bg-cyan-500/15 text-cyan-600  border-cyan-500/40 font-mono',
};

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

export function Badge({ 
  children, 
  variant = 'default', 
  className = '',
  dot = false,
}: BadgeProps) {
  return (
    <span 
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border backdrop-blur-md transition-colors ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 animate-pulse" aria-hidden="true" />
      )}
      {children}
    </span>
  );
}
