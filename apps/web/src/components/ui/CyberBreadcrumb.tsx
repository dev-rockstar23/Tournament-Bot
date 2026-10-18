'use client'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

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
      {crumbs.map(({ href, label, isActive }, idx) => (
        <span key={href} className="flex items-center gap-1">
          {idx > 0 && (
            <ChevronRight
              className="w-3 h-3 text-[var(--color-text-muted)]"
              aria-hidden="true"
            />
          )}
          {isActive ? (
            <span
              className="neon-text-cyan font-display font-bold tracking-wider uppercase"
              aria-current="page"
            >
              {label}
            </span>
          ) : (
            <a
              href={href}
              className={cn(
                'font-mono text-[var(--color-text-secondary)]',
                'hover:text-[var(--color-neon-cyan)] transition-colors duration-150'
              )}
            >
              {label}
            </a>
          )}
        </span>
      ))}
    </nav>
  )
}
