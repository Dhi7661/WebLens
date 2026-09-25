import React, { type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-lg cursor-pointer';

    const variants = {
      primary:
        'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-500/20 focus:ring-indigo-500 border border-indigo-500/30',
      secondary:
        'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 focus:ring-slate-500',
      outline:
        'bg-transparent hover:bg-slate-800/60 text-slate-200 border border-slate-700 hover:border-slate-600 focus:ring-slate-500',
      ghost:
        'bg-transparent hover:bg-slate-800/50 text-slate-300 hover:text-white focus:ring-slate-500',
      danger:
        'bg-rose-600 hover:bg-rose-500 text-white shadow-sm shadow-rose-500/20 focus:ring-rose-500 border border-rose-500/30',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-md',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-5 py-2.5 gap-2.5 rounded-xl font-semibold',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {!isLoading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
