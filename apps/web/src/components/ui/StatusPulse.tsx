'use client'
import { cn } from '@/lib/utils'

type PulseVariant = 'live' | 'synced' | 'pending' | 'offline' | 'critical' | 'warning'

interface StatusPulseProps {
  variant: PulseVariant
  className?: string
}

const colorMap: Record<PulseVariant, string> = {
  live:     'bg-red-500',
  synced:   'bg-green-500',
  pending:  'bg-amber-500',
  offline:  'bg-gray-500',
  critical: 'bg-red-500',
  warning:  'bg-amber-500',
}

const animateMap: Record<PulseVariant, string | false> = {
  live:     'animate-pulse',
  synced:   false,
  pending:  'animate-pulse',
  offline:  false,
  /** Fast pulse via inline style below */
  critical: 'animate-pulse',
  warning:  'animate-pulse',
}

const styleMap: Record<PulseVariant, React.CSSProperties> = {
  live:     {},
  synced:   {},
  pending:  {},
  offline:  {},
  critical: { animationDuration: '0.5s' },
  warning:  {},
}

export function StatusPulse({ variant, className }: StatusPulseProps) {
  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full',
        colorMap[variant],
        animateMap[variant] || '',
        className
      )}
      style={styleMap[variant]}
      aria-label={variant}
      role="status"
    />
  )
}
