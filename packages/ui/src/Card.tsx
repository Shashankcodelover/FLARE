import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export type CardVariant = 'glass' | 'solid' | 'bordered' | 'tactical-orange' | 'tactical-green' | 'tactical-yellow';

export interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: CardVariant;
  hoverEffect?: boolean;
  animate?: boolean;
  onClick?: () => void;
}

const VARIANT_STYLES: Record<CardVariant, string> = {
  glass: 'glass-card border border-white/60 dark:border-white/10 shadow-lg',
  solid: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md',
  bordered: 'bg-transparent border-2 border-slate-300 dark:border-slate-700',
  'tactical-orange': 'glass-card border-2 border-[#ea580c]/50 hover:border-[#ea580c] shadow-orange-500/10',
  'tactical-green': 'glass-card border-2 border-[#16a34a]/50 hover:border-[#16a34a] shadow-green-500/10',
  'tactical-yellow': 'glass-card border-2 border-[#d97706]/50 hover:border-[#d97706] shadow-yellow-500/10',
};

export function Card({ 
  children, 
  className = '', 
  variant = 'glass',
  hoverEffect = false,
  animate = false,
  onClick,
}: CardProps) {
  const baseClass = `p-4 rounded-2xl relative overflow-hidden transition-all duration-200 ${VARIANT_STYLES[variant]} ${
    hoverEffect ? 'hover:-translate-y-1 hover:shadow-xl cursor-pointer' : ''
  } ${className}`;

  if (animate) {
    return (
      <motion.div 
        layout 
        initial={{ opacity: 0, y: 12 }} 
        animate={{ opacity: 1, y: 0 }} 
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.2 }}
        className={baseClass}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={baseClass} onClick={onClick}>
      {children}
    </div>
  );
}
