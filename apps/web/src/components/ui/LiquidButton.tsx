'use client'
import { forwardRef, ButtonHTMLAttributes, ReactNode, Children, isValidElement, cloneElement, useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

type LiquidVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'cyber' | 'liquid' | 'plasma'
type Size = 'sm' | 'md' | 'lg' | 'xl'

interface LiquidButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: LiquidVariant
  size?: Size
  asChild?: boolean
  children?: ReactNode
  /** Enable magnetic hover effect */
  magnetic?: boolean
  /** Enable ripple effect on click */
  ripple?: boolean
  /** Custom shimmer color */
  shimmerColor?: string
  /** Liquid morph intensity (0-1) */
  morphIntensity?: number
}

const variantStyles: Record<LiquidVariant, string> = {
  primary: 'bg-gradient-to-r from-[#7c3aed] via-[#8b5cf6] to-[#a855f7] text-white font-semibold border border-[#7c3aed]/50',
  secondary: 'bg-gradient-to-r from-[#06b6d4] via-[#0891b2] to-[#0e7490] text-[#050508] font-semibold border border-[#06b6d4]/50',
  destructive: 'bg-gradient-to-r from-[#dc2626] via-[#ef4444] to-[#f87171] text-white font-semibold border border-[#dc2626]/50',
  ghost: 'bg-transparent text-[#f8fafc] font-semibold border border-white/20',
  cyber: 'bg-gradient-to-r from-[#06b6d4] via-[#22d3ee] to-[#67e8f9] text-[#050508] font-bold font-mono tracking-widest uppercase border border-[#06b6d4]/60',
  liquid: 'bg-gradient-to-r from-[#7c3aed] via-[#06b6d4] to-[#22c55e] text-white font-bold font-mono tracking-wider uppercase border border-white/20',
  plasma: 'bg-gradient-to-r from-[#f97316] via-[#ec4899] to-[#8b5cf6] text-white font-bold font-mono tracking-wider uppercase border border-white/20',
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-4 py-2 text-xs rounded-lg min-w-[100px]',
  md: 'px-6 py-3 text-sm rounded-xl min-w-[140px]',
  lg: 'px-8 py-4 text-base rounded-xl min-w-[160px]',
  xl: 'px-10 py-5 text-lg rounded-2xl min-w-[200px]',
}

const glowStyles: Record<LiquidVariant, string> = {
  primary: 'hover:shadow-[0_0_20px_rgba(124,58,237,0.6),0_0_40px_rgba(124,58,237,0.3),0_0_60px_rgba(124,58,237,0.15)]',
  secondary: 'hover:shadow-[0_0_20px_rgba(6,182,212,0.6),0_0_40px_rgba(6,182,212,0.3),0_0_60px_rgba(6,182,212,0.15)]',
  destructive: 'hover:shadow-[0_0_20px_rgba(220,38,38,0.6),0_0_40px_rgba(220,38,38,0.3),0_0_60px_rgba(220,38,38,0.15)]',
  ghost: 'hover:bg-white/5 hover:border-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]',
  cyber: 'hover:shadow-[0_0_20px_rgba(6,182,212,0.6),0_0_40px_rgba(124,58,237,0.4),0_0_60px_rgba(6,182,212,0.2)]',
  liquid: 'hover:shadow-[0_0_25px_rgba(124,58,237,0.5),0_0_50px_rgba(6,182,212,0.4),0_0_80px_rgba(34,197,94,0.3)]',
  plasma: 'hover:shadow-[0_0_25px_rgba(249,115,22,0.5),0_0_50px_rgba(236,72,153,0.4),0_0_80px_rgba(139,92,246,0.3)]',
}

