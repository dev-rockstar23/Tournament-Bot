'use client'
import { cn } from '@/lib/utils'

type PulseVariant = 'live' | 'synced' | 'pending' | 'offline'

interface StatusPulseProps {
  variant: PulseVariant
  className?: string
}

const colorMap: Record<PulseVariant, string> = {
  live: 'bg-red-500',
  synced: 'bg-green-500',
  pending: 'bg-amber-500',
  offline: 'bg-gray-500',
}

const animateMap: Record<PulseVariant, boolean> = {
  live: true,
  synced: false,
  pending: true,
  offline: false,
}

export function StatusPulse({ variant, className }: StatusPulseProps) {
  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full',
        colorMap[variant],
        animateMap[variant] && 'animate-pulse',
        className
      )}
      aria-label={variant}
      role="status"
    />
  )
}
