'use client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'

interface ServerCardProps {
  guildId: string
  name: string
  icon: string | null
  isConnected: boolean
  liveCount: number
  upcomingCount: number
}

export function ServerCard({
  guildId,
  name,
  icon,
  isConnected,
  liveCount,
  upcomingCount,
}: ServerCardProps) {
  const router = useRouter()

  function handleClick() {
    if (isConnected) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('lastGuildId', guildId)
      }
      router.push(`/servers/${guildId}`)
    }
  }

  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`

  return (
    <GlassCard
      role="button"
      aria-label={`${name} — ${isConnected ? 'Bot installed' : 'Add bot to server'}`}
      tabIndex={isConnected ? 0 : -1}
      onClick={isConnected ? handleClick : undefined}
      onKeyDown={
        isConnected
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleClick()
              }
            }
          : undefined
      }
      className={`p-5 flex flex-col gap-3 transition-all duration-200 ${
        isConnected
          ? 'hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-900/20 cursor-pointer'
          : 'cursor-default opacity-80'
      }`}
    >
      {/* Header: icon + name + status badge */}
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          {icon ? (
            <Image
              src={`https://cdn.discordapp.com/icons/${guildId}/${icon}.png?size=128`}
              alt={`${name} icon`}
              width={64}
              height={64}
              className="rounded-full border border-white/10"
              unoptimized
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full bg-violet-700/60 border border-violet-500/30 flex items-center justify-center"
              aria-hidden="true"
            >
              <span
                className="text-2xl font-black text-white"
                style={{ fontFamily: 'var(--font-display, Orbitron, sans-serif)' }}
              >
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3
            className="text-white font-bold truncate text-sm leading-tight mb-1.5"
            style={{ fontFamily: 'var(--font-display, Orbitron, sans-serif)' }}
            title={name}
          >
            {name}
          </h3>
          {isConnected ? (
            <Badge variant="completed">Bot Installed</Badge>
          ) : (
            <Badge variant="default">Add Bot</Badge>
          )}
        </div>
      </div>

      {/* Live / Upcoming chips */}
      {(liveCount > 0 || upcomingCount > 0) && (
        <div className="flex flex-wrap gap-2">
          {liveCount > 0 && (
            <Badge variant="live">{liveCount} Live</Badge>
          )}
          {upcomingCount > 0 && (
            <Badge variant="upcoming">{upcomingCount} Upcoming</Badge>
          )}
        </div>
      )}

      {/* Bot invite CTA for eligible (non-connected) servers */}
      {!isConnected && (
        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-auto text-xs text-center px-3 py-2 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 hover:text-white transition-colors duration-150"
          aria-label={`Add bot to ${name}`}
        >
          + Add to Discord
        </a>
      )}
    </GlassCard>
  )
}
