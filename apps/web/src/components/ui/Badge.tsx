'use client'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

type BadgeVariant =
  | 'live'
  | 'upcoming'
  | 'completed'
  | 'cancelled'
  | 'draft'
  | 'default'
  | 'cyber'
  | 'warning'
  | 'liquid'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  /** Add liquid shimmer effect */
  liquid?: boolean
}

const variantClasses: Record<BadgeVariant, string> = {
  live: 'bg-red-500/15 border-red-500/30 text-red-400',
  upcoming: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
  completed: 'bg-green-500/15 border-green-500/30 text-green-400',
  cancelled: 'bg-gray-500/15 border-gray-500/30 text-gray-400',
  draft: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
  default: 'bg-violet-500/15 border-violet-500/30 text-violet-400',
  cyber: 'bg-[rgba(6,182,212,0.10)] border-[rgba(6,182,212,0.35)] text-cyan-300 font-mono tracking-widest',
  warning: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
  liquid: 'bg-gradient-to-r from-[#7c3aed]/20 via-[#06b6d4]/20 to-[#22c55e]/20 border border-white/20 text-white font-mono tracking-widest',
}

export function Badge({ variant = 'default', children, className, liquid = false }: BadgeProps) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full',
        'text-xs font-medium border',
        variantClasses[variant],
        liquid && 'relative overflow-hidden',
        className
      )}
    >
      {/* live variant dot */}
      {variant === 'live' && (
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-red-500"
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          aria-hidden="true"
        />
      )}

      {children}

      {/* Liquid shimmer overlay */}
      {liquid && (
        <motion.span
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)',
          }}
          animate={{ x: ['-120%', '120%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </motion.span>
  )
}