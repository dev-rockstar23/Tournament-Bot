'use client'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { fadeIn, slideInRight } from '@/lib/motion'

interface CyberBreadcrumbProps {
  /** Override labels for specific path segments, e.g. { '[guildId]': 'My Server' } */
  labels?: Record<string, string>
  className?: string
}

function humanize(segment: string): string {
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function CyberBreadcrumb({ labels = {}, className }: CyberBreadcrumbProps) {
  const pathname = usePathname()

  if (!pathname) return null
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null

  const crumbs = segments.map((seg, idx) => {
    const href = '/' + segments.slice(0, idx + 1).join('/')
    const label = labels[seg] ?? humanize(seg)
    const isActive = idx === segments.length - 1
    return { href, label, isActive }
  })

  return (
    <nav
      aria-label="breadcrumb"
      className={cn('flex items-center gap-1 text-xs', className)}
    >
      <motion.span
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeIn}
      >
        {crumbs.map(({ href, label, isActive }, idx) => (
          <motion.span
            key={href}
            className="flex items-center gap-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.3 }}
          >
            {idx > 0 && (
              <motion.div
                className="flex items-center"
                initial={{ rotate: -90 }}
                animate={{ rotate: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
              >
                <ChevronRight
                  className="w-3 h-3 text-[var(--color-neon-violet)] drop-shadow-[0_0_6px_rgba(124,58,237,0.5)]"
                  aria-hidden="true"
                />
              </motion.div>
            )}
            {isActive ? (
              <motion.span
                className="neon-text-cyan font-display font-bold tracking-wider uppercase liquid-text"
                aria-current="page"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
              >
                {label}
              </motion.span>
            ) : (
              <a
                href={href}
                className={cn(
                  'font-mono text-[var(--color-text-secondary)] liquid-button',
                  'hover:text-[var(--color-neon-cyan)] transition-colors duration-150'
                )}
              >
                {label}
              </a>
            )}
          </motion.span>
        ))}
      </motion.span>
    </nav>
  )
}