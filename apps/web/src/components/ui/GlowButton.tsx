'use client'
import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'cyber'
type Size = 'sm' | 'md' | 'lg'

interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  asChild?: boolean
  children?: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary: [
    'bg-gradient-to-r from-[#7c3aed] to-[#9f5bff]',
    'text-white font-semibold',
    'border border-[rgba(124,58,237,0.5)]',
    'hover:from-[#6d28d9] hover:to-[#8b5cf6]',
    'hover:shadow-[0_0_20px_rgba(124,58,237,0.6),0_0_40px_rgba(124,58,237,0.3)]',
    'focus-visible:ring-2 focus-visible:ring-[#7c3aed] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050508]',
  ].join(' '),
  secondary: [
    'bg-gradient-to-r from-[#06b6d4] to-[#22d3ee]',
    'text-[#050508] font-semibold',
    'border border-[rgba(6,182,212,0.5)]',
    'hover:from-[#0891b2] hover:to-[#06b6d4]',
    'hover:shadow-[0_0_20px_rgba(6,182,212,0.6),0_0_40px_rgba(6,182,212,0.3)]',
    'focus-visible:ring-2 focus-visible:ring-[#06b6d4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050508]',
  ].join(' '),
  destructive: [
    'bg-gradient-to-r from-[#dc2626] to-[#ef4444]',
    'text-white font-semibold',
    'border border-[rgba(220,38,38,0.5)]',
    'hover:from-[#b91c1c] hover:to-[#dc2626]',
    'hover:shadow-[0_0_20px_rgba(220,38,38,0.6),0_0_40px_rgba(220,38,38,0.3)]',
    'focus-visible:ring-2 focus-visible:ring-[#dc2626] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050508]',
  ].join(' '),
  ghost: [
    'bg-transparent',
    'text-[#f8fafc] font-semibold',
    'border border-[rgba(255,255,255,0.15)]',
    'hover:bg-white/5 hover:border-[rgba(255,255,255,0.3)]',
    'focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050508]',
  ].join(' '),
  cyber: [
    'bg-gradient-to-r from-[#06b6d4] to-[#22d3ee]',
    'text-[#050508] font-bold font-mono tracking-widest uppercase',
    'border border-[rgba(6,182,212,0.6)]',
    'hover:from-[#0891b2] hover:to-[#06b6d4]',
    'hover:shadow-[0_0_20px_rgba(124,58,237,0.6),0_0_40px_rgba(6,182,212,0.4)]',
    'focus-visible:ring-2 focus-visible:ring-[#06b6d4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050508]',
  ].join(' '),
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-4 py-1.5 text-sm rounded-lg',
  md: 'px-6 py-2.5 text-sm rounded-xl',
  lg: 'px-8 py-3 text-base rounded-xl',
}

/** Variants that get the shimmer animation span */
const shimmerVariants: Set<Variant> = new Set(['primary', 'cyber'])

export const GlowButton = forwardRef<HTMLButtonElement, GlowButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      asChild = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses = cn(
      'inline-flex items-center justify-center gap-2',
      'relative overflow-hidden',
      'transition-all duration-200 ease-out',
      'select-none outline-none',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
      variantClasses[variant],
      sizeClasses[size],
      className
    )

    const shimmer = shimmerVariants.has(variant) ? (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"
        style={{ backgroundSize: '200% 100%' }}
      />
    ) : null

    if (asChild && children) {
      return (
        <span className={cn(baseClasses, 'relative')}>
          {shimmer}
          {children}
        </span>
      )
    }

    return (
      <button
        ref={ref}
        className={baseClasses}
        disabled={disabled}
        {...props}
      >
        {shimmer}
        {children}
      </button>
    )
  }
)
GlowButton.displayName = 'GlowButton'
