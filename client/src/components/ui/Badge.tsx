import { type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'critical'
    | 'high'
    | 'medium'
    | 'low'
    | 'info'
    | 'success'
    | 'queued'
    | 'running';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    'inline-flex items-center font-medium rounded-md uppercase tracking-wider select-none shrink-0';

  const variants = {
    default: 'bg-slate-800 text-slate-300 border border-slate-700',
    critical: 'bg-rose-950/60 text-rose-300 border border-rose-800/80',
    high: 'bg-amber-950/60 text-amber-300 border border-amber-800/80',
    medium: 'bg-yellow-950/50 text-yellow-300 border border-yellow-800/70',
    low: 'bg-sky-950/50 text-sky-300 border border-sky-800/70',
    info: 'bg-slate-800 text-slate-300 border border-slate-700',
    success: 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/70',
    queued: 'bg-indigo-950/50 text-indigo-300 border border-indigo-800/70',
    running: 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/80 animate-pulse',
  };

  const sizes = {
    sm: 'text-[10px] px-1.5 py-0.5 font-semibold',
    md: 'text-xs px-2.5 py-0.5 font-semibold',
  };

  return (
    <span
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {variant === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1.5 animate-ping" />
      )}
      {children}
    </span>
  );
}
