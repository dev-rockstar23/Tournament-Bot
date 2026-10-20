'use client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LiquidCard } from '@/components/ui/LiquidCard'
import { LiquidButton } from '@/components/ui/LiquidButton'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { cardTilt } from '@/lib/motion'

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <LiquidCard
        liquid
        magnetic
        neonColor={isConnected ? 'violet' : 'cyan'}
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
        role={isConnected ? 'button' : undefined}
        tabIndex={isConnected ? 0 : -1}
        aria-label={`${name} — ${isConnected ? 'Bot installed' : 'Add bot to server'}`}
        className={cn(
          'p-5 flex flex-col gap-3 transition-all duration-300',
          isConnected
            ? 'cursor-pointer hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-900/20'
            : 'cursor-default opacity-80'
        )}
      >
        {/* Header: icon + name + status badge */}
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 relative">
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
              <motion.div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.6) 0%, rgba(6,182,212,0.6) 100%)',
                  border: '1px solid rgba(124,58,237,0.3)',
                }}
                initial={{ rotate: -180, scale: 0.5 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
                aria-hidden="true"
              >
                <span
                  className="text-2xl font-black text-white"
                  style={{ fontFamily: 'var(--font-display, Orbitron, sans-serif)' }}
                >
                  {name.charAt(0).toUpperCase()}
                </span>
              </motion.div>
            )}
            {/* Status indicator */}
            <motion.span
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[var(--color-bg-primary)]"
              style={{
                background: isConnected ? '#22c55e' : '#64748b',
                boxShadow: isConnected ? '0 0 10px #22c55e, 0 0 20px #22c55e' : 'none',
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
              aria-label={isConnected ? 'Bot online' : 'Bot offline'}
            />
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
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex flex-wrap gap-2"
          >
            {liveCount > 0 && (
              <Badge variant="live">{liveCount} Live</Badge>
            )}
            {upcomingCount > 0 && (
              <Badge variant="upcoming">{upcomingCount} Upcoming</Badge>
            )}
          </motion.div>
        )}

        {/* Bot invite CTA for eligible (non-connected) servers */}
        {!isConnected && (
          <motion.a
            href={inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-auto text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <LiquidButton variant="cyber" size="sm" className="w-full" magnetic ripple>
              + Add to Discord
            </LiquidButton>
          </motion.a>
        )}

        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono text-[var(--color-text-muted)]"
          >
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-neon-violet)]" />
              Click to manage
            </span>
            <span>ID: {guildId.slice(-8)}</span>
          </motion.div>
        )}
      </LiquidCard>
    </motion.div>
  )
}