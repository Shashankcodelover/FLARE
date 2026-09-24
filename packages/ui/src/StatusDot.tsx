export type Status = 'online' | 'offline' | 'warning' | 'syncing' | 'sos';

const DOT_CLASSES: Record<Status, { outer: string; inner: string }> = {
  online: {
    outer: 'bg-emerald-400/30',
    inner: 'bg-emerald-500',
  },
  offline: {
    outer: 'bg-rose-400/30',
    inner: 'bg-rose-500',
  },
  warning: {
    outer: 'bg-amber-400/30',
    inner: 'bg-amber-500',
  },
  syncing: {
    outer: 'bg-sky-400/30',
    inner: 'bg-sky-500',
  },
  sos: {
    outer: 'bg-red-500/50 animate-ping',
    inner: 'bg-red-600 animate-pulse',
  },
};

export interface StatusDotProps {
  status: Status;
  label?: string;
  pulse?: boolean;
  className?: string;
}

export function StatusDot({ status, label, pulse = true, className = '' }: StatusDotProps) {
  const styles = DOT_CLASSES[status];

  return (
    <span className={`inline-flex items-center gap-2 text-xs font-medium ${className}`}>
      <span className="relative flex h-2.5 w-2.5 items-center justify-center">
        {pulse && (
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${styles.outer} ${status === 'sos' ? 'animate-ping' : 'animate-pulse'}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${styles.inner}`} />
      </span>
      {label && <span className="opacity-90">{label}</span>}
    </span>
  );
}
