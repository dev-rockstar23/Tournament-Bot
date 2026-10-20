'use client'
import { forwardRef, HTMLAttributes, useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

type NeonColor = 'violet' | 'cyan' | 'red' | 'green' | 'amber' | 'liquid' | 'plasma'

interface LiquidCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  glow?: boolean
  neonColor?: NeonColor
  scanline?: boolean
  hud?: boolean
  /** Enable liquid morph on hover */
  liquid?: boolean
  /** Liquid morph intensity */
  morphIntensity?: number
  /** Enable magnetic tilt effect */
  magnetic?: boolean
  /** Custom content for the liquid background */
  liquidColors?: { start: string; mid: string; end: string }
  children: React.ReactNode
}

const neonBorderClass: Record<NeonColor, string> = {
  violet: 'neon-border-violet hover:neon-border-violet',
  cyan: 'neon-border-cyan hover:neon-border-cyan',
  red: 'border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]',
  green: 'border-green-500/50 hover:shadow-[0_0_20px_rgba(34,197,94,0.5)]',
  amber: 'border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.5)]',
  liquid: 'border-white/20 hover:border-white/30',
  plasma: 'border-white/20 hover:border-white/30',
}

const defaultLiquidColors: Record<NeonColor, { start: string; mid: string; end: string }> = {
  violet: { start: '#7c3aed', mid: '#8b5cf6', end: '#a855f7' },
  cyan: { start: '#06b6d4', mid: '#22d3ee', end: '#67e8f9' },
  red: { start: '#dc2626', mid: '#ef4444', end: '#f87171' },
  green: { start: '#16a34a', mid: '#22c55e', end: '#4ade80' },
  amber: { start: '#f59e0b', mid: '#fbbf24', end: '#fcd34d' },
  liquid: { start: '#7c3aed', mid: '#06b6d4', end: '#22c55e' },
  plasma: { start: '#f97316', mid: '#ec4899', end: '#8b5cf6' },
}

