'use client'
import { ReactNode, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type NeonColor = 'violet' | 'cyan' | 'red' | 'green'
type NeonAs = 'h1' | 'h2' | 'h3' | 'p' | 'span'

interface NeonTextProps extends HTMLAttributes<HTMLElement> {
  as?: NeonAs
  color: NeonColor
  /** Adds glitch-text class and data-text attribute for CSS glitch layers */
  glitch?: boolean
  children: ReactNode
  className?: string
}

const colorClass: Record<NeonColor, string> = {
  violet: 'neon-text-violet',
  cyan:   'neon-text-cyan',
  red:    'text-[var(--color-neon-red)] drop-shadow-[0_0_6px_rgba(239,68,68,0.9)]',
  green:  'text-[var(--color-neon-green)] drop-shadow-[0_0_6px_rgba(34,197,94,0.9)]',
}

/** Heading tags get Orbitron; inline/para tags get JetBrains Mono */
const fontClass: Record<NeonAs, string> = {
  h1:   'font-display',
  h2:   'font-display',
  h3:   'font-display',
  p:    'font-mono',
  span: 'font-mono',
}

export function NeonText({
  as: Tag = 'span',
  color,
  glitch = false,
  children,
  className,
  style,
  ...props
}: NeonTextProps) {
  return (
    <Tag
      className={cn(
        colorClass[color],
        fontClass[Tag],
        glitch && 'glitch-text',
        className
      )}
      style={style}
      // glitch CSS layer reads data-text to duplicate text content
      {...(glitch && typeof children === 'string' ? { 'data-text': children } : {})}
      {...props}
    >
      {children}
    </Tag>
  )
}
