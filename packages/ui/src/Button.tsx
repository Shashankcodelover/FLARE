import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 
  | 'primary' 
  | 'tactical-orange' 
  | 'tactical-green' 
  | 'tactical-yellow' 
  | 'glass' 
  | 'danger' 
  | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm hover:shadow-blue-500/20',
  'tactical-orange': 'bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-sm hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98]',
  'tactical-green': 'bg-[#16a34a] hover:bg-[#15803d] text-white shadow-sm hover:shadow-green-500/30 hover:scale-[1.02] active:scale-[0.98]',
  'tactical-yellow': 'bg-[#d97706] hover:bg-[#b45309] text-white shadow-sm hover:shadow-yellow-500/30 hover:scale-[1.02] active:scale-[0.98]',
  glass: 'glass-panel text-current hover:bg-white/80 dark:hover:bg-slate-800/80 border border-slate-300 dark:border-slate-700 active:scale-[0.98]',
  danger: 'bg-red-600 hover:bg-red-500 text-white shadow-sm hover:shadow-red-500/30 active:scale-[0.98]',
  ghost: 'bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-current',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs rounded-md gap-1',
  md: 'px-3.5 py-1.5 text-sm rounded-lg gap-2',
  lg: 'px-5 py-2.5 text-base rounded-xl font-semibold gap-2.5',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  icon,
  className = '', 
  disabled,
  ...props 
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
      disabled={disabled}
      aria-disabled={disabled}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
