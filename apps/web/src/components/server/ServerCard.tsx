'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'
import { getBotInviteUrl, getGuildIconUrl } from '@/lib/discord'

interface ServerCardProps {
  guildId: string
  name: string
  icon: string | null
  isConnected: boolean
  liveCount: number
  upcomingCount: number
}

export function ServerCard({ guildId, name, icon, isConnected, liveCount, upcomingCount }: ServerCardProps) {
  const router = useRouter()

  /* 3D magnetic tilt */
  const cardRef = motion.div
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rx = useSpring(useTransform(y, [-0.5, 0.5], ['-7deg', '7deg']), { stiffness: 200, damping: 22 })
  const ry = useSpring(useTransform(x, [-0.5, 0.5], ['-7deg', '7deg']), { stiffness: 200, damping: 22 })

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    x.set((e.clientX - r.left) / r.width - 0.5)
    y.set((e.clientY - r.top) / r.height - 0.5)
  }
  function handleLeave() { x.set(0); y.set(0) }

  function handleClick() {
    if (!isConnected) return
    localStorage.setItem('lastGuildId', guildId)
    router.push(`/servers/${guildId}`)
  }

  const inviteUrl = getBotInviteUrl(isConnected ? undefined : guildId)
  const iconUrl = icon ? getGuildIconUrl(guildId, icon, 128) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}>

      <div
        className={cn(
          'relative flex flex-col gap-4 p-5 rounded-[20px] overflow-hidden tournament-card-glow',
          isConnected ? 'cursor-pointer' : 'cursor-default opacity-75',
        )}
        style={{
          background: 'rgba(13,13,26,0.85)',
          border: `1px solid ${isConnected ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.05)'}`,
          backdropFilter: 'blur(16px)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.3)',
        }}
        onClick={handleClick}
        onKeyDown={isConnected ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() } } : undefined}
        role={isConnected ? 'button' : undefined}
        tabIndex={isConnected ? 0 : -1}
        aria-label={`${name} — ${isConnected ? 'Open server hub' : 'Add bot to server'}`}>

        {/* Background glow */}
        {isConnected && (
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 rounded-[20px]"
            style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 0%, rgba(124,58,237,0.08) 0%,transparent 70%)' }}
            aria-hidden />
        )}

        {/* Header */}
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="relative shrink-0">
            {iconUrl ? (
              <Image src={iconUrl} alt={`${name} icon`} width={56} height={56}
                className="rounded-[14px] border"
                style={{ borderColor: isConnected ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.08)' }}
                unoptimized />
            ) : (
              <div className="size-14 rounded-[14px] flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.4) 0%, rgba(6,182,212,0.4) 100%)',
                  border: '1px solid rgba(124,58,237,0.25)',
                }}>
                <span className="font-black text-xl text-white" style={{ fontFamily: 'var(--font-orbitron)' }}>
                  {name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {/* Status dot */}
            <span className="absolute -bottom-1 -right-1 size-3.5 rounded-full border-2"
              style={{
                background: isConnected ? '#22c55e' : '#334155',
                borderColor: '#0d0d1a',
                boxShadow: isConnected ? '0 0 8px #22c55e, 0 0 16px rgba(34,197,94,0.4)' : 'none',
              }}
              aria-label={isConnected ? 'Bot online' : 'Bot not installed'} />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[14px] text-[#f1f5f9] truncate"
              style={{ fontFamily: 'var(--font-orbitron)' }} title={name}>
              {name}
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: isConnected ? '#22c55e' : '#475569' }}>
              {isConnected ? '● Bot installed' : '○ Bot not installed'}
            </p>
          </div>
        </div>

        {/* Live / upcoming chips */}
        {isConnected && (liveCount > 0 || upcomingCount > 0) && (
          <div className="flex flex-wrap gap-2">
            {liveCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                <span className="size-[5px] rounded-full bg-[#ef4444] animate-pulse" aria-hidden />
                {liveCount} Live
              </span>
            )}
            {upcomingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                style={{ background: 'rgba(34,211,238,0.08)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.18)' }}>
                {upcomingCount} Upcoming
              </span>
            )}
          </div>
        )}

        {/* Footer / CTA */}
        <div className="mt-auto pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {isConnected ? (
            <div className="flex items-center justify-between text-[10px] text-[#334155]"
              style={{ fontFamily: 'var(--font-jetbrains)' }}>
              <span>{liveCount === 0 && upcomingCount === 0 ? 'No active tournaments' : '↗ Click to manage'}</span>
              <span>ID: …{guildId.slice(-6)}</span>
            </div>
          ) : (
            <a href={inviteUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[10px] text-[12px] font-semibold text-white transition-all hover:opacity-90 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] liquid-button"
              style={{ background: 'linear-gradient(135deg,#0e7490,#06b6d4)', border: '1px solid rgba(6,182,212,0.3)' }}
              onClick={(e) => e.stopPropagation()}>
              + Add SHADØW Bot
            </a>
          )}
        </div>
      </div>
    </motion.div>
  )
}
