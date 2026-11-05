'use client'

import Image from 'next/image'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'

interface TournamentCardProps {
  id: string
  guildId: string
  name: string
  game: 'BGMI' | 'FREE_FIRE' | 'COD_MOBILE'
  mode: string
  status: string
  capacity: number
  acceptedCount: number
  registrationClose: string | null
  startAt: string | null
  bannerUrl: string | null
  tournamentCode?: string | null
  href?: string
}

const gameConfig: Record<string, { label: string; color: string; glow: string; grad: string }> = {
  BGMI:       { label: 'BGMI',       color: '#22d3ee', glow: 'rgba(34,211,238,0.3)',  grad: 'from-teal-800/70 to-cyan-900/70' },
  FREE_FIRE:  { label: 'FREE FIRE',  color: '#f97316', glow: 'rgba(249,115,22,0.3)',  grad: 'from-orange-800/70 to-red-900/70' },
  COD_MOBILE: { label: 'COD MOBILE', color: '#a855f7', glow: 'rgba(168,85,247,0.3)',  grad: 'from-violet-800/70 to-indigo-900/70' },
}

const statusConfig: Record<string, { label: string; color: string; bg: string; ring: string; pulse: boolean }> = {
  LIVE:               { label: 'LIVE',               color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   ring: 'rgba(239,68,68,0.25)',   pulse: true },
  REGISTRATION_OPEN:  { label: 'REG OPEN',           color: '#22d3ee', bg: 'rgba(34,211,238,0.1)',  ring: 'rgba(34,211,238,0.25)',  pulse: true },
  CHECK_IN:           { label: 'CHECK-IN',           color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  ring: 'rgba(245,158,11,0.25)',  pulse: true },
  COMPLETED:          { label: 'COMPLETED',          color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   ring: 'rgba(34,197,94,0.25)',   pulse: false },
  DRAFT:              { label: 'DRAFT',              color: '#64748b', bg: 'rgba(100,116,139,0.1)', ring: 'rgba(100,116,139,0.2)',  pulse: false },
  CANCELLED:          { label: 'CANCELLED',          color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   ring: 'rgba(239,68,68,0.2)',    pulse: false },
  REGISTRATION_CLOSED:{ label: 'REG CLOSED',         color: '#64748b', bg: 'rgba(100,116,139,0.1)', ring: 'rgba(100,116,139,0.2)',  pulse: false },
  ARCHIVED:           { label: 'ARCHIVED',           color: '#334155', bg: 'rgba(51,65,85,0.1)',    ring: 'rgba(51,65,85,0.2)',     pulse: false },
}

function getTimeLabel(status: string, registrationClose: string | null, startAt: string | null): string | null {
  try {
    if (status === 'REGISTRATION_OPEN' && registrationClose)
      return `Reg closes ${formatDistanceToNow(new Date(registrationClose))}`
    if (status === 'LIVE' && startAt)
      return `Started ${formatDistanceToNow(new Date(startAt))} ago`
    if ((status === 'DRAFT' || status === 'REGISTRATION_CLOSED' || status === 'CHECK_IN') && startAt)
      return `Starts in ${formatDistanceToNow(new Date(startAt))}`
  } catch { /* ignore */ }
  return null
}

export function TournamentCard({
  id, guildId, name, game, mode, status, capacity, acceptedCount,
  registrationClose, startAt, bannerUrl, tournamentCode, href,
}: TournamentCardProps) {
  const destination = href ?? `/servers/${guildId}/tournaments/${id}`
  const fillPct = capacity > 0 ? Math.min((acceptedCount / capacity) * 100, 100) : 0
  const timeLabel = getTimeLabel(status, registrationClose, startAt)
  const g = gameConfig[game] ?? gameConfig.BGMI
  const s = statusConfig[status] ?? statusConfig.DRAFT

  return (
    <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
      <Link href={destination}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed] rounded-[20px]"
        aria-label={`${name} — ${s.label}`}>
        <div className="relative flex flex-col overflow-hidden rounded-[20px] tournament-card-glow group"
          style={{
            background: 'rgba(13,13,26,0.85)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(16px)',
            transition: 'border-color .25s ease, box-shadow .25s ease',
          }}>

          {/* Banner */}
          <div className="relative h-40 overflow-hidden shrink-0">
            {bannerUrl ? (
              <Image src={bannerUrl} alt={`${name} banner`} fill
                sizes="(max-width:768px) 100vw, 400px"
                className="object-cover transition-transform duration-700 group-hover:scale-105" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${g.grad}`} aria-hidden />
            )}
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg,rgba(0,0,0,0.15) 0%,rgba(13,13,26,0.9) 100%)' }} aria-hidden />

            {/* Game + status badges */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider"
                style={{ background: `${g.color}14`, color: g.color, border: `1px solid ${g.color}28` }}>
                {g.label}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                style={{ background: s.bg, color: s.color, border: `1px solid ${s.ring}` }}>
                {s.pulse && <span className="size-[5px] rounded-full animate-pulse shrink-0" style={{ background: s.color }} aria-hidden />}
                {s.label}
              </span>
            </div>

            {/* Tournament code */}
            {tournamentCode && (
              <span className="absolute bottom-3 left-3 font-mono text-[10px] px-2 py-0.5 rounded"
                style={{ background: 'rgba(124,58,237,0.2)', color: '#9f5bff', border: '1px solid rgba(124,58,237,0.3)' }}>
                #{tournamentCode}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col gap-3 p-5">
            <div>
              <h3 className="font-bold text-[15px] text-[#f1f5f9] line-clamp-2 leading-tight"
                style={{ fontFamily: 'var(--font-orbitron)' }}>
                {name}
              </h3>
              <p className="text-[11px] text-[#475569] mt-1">{mode}</p>
            </div>

            {/* Capacity bar */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[#475569]">Teams</span>
                <span className="text-[10px] font-semibold text-[#64748b]">{acceptedCount}/{capacity}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}
                role="progressbar" aria-valuenow={acceptedCount} aria-valuemin={0} aria-valuemax={capacity}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${fillPct}%`,
                    background: `linear-gradient(90deg, ${g.color}99, ${g.color})`,
                    boxShadow: fillPct >= 90 ? `0 0 8px ${g.color}` : 'none',
                  }} />
              </div>
            </div>

            {/* Time */}
            {timeLabel && (
              <p className="text-[10px] text-[#334155]" style={{ fontFamily: 'var(--font-jetbrains)' }}>{timeLabel}</p>
            )}

            {/* CTA */}
            <div className="mt-1">
              {status === 'REGISTRATION_OPEN' ? (
                <span className="flex items-center justify-center w-full px-4 py-2.5 rounded-[10px] text-[12px] font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#9f5bff)', boxShadow: '0 2px 12px rgba(124,58,237,0.3)' }}>
                  Register Now →
                </span>
              ) : (
                <span className="flex items-center justify-center w-full px-4 py-2.5 rounded-[10px] text-[12px] font-semibold text-[#64748b] transition-all"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  View Details
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
