'use client';

import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
}

const variants: Record<string, string> = {
  primary: 'bg-gold text-ink hover:bg-gold-soft',
  secondary: 'bg-ink text-white hover:bg-ink-light',
  ghost: 'bg-transparent text-ink hover:bg-black/5 border border-black/10',
  danger: 'bg-status-confirmed text-white hover:opacity-90',
  success: 'bg-status-available text-white hover:opacity-90',
};

const sizes: Record<string, string> = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-sm px-4 py-2.5',
  lg: 'text-base px-6 py-3.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
