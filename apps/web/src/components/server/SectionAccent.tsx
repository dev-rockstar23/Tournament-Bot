'use client'
import { motion } from 'framer-motion'

type AccentColor = 'violet' | 'red' | 'amber' | 'cyan' | 'green'

interface SectionAccentProps {
  color?: AccentColor
  /** Animate scaleY pulse (for live/active sections) */
  pulse?: boolean
}

const colorMap: Record<AccentColor, string> = {
  violet: 'var(--color-neon-violet, #7c3aed)',
  red: '#ef4444',
  amber: '#f59e0b',
  cyan: 'var(--color-neon-cyan, #06b6d4)',
  green: 'var(--color-neon-green, #22c55e)',
}

export function SectionAccent({ color = 'violet', pulse = false }: SectionAccentProps) {
  const bg = colorMap[color]

  if (pulse) {
    return (
      <motion.div
        className="w-1 h-6 rounded-full flex-shrink-0"
        style={{ background: bg }}
        animate={{ scaleY: [1, 1.5, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
        aria-hidden="true"
      />
    )
  }

  return (
    <motion.div
      className="w-1 h-6 rounded-full flex-shrink-0"
      style={{ background: bg }}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.4 }}
      aria-hidden="true"
    />
  )
}
