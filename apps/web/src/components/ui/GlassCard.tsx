'use client'
import { cn } from '@/lib/utils'
import { HTMLAttributes, forwardRef } from 'react'

type NeonColor = 'violet' | 'cyan' | 'red' | 'green'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  glow?: boolean
  /** Apply a neon border + glow in the given colour on hover */
  neonColor?: NeonColor
  /** Render a scanline sweep overlay inside the card */
  scanline?: boolean
  /** HUD style: grid background + thin cyan top stripe */
  hud?: boolean
}

const neonBorderClass: Record<NeonColor, string> = {
  violet: 'neon-border-violet hover:neon-border-violet',
  cyan:   'neon-border-cyan   hover:neon-border-cyan',
  red:    'border-[var(--color-neon-red)]   hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]',
  green:  'border-[var(--color-neon-green)] hover:shadow-[0_0_20px_rgba(34,197,94,0.5)]',
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      className,
      hover = true,
      glow = false,
      neonColor,
      scanline = false,
      hud = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'glass-card relative',
          hover && 'cursor-pointer',
          glow && 'animate-[pulse-glow_2s_ease-in-out_infinite]',
          hud && 'hud-grid-bg border-t border-[var(--color-neon-cyan)]',
          neonColor && neonBorderClass[neonColor],
          className
        )}
        {...props}
      >
        {/* Scanline sweep */}
        {scanline && <div className="scanline-overlay" aria-hidden="true" />}
        {children}
      </div>
    )
  }
)
GlassCard.displayName = 'GlassCard'
