'use client'
import { cn } from '@/lib/utils'
import { HTMLAttributes, forwardRef } from 'react'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  glow?: boolean
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, hover = true, glow = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'glass-card',
          hover && 'cursor-pointer',
          glow && 'animate-[pulse-glow_2s_ease-in-out_infinite]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
GlassCard.displayName = 'GlassCard'