const shimmerGradients: Record<LiquidVariant, string> = {
  primary: 'from-transparent via-violet-300/20 to-transparent',
  secondary: 'from-transparent via-cyan-300/20 to-transparent',
  destructive: 'from-transparent via-red-300/20 to-transparent',
  ghost: 'from-transparent via-white/10 to-transparent',
  cyber: 'from-transparent via-cyan-200/30 to-transparent',
  liquid: 'from-transparent via-emerald-300/20 via-cyan-300/20 to-transparent',
  plasma: 'from-transparent via-orange-300/20 via-pink-300/20 to-transparent',
}

const liquidColors: Record<LiquidVariant, { start: string; mid: string; end: string }> = {
  primary: { start: '#7c3aed', mid: '#8b5cf6', end: '#a855f7' },
  secondary: { start: '#06b6d4', mid: '#22d3ee', end: '#67e8f9' },
  destructive: { start: '#dc2626', mid: '#ef4444', end: '#f87171' },
  ghost: { start: 'rgba(255,255,255,0.1)', mid: 'rgba(255,255,255,0.2)', end: 'rgba(255,255,255,0.1)' },
  cyber: { start: '#06b6d4', mid: '#22d3ee', end: '#67e8f9' },
  liquid: { start: '#7c3aed', mid: '#06b6d4', end: '#22c55e' },
  plasma: { start: '#f97316', mid: '#ec4899', end: '#8b5cf6' },
}

