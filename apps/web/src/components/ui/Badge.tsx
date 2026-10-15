'use client'
import { cn } from '@/lib/utils'

type BadgeVariant = 'live' | 'upcoming' | 'completed' | 'cancelled' | 'draft' | 'default'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  live: 'bg-red-500/15 border-red-500/30 text-red-400',
  upcoming: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
  completed: 'bg-green-500/15 border-green-500/30 text-green-400',
  cancelled: 'bg-gray-500/15 border-gray-500/30 text-gray-400',
  draft: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
  default: 'bg-violet-500/15 border-violet-500/30 text-violet-400',
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full',
        'text-xs font-medium border',
        variantClasses[variant],
        className
      )}
    >
      {variant === 'live' && (
        <span
          className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}
