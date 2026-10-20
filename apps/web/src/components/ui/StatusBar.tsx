'use client'
import { useEffect, useState, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { StatusPulse } from './StatusPulse'
import { LiquidCard } from './LiquidCard'

interface StatusBarProps {
  /** Whether the shard (server) is considered online */
  shardOnline?: boolean
  /** Optional content rendered on the left side of the bar */
  children?: ReactNode
  className?: string
}

function pad(n: number, digits = 2): string {
  return String(n).padStart(digits, '0')
}

function utcTime(): string {
  const d = new Date()
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`
}

export function StatusBar({ shardOnline = true, children, className }: StatusBarProps) {
  const [tick, setTick] = useState(0)
  const [time, setTime] = useState(utcTime)

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1)
      setTime(utcTime())
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <LiquidCard
      hud
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'animate-[hud-slide-in_0.3s_ease-out]',
        'flex items-center justify-between',
        'px-4 py-1.5 gap-4',
        'text-[10px] font-mono text-[var(--color-text-secondary)]',
        'tracking-widest uppercase',
        className
      )}
      role="status"
      aria-label="System status bar"
    >
      {/* Left slot */}
      <div className="flex items-center gap-4">
        {children && <span className="text-[var(--color-text-muted)]">{children}</span>}

        {/* SHARD indicator */}
        <span className="flex items-center gap-1.5">
          <StatusPulse variant={shardOnline ? 'synced' : 'offline'} />
          <span className={shardOnline ? 'text-[var(--color-neon-green)]' : 'text-gray-500'}>
            SHARD {shardOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </span>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-6">
        {/* TICK counter */}
        <span className="flex items-center gap-1.5">
          <span className="text-[var(--color-text-muted)]">TICK</span>
          <span className="text-[var(--color-neon-cyan)] font-mono tabular-nums">
            {pad(tick, 6)}
          </span>
        </span>

        {/* SYNCED */}
        <span className="flex items-center gap-1.5">
          <StatusPulse variant="synced" />
          <span className="text-[var(--color-neon-green)]">SYNCED</span>
        </span>

        {/* UTC clock */}
        <span className="text-[var(--color-neon-violet)] font-mono tabular-nums">{time}</span>
      </div>
    </LiquidCard>
  )
}