export const LiquidButton = forwardRef<HTMLButtonElement, LiquidButtonProps>(
  (
    {
      variant = 'liquid',
      size = 'md',
      asChild = false,
      className,
      children,
      disabled,
      magnetic = true,
      ripple = true,
      shimmerColor,
      morphIntensity = 0.15,
      onClick,
      ...props
    },
    ref
  ) => {
    const buttonRef = useRef<HTMLButtonElement | null>(null)
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const [isHovered, setIsHovered] = useState(false)
    const [isPressed, setIsPressed] = useState(false)
    const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])
    const rippleId = useRef(0)

    const combinedRef = (el: HTMLButtonElement | null) => {
      buttonRef.current = el
      if (typeof ref === 'function') {
        ref(el)
      }
      // Note: We cannot assign to ref.current if ref is a RefObject (read-only)
      // The buttonRef is used internally, and the forwarded ref receives the element via callback
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!magnetic) return
      const rect = e.currentTarget.getBoundingClientRect()
      setMousePos({
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2,
      })
    }

    const handleMouseLeave = () => {
      setMousePos({ x: 0, y: 0 })
      setIsHovered(false)
    }

    const handleMouseEnter = () => setIsHovered(true)

    const handleMouseDown = () => setIsPressed(true)
    const handleMouseUp = () => setIsPressed(false)

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (ripple && !disabled) {
        const rect = e.currentTarget.getBoundingClientRect()
        const id = rippleId.current++
        setRipples((prev) => [
          ...prev,
          { x: e.clientX - rect.left, y: e.clientY - rect.top, id },
        ])
        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== id))
        }, 600)
      }
      onClick?.(e)
    }

    const colors = liquidColors[variant]
    const shimmerGradient = shimmerColor
      ? `from-transparent via-${shimmerColor}/30 to-transparent`
      : shimmerGradients[variant]

    const baseClasses = cn(
      'relative inline-flex items-center justify-center gap-2',
      'overflow-hidden select-none outline-none',
      'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
      variantStyles[variant],
      sizeStyles[size],
      glowStyles[variant],
      'transition-all duration-300 ease-out',
      className
    )

    const shimmer = (
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r"
        style={{ background: shimmerGradient, backgroundSize: '200% 100%' }}
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />
    )

    const magneticStyle = magnetic && isHovered && !disabled
      ? {
          x: mousePos.x * morphIntensity,
          y: mousePos.y * morphIntensity,
          rotateX: -mousePos.y * morphIntensity * 0.5,
          rotateY: mousePos.x * morphIntensity * 0.5,
          transition: { type: 'spring', stiffness: 400, damping: 30 },
        }
      : {}

    const pressStyle = isPressed && !disabled
      ? { scale: 0.96, transition: { duration: 0.05 } }
      : {}

    const hoverScale = isHovered && !disabled ? 1.02 : 1

    if (asChild && children) {
      const child = Children.only(children)
      if (isValidElement(child)) {
        const childProps = child.props as Record<string, unknown>
        return cloneElement(child, {
          ...childProps,
          ref: combinedRef,
          className: cn(baseClasses, childProps.className as string),
          onMouseMove: handleMouseMove,
          onMouseLeave: handleMouseLeave,
          onMouseEnter: handleMouseEnter,
          onMouseDown: handleMouseDown,
          onMouseUp: handleMouseUp,
          onClick: handleClick,
        } as Record<string, unknown>)
      }
    }

    // Filter out motion-incompatible props - keep only safe props
    const {
      onDrag, onDragStart, onDragEnd, onDragEnter, onDragLeave, onDragOver, onDrop,
      onAnimationStart, onAnimationEnd, onAnimationIteration,
      onTransitionStart, onTransitionEnd, onTransitionCancel,
      ...motionProps
    } = props

    return (
      <motion.button
        ref={combinedRef}
        className={baseClasses}
        disabled={disabled}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        whileHover={!disabled ? { scale: hoverScale } : undefined}
        whileTap={!disabled ? { scale: 0.96 } : undefined}
        style={magneticStyle as React.CSSProperties}
        {...motionProps}
      >
        {/* Liquid background morph */}
        <AnimatePresence>
          {isHovered && !disabled && (
            <motion.div
              key="liquid-bg"
              initial={{ opacity: 0, scale: 0.8, rotate: -15 }}
              animate={{ opacity: 1, scale: 1.3, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.8, rotate: 15 }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              className="absolute inset-0 -z-10 blur-2xl opacity-60 rounded-[inherit]"
              style={{
                background: `radial-gradient(ellipse at center, ${colors.start} 0%, ${colors.mid} 50%, ${colors.end} 100%)`,
              }}
            />
          )}
        </AnimatePresence>

        {/* Border glow ring */}
        <AnimatePresence>
          {isHovered && !disabled && (
            <motion.div
              key="glow-ring"
              initial={{ opacity: 0, scale: 1 }}
              animate={{ opacity: 0.6, scale: 1.05 }}
              exit={{ opacity: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="absolute inset-0 rounded-[inherit] pointer-events-none"
              style={{
                boxShadow: `0 0 30px ${colors.mid}, 0 0 60px ${colors.start}`,
              }}
            />
          )}
        </AnimatePresence>

        {/* Shimmer sweep */}
        {shimmer}

        {/* Ripple effects */}
        <AnimatePresence>
          {ripples.map((r) => (
            <motion.span
              key={r.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: r.x,
                top: r.y,
                width: 0,
                height: 0,
                background: `radial-gradient(circle, ${colors.mid}80 0%, transparent 70%)`,
                transformOrigin: 'center',
              }}
              initial={{ width: 0, height: 0, opacity: 0.6 }}
              animate={{ width: 120, height: 120, opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>

        {/* Content */}
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>

        {/* Liquid edge highlight */}
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${colors.start}40 0%, transparent 50%, ${colors.end}40 100%)`,
            opacity: isHovered ? 1 : 0.3,
          }}
        />
      </motion.button>
    )
  }
)

LiquidButton.displayName = 'LiquidButton'

// Export a simpler GlowButton that wraps LiquidButton for backward compatibility
export const GlowButton = forwardRef<HTMLButtonElement, LiquidButtonProps>(
  ({ variant = 'primary', magnetic = false, ripple = false, morphIntensity = 0.1, ...props }, ref) => {
    return (
      <LiquidButton
        ref={ref}
        variant={variant}
        magnetic={magnetic}
        ripple={ripple}
        morphIntensity={morphIntensity}
        {...props}
      />
    )
  }
)
GlowButton.displayName = 'GlowButton'