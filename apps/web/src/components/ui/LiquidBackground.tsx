'use client'
import { useEffect, useRef, useState, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface LiquidBackgroundProps {
  className?: string
  variant?: 'violet' | 'cyan' | 'liquid' | 'plasma' | 'tournament'
  interactive?: boolean
  children?: React.ReactNode
  /** Number of floating particles */
  particleCount?: number
  /** Enable WebGL enhanced version if available */
  useWebGL?: boolean
}

export function LiquidBackground({
  className = '',
  variant = 'tournament',
  interactive = true,
  children,
  particleCount = 30,
  useWebGL = false,
}: LiquidBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!interactive || prefersReducedMotion) return
    const handleMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        setMouse({
          x: (e.clientX - rect.left) / rect.width - 0.5,
          y: (e.clientY - rect.top) / rect.height - 0.5,
        })
      }
    }
    window.addEventListener('mousemove', handleMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMove)
  }, [interactive, prefersReducedMotion])

  const config = useMemo(() => {
    const baseConfig = {
      blobs: [] as Array<{
        className: string
        size: number
        top?: string
        bottom?: string
        left?: string
        right?: string
        transform?: string
      }>,
      particles: [] as Array<{ left: string; top: string; delay: string; duration: string; color: string }>,
    }

    switch (variant) {
      case 'violet':
        baseConfig.blobs = [
          { className: 'liquid-blob violet', size: 600, top: '-150px', left: '-200px' },
          { className: 'liquid-blob violet', size: 450, bottom: '-100px', right: '-150px' },
        ]
        break
      case 'cyan':
        baseConfig.blobs = [
          { className: 'liquid-blob cyan', size: 550, top: '-100px', left: '-180px' },
          { className: 'liquid-blob cyan', size: 400, bottom: '-80px', right: '-120px' },
        ]
        break
      case 'liquid':
        baseConfig.blobs = [
          { className: 'liquid-blob violet', size: 700, top: '-200px', left: '-250px' },
          { className: 'liquid-blob cyan', size: 500, bottom: '-150px', right: '-200px' },
          { className: 'liquid-blob emerald', size: 400, top: '30%', left: '50%', transform: 'translateX(-50%)' },
        ]
        break
      case 'plasma':
        baseConfig.blobs = [
          { className: 'liquid-blob plasma-1', size: 650, top: '-150px', left: '-200px' },
          { className: 'liquid-blob plasma-2', size: 500, bottom: '-120px', right: '-180px' },
          { className: 'liquid-blob plasma-3', size: 450, top: '25%', left: '50%', transform: 'translateX(-50%)' },
        ]
        break
      case 'tournament':
      default:
        baseConfig.blobs = [
          { className: 'liquid-blob violet', size: 500, top: '-100px', left: '-150px' },
          { className: 'liquid-blob cyan', size: 400, bottom: '-100px', right: '-150px' },
          { className: 'liquid-blob emerald', size: 300, top: '20%', left: '50%', transform: 'translateX(-50%)' },
        ]
        break
    }

    // Generate particles
    const colors = variant === 'plasma' 
      ? ['#f97316', '#ec4899', '#8b5cf6']
      : variant === 'liquid'
        ? ['#7c3aed', '#06b6d4', '#22c55e']
        : variant === 'cyan'
          ? ['#06b6d4', '#22d3ee', '#67e8f9']
          : ['#7c3aed', '#8b5cf6', '#a855f7']

    for (let i = 0; i < particleCount; i++) {
      baseConfig.particles.push({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 8}s`,
        duration: `${6 + Math.random() * 6}s`,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }

    return baseConfig
  }, [variant, particleCount])

  const variantClass = `liquid-bg-${variant}`

  return (
    <div
      ref={containerRef}
      className={cn('liquid-bg-container', variantClass, className)}
      style={{ backgroundColor: '#050508' }}
      aria-hidden="true"
    >
      {/* Aurora background gradient */}
      <div className="liquid-aurora" />
      
      {/* Liquid morphing blobs */}
      {config.blobs.map((blob, i) => (
        <div
          key={i}
          className={blob.className}
          style={{
            width: blob.size,
            height: blob.size,
            top: blob.top,
            bottom: blob.bottom,
            left: blob.left,
            right: blob.right,
            transform: blob.transform,
            // Add subtle mouse parallax
            ...(interactive && !prefersReducedMotion && {
              transform: `${blob.transform || ''} translate(${mouse.x * 30}px, ${mouse.y * 30}px)`.trim(),
            }),
          }}
        />
      ))}

      {/* Shimmer sweep */}
      <div className="liquid-shimmer" />

      {/* Grid overlay */}
      <div className="liquid-grid" />

      {/* Scanline */}
      <div className="liquid-scanline" />

      {/* Floating particles */}
      <div className="liquid-particles" aria-hidden="true">
        {config.particles.map((p, i) => (
          <div
            key={i}
            className="liquid-particle"
            style={{
              left: p.left,
              top: p.top,
              animationDelay: p.delay,
              animationDuration: p.duration,
              color: p.color,
              opacity: 0.2 + Math.random() * 0.4,
            }}
          />
        ))}
      </div>

      {/* Content overlay */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

export default LiquidBackground