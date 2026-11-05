'use client'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

type BadgeVariant =
  | 'live' | 'upcoming' | 'completed' | 'cancelled' | 'draft'
  | 'default' | 'cyber' | 'warning' | 'liquid' | 'check-in'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  liquid?: boolean
}

interface VariantStyle { bg: string; color: string; ring: string; pulse?: boolean; mono?: boolean }

const variants: Record<BadgeVariant, VariantStyle> = {
  live:      { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444', ring: 'rgba(239,68,68,0.25)',   pulse: true },
  upcoming:  { bg: 'rgba(34,211,238,0.08)', color: '#22d3ee', ring: 'rgba(34,211,238,0.22)' },
  completed: { bg: 'rgba(34,197,94,0.08)',  color: '#22c55e', ring: 'rgba(34,197,94,0.22)' },
  cancelled: { bg: 'rgba(100,116,139,0.1)', color: '#64748b', ring: 'rgba(100,116,139,0.2)' },
  draft:     { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b', ring: 'rgba(245,158,11,0.22)' },
  'check-in':{ bg: 'rgba(245,158,11,0.08)', color: '#f59e0b', ring: 'rgba(245,158,11,0.22)', pulse: true },
  default:   { bg: 'rgba(124,58,237,0.1)',  color: '#9f5bff', ring: 'rgba(124,58,237,0.25)' },
  cyber:     { bg: 'rgba(6,182,212,0.08)',  color: '#22d3ee', ring: 'rgba(6,182,212,0.25)',  mono: true },
  warning:   { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', ring: 'rgba(245,158,11,0.25)' },
  liquid:    { bg: 'rgba(124,58,237,0.1)',  color: '#f1f5f9', ring: 'rgba(255,255,255,0.15)', mono: true },
}

export function Badge({ variant = 'default', children, className, liquid = false }: BadgeProps) {
  const v = variants[variant]
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.82 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      className={cn(
        'relative inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold overflow-hidden',
        v.mono && 'font-mono tracking-wider',
        className
      )}
      style={{ background: v.bg, color: v.color, border: `1px solid ${v.ring}` }}>

      {/* Pulse dot */}
      {v.pulse && (
        <motion.span className="size-[5px] rounded-full shrink-0"
          style={{ background: v.color }}
          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          aria-hidden />
      )}

      {children}

      {/* Shimmer */}
      {liquid && (
        <motion.span className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)' }}
          animate={{ x: ['-120%', '120%'] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }} />
      )}
    </motion.span>
  )
}