export const LiquidCard = forwardRef<HTMLDivElement, LiquidCardProps>(
  (
    {
      className,
      hover = true,
      glow = false,
      neonColor,
      scanline = false,
      hud = false,
      liquid = false,
      magnetic = false,
      morphIntensity = 0.08,
      liquidColors,
      children,
      ...props
    },
    ref
  ) => {
    const cardRef = useRef<HTMLDivElement>(null)
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const [isHovered, setIsHovered] = useState(false)
    const [isPressed, setIsPressed] = useState(false)

    const colors = liquidColors || defaultLiquidColors[neonColor || 'violet']

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!magnetic && !liquid) return
      const rect = cardRef.current?.getBoundingClientRect()
      if (rect) {
        setMousePos({
          x: (e.clientX - rect.left - rect.width / 2) / (rect.width / 2),
          y: (e.clientY - rect.top - rect.height / 2) / (rect.height / 2),
        })
      }
    }

    const handleMouseLeave = () => {
      setMousePos({ x: 0, y: 0 })
      setIsHovered(false)
    }

    const handleMouseEnter = () => setIsHovered(true)
    const handleMouseDown = () => setIsPressed(true)
    const handleMouseUp = () => setIsPressed(false)

    const magneticStyle = (magnetic || liquid) && isHovered
      ? {
          rotateX: -mousePos.y * morphIntensity * 15,
          rotateY: mousePos.x * morphIntensity * 15,
          transition: { type: 'spring', stiffness: 300, damping: 25 },
        }
      : {}

    const pressStyle = isPressed
      ? { scale: 0.98, transition: { duration: 0.05 } }
      : {}

    const hoverScale = (hover || liquid) && isHovered ? 1.01 : 1

    const baseClasses = cn(
      'glass-card relative overflow-hidden',
      hover && (liquid ? 'cursor-pointer' : 'cursor-pointer'),
      glow && 'animate-[pulse-glow_2s_ease-in-out_infinite]',
      hud && 'hud-grid-bg border-t border-[var(--color-neon-cyan)]',
      neonColor && neonBorderClass[neonColor],
      liquid && 'liquid-card',
      className
    )

    // Filter out motion-incompatible props - keep only safe props
    const {
      onDrag, onDragStart, onDragEnd, onDragEnter, onDragLeave, onDragOver, onDrop,
      onAnimationStart, onAnimationEnd, onAnimationIteration,
      onTransitionStart, onTransitionEnd, onTransitionCancel,
      ...motionProps
    } = props

    return (
      <motion.div
        ref={ref}
        className={baseClasses}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        style={magneticStyle as React.CSSProperties}
        whileHover={!isPressed && (hover || liquid) ? { scale: hoverScale } : undefined}
        whileTap={pressStyle}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        {...motionProps}
      >
        {/* Liquid background morph layer */}
        <AnimatePresence>
          {(liquid || (neonColor === 'liquid' || neonColor === 'plasma')) && isHovered && (
            <motion.div
              key="liquid-morph"
              initial={{
                opacity: 0,
                scale: 0.5,
                borderRadius: '50% 50% 50% 50% / 50% 50% 50% 50%',
              }}
              animate={{
                opacity: 0.15,
                scale: 1.4,
                borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
              }}
              exit={{
                opacity: 0,
                scale: 0.5,
                borderRadius: '50% 50% 50% 50% / 50% 50% 50% 50%',
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 -z-10 blur-3xl pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at ${50 + mousePos.x * 20}% ${50 + mousePos.y * 20}%, ${colors.start} 0%, ${colors.mid} 40%, ${colors.end} 80%, transparent 100%)`,
              }}
            />
          )}
        </AnimatePresence>

        {/* Animated border gradient for liquid/plasma variants */}
        <AnimatePresence>
          {(liquid || neonColor === 'liquid' || neonColor === 'plasma') && (
            <motion.div
              key="border-glow"
              className="absolute inset-[-1px] rounded-[inherit] -z-10 pointer-events-none"
              style={{
                background: `conic-gradient(from 0deg, ${colors.start}, ${colors.mid}, ${colors.end}, ${colors.start})`,
                opacity: isHovered ? 1 : 0.4,
                filter: 'blur(1px)',
              }}
              animate={{
                opacity: [0.4, 1, 0.4],
                rotate: [0, 360],
              }}
              transition={{
                opacity: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
              }}
            />
          )}
        </AnimatePresence>

        {/* Scanline sweep */}
        {scanline && <div className="scanline-overlay" aria-hidden="true" />}

        {/* HUD top accent line */}
        {hud && (
          <div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent, ${colors.mid}, transparent)`,
            }}
          />
        )}

        {/* Liquid shimmer sweep on hover */}
        <AnimatePresence>
          {isHovered && (liquid || neonColor === 'liquid' || neonColor === 'plasma') && (
            <motion.div
              key="shimmer-sweep"
              initial={{ x: '-120%', opacity: 0 }}
              animate={{ x: '120%', opacity: [0, 1, 0] }}
              exit={{ x: '120%', opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(110deg, transparent 40%, ${colors.mid}30 50%, transparent 60%)`,
              }}
            />
          )}
        </AnimatePresence>

        {/* Content with subtle parallax */}
        <div
          className="relative z-10"
          style={
            (magnetic || liquid) && isHovered
              ? {
                  transform: `translate(${mousePos.x * 4}px, ${mousePos.y * 4}px)`,
                  transition: 'transform 0.1s ease-out',
                }
              : {}
          }
        >
          {children}
        </div>

        {/* Corner accents for liquid cards */}
        {liquid && (
          <>
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[var(--color-neon-violet)]/50 rounded-tl-xl opacity-50" />
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[var(--color-neon-cyan)]/50 rounded-tr-xl opacity-50" />
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[var(--color-neon-cyan)]/50 rounded-bl-xl opacity-50" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[var(--color-neon-violet)]/50 rounded-br-xl opacity-50" />
          </>
        )}

        {/* Plasma corner accents */}
        {neonColor === 'plasma' && (
          <>
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-orange-500/50 rounded-tl-xl opacity-50" />
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-pink-500/50 rounded-tr-xl opacity-50" />
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-pink-500/50 rounded-bl-xl opacity-50" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-orange-500/50 rounded-br-xl opacity-50" />
          </>
        )}
      </motion.div>
    )
  }
)

LiquidCard.displayName = 'LiquidCard'

// Backward compatible GlassCard
export const GlassCard = forwardRef<HTMLDivElement, LiquidCardProps>(
  ({ liquid = false, magnetic = false, morphIntensity = 0.08, ...props }, ref) => {
    return (
      <LiquidCard
        ref={ref}
        liquid={liquid}
        magnetic={magnetic}
        morphIntensity={morphIntensity}
        {...props}
      />
    )
  }
)
GlassCard.displayName = 'GlassCard'