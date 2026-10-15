'use client'
import Image from 'next/image'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'

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
  href?: string
}

const gameGradients: Record<string, string> = {
  BGMI: 'from-green-600/60 to-teal-700/60',
  FREE_FIRE: 'from-orange-600/60 to-red-700/60',
  COD_MOBILE: 'from-blue-600/60 to-purple-700/60',
}

const gameLabels: Record<string, string> = {
  BGMI: 'BGMI',
  FREE_FIRE: 'Free Fire',
  COD_MOBILE: 'COD Mobile',
}

const gameBadgeClass: Record<string, string> = {
  BGMI: 'bg-green-500/15 border-green-500/30 text-green-400',
  FREE_FIRE: 'bg-orange-500/15 border-orange-500/30 text-orange-400',
  COD_MOBILE: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
}

type BadgeVariant = 'live' | 'upcoming' | 'completed' | 'cancelled' | 'draft' | 'default'

const statusBadgeVariant: Record<string, BadgeVariant> = {
  LIVE: 'live',
  REGISTRATION_OPEN: 'upcoming',
  CHECK_IN: 'draft',
  COMPLETED: 'completed',
  DRAFT: 'default',
  CANCELLED: 'cancelled',
  REGISTRATION_CLOSED: 'cancelled',
  ARCHIVED: 'cancelled',
}

const statusLabel: Record<string, string> = {
  LIVE: 'Live',
  REGISTRATION_OPEN: 'Registration Open',
  CHECK_IN: 'Check-In',
  COMPLETED: 'Completed',
  DRAFT: 'Draft',
  CANCELLED: 'Cancelled',
  REGISTRATION_CLOSED: 'Registration Closed',
  ARCHIVED: 'Archived',
}

function getTimeLabel(status: string, registrationClose: string | null, startAt: string | null): string | null {
  try {
    if (status === 'REGISTRATION_OPEN' && registrationClose) {
      return `Registration closes ${formatDistanceToNow(new Date(registrationClose))}`
    }
    if (status === 'LIVE' && startAt) {
      return `Started ${formatDistanceToNow(new Date(startAt))} ago`
    }
    if ((status === 'DRAFT' || status === 'REGISTRATION_CLOSED' || status === 'CHECK_IN') && startAt) {
      return `Starts ${formatDistanceToNow(new Date(startAt))}`
    }
  } catch {
    return null
  }
  return null
}

export function TournamentCard({
  id,
  guildId,
  name,
  game,
  mode,
  status,
  capacity,
  acceptedCount,
  registrationClose,
  startAt,
  bannerUrl,
  href,
}: TournamentCardProps) {
  const destination = href ?? `/servers/${guildId}/tournaments/${id}`
  const fillPct = capacity > 0 ? Math.min((acceptedCount / capacity) * 100, 100) : 0
  const timeLabel = getTimeLabel(status, registrationClose, startAt)

  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
      <Link href={destination} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed] rounded-2xl">
        <GlassCard className="overflow-hidden" hover={false}>
          {/* Banner */}
          <div className="relative h-36 w-full overflow-hidden">
            {bannerUrl ? (
              <Image
                src={bannerUrl}
                alt={`${name} banner`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover"
              />
            ) : (
              <div
                className={`w-full h-full bg-gradient-to-br ${gameGradients[game] ?? 'from-violet-600/60 to-indigo-700/60'}`}
                aria-hidden="true"
              />
            )}
            {/* Overlay gradient for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" aria-hidden="true" />
            {/* Badges row */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${gameBadgeClass[game] ?? 'bg-violet-500/15 border-violet-500/30 text-violet-400'}`}
              >
                {gameLabels[game] ?? game}
              </span>
              <Badge variant={statusBadgeVariant[status] ?? 'default'}>
                {statusLabel[status] ?? status}
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 flex flex-col gap-3">
            {/* Title + mode */}
            <div>
              <h3
                className="font-display text-base font-bold text-white leading-tight line-clamp-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {name}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{mode}</p>
            </div>

            {/* Capacity bar */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Teams</span>
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                  {acceptedCount}/{capacity}
                </span>
              </div>
              <div
                className="h-1.5 rounded-full bg-white/10 overflow-hidden"
                role="progressbar"
                aria-valuenow={acceptedCount}
                aria-valuemin={0}
                aria-valuemax={capacity}
                aria-label={`${acceptedCount} of ${capacity} teams registered`}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] transition-all duration-500"
                  style={{ width: `${fillPct}%` }}
                />
              </div>
            </div>

            {/* Time info */}
            {timeLabel && (
              <p className="text-xs text-[var(--color-text-muted)]">{timeLabel}</p>
            )}

            {/* CTA button */}
            <div className="mt-1">
              {status === 'REGISTRATION_OPEN' ? (
                <span className="inline-flex items-center justify-center w-full px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#7c3aed] to-[#9f5bff] text-white border border-[rgba(124,58,237,0.5)]">
                  Register
                </span>
              ) : (
                <span className="inline-flex items-center justify-center w-full px-4 py-2 rounded-xl text-sm font-semibold bg-transparent text-[#f8fafc] border border-[rgba(255,255,255,0.15)]">
                  View
                </span>
              )}
            </div>
          </div>
        </GlassCard>
      </Link>
    </motion.div>
  )
}
