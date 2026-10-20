'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Navigation from '@/components/ui/Navigation'
import { ServerCard } from '@/components/server/ServerCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { LiquidButton } from '@/components/ui/LiquidButton'
import { LiquidCard } from '@/components/ui/LiquidCard'
import { NeonText } from '@/components/ui/NeonText'
import { StatusBar } from '@/components/ui/StatusBar'
import { StatusPulse } from '@/components/ui/StatusPulse'
import Link from 'next/link'
import { LiquidBackground } from '@/components/ui/LiquidBackground'
import { fadeUp, staggerChildren, fadeIn, cardStack, liquidReveal } from '@/lib/motion'

export const dynamic = 'force-dynamic'

interface ServerItem {
  guildId: string
  name: string
  icon: string | null
  isConnected: boolean
  liveCount: number
  upcomingCount: number
}

interface ServersData {
  connected: ServerItem[]
  eligible: ServerItem[]
  unavailable: ServerItem[]
  note?: string
}

type FilterTab = 'all' | 'connected' | 'eligible' | 'archived'

export default function ServersPage() {
  const [data, setData] = useState<ServersData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')

  function fetchServers() {
    setLoading(true)
    setError(null)
    fetch('/api/servers')
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) throw new Error('You must be logged in to view your servers.')
          throw new Error(`Failed to load servers (${res.status})`)
        }
        return res.json() as Promise<ServersData>
      })
      .then((d) => { setData(d); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }

  useEffect(() => { fetchServers() }, [])

  const total = data ? data.connected.length + data.eligible.length : 0
  const connectedOnline = data ? data.connected.filter((s) => s.liveCount > 0 || s.upcomingCount > 0).length : 0

  const filteredConnected = data?.connected.filter((s) => {
    if (activeTab === 'eligible') return false
    if (activeTab === 'archived') return false
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }) ?? []

  const filteredEligible = data?.eligible.filter((s) => {
    if (activeTab === 'connected') return false
    if (activeTab === 'archived') return false
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }) ?? []

  return (
    <>
      {/* Liquid animated background */}
      <LiquidBackground variant="tournament" particleCount={30} />

      <main className="relative z-10 min-h-screen pb-16">
        {/* Scanline overlay */}
        <div className="scanline-overlay" aria-hidden="true" />
        <Navigation />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Page header */}
          <motion.div
            className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-10"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={fadeUp}
          >
            <div>
              <NeonText as="h1" color="violet" glitch className="text-4xl sm:text-5xl font-black tracking-wider mb-2 liquid-text">
                YOUR ESPORTS GUILDS & SERVERS
              </NeonText>
              <p className="font-mono text-sm text-[var(--color-text-secondary)] tracking-widest uppercase">
                Manage your discord tactical lobbies and tournament hubs
              </p>
            </div>
            {/* Stat badges top-right */}
            <div className="flex items-center gap-3 mt-3 sm:mt-0 flex-shrink-0">
              <LiquidCard neonColor="cyan" className="px-3 py-1.5">
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-neon-cyan)] tracking-widest uppercase">
                  <StatusPulse variant="synced" />
                  {total} GUILDS CACHED
                </div>
              </LiquidCard>
              <LiquidCard neonColor="violet" className="px-3 py-1.5">
                <span className="text-xs font-mono text-[var(--color-neon-violet)] tracking-widest uppercase">NODE: DELTA-ASIA</span>
              </LiquidCard>
            </div>
          </motion.div>

          {/* Filter tabs */}
          {!loading && !error && data && (
            <motion.div
              className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              variants={fadeUp}
            >
              <div className="flex items-center gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Server filter">
                {(
                  [
                    { key: 'all', label: `ALL SERVERS (${total})` },
                    { key: 'connected', label: `CONNECTED & ONLINE (${data.connected.length})` },
                    { key: 'eligible', label: `ELIGIBLE TO CONNECT (${data.eligible.length})` },
                    { key: 'archived', label: 'ARCHIVED (0)' },
                  ] as { key: FilterTab; label: string }[]
                ).map(({ key, label }) => (
                  <motion.button
                    key={key}
                    role="tab"
                    aria-selected={activeTab === key}
                    onClick={() => setActiveTab(key)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * (['all', 'connected', 'eligible', 'archived'].indexOf(key)) }}
                    className={[
                      'px-4 py-2 rounded-full text-xs font-mono font-bold whitespace-nowrap tracking-widest uppercase transition-all',
                      activeTab === key
                        ? 'bg-gradient-to-r from-[var(--color-neon-violet)] to-[var(--color-neon-cyan)] text-black shadow-[0_0_20px_rgba(124,58,237,0.4)]'
                        : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 border border-white/10',
                    ].join(' ')}
                  >
                    {label}
                  </motion.button>
                ))}
              </div>
              <div className="sm:ml-auto">
                <input
                  type="search"
                  placeholder="SEARCH SERVERS..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search servers"
                  className="liquid-input w-full sm:w-48 px-3 py-1.5 rounded-lg text-xs font-mono tracking-widest uppercase"
                />
              </div>
            </motion.div>
          )}

          {/* Loading state */}
          {loading && (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              initial="hidden"
              animate="visible"
              variants={staggerChildren}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div key={i} variants={fadeUp} className="liquid-skeleton p-5 flex flex-col gap-3 h-40" />
              ))}
            </motion.div>
          )}

          {/* Error state */}
          {!loading && error && (
            <motion.div
              className="text-center py-20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              variants={fadeUp}
            >
              <div className="text-red-400 text-lg mb-2 font-semibold font-mono tracking-widest uppercase">
                CONNECTION FAILED
              </div>
              <p className="text-[var(--color-text-secondary)] mb-6 max-w-md mx-auto font-mono text-sm">{error}</p>
              <LiquidButton variant="cyber" size="sm" onClick={fetchServers} magnetic ripple>
                RETRY CONNECTION
              </LiquidButton>
            </motion.div>
          )}

          {/* Data loaded */}
          {!loading && !error && data && (
            <>
              {/* No servers empty state */}
              {data.connected.length === 0 && data.eligible.length === 0 && (
                <motion.div
                  className="text-center py-20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  variants={fadeUp}
                >
                  <div className="text-6xl mb-4" role="img" aria-label="No servers">🏟️</div>
                  <NeonText as="h2" color="violet" className="text-2xl font-bold mb-2 liquid-text">
                    NO GUILDS DETECTED
                  </NeonText>
                  <p className="text-[var(--color-text-secondary)] mb-6 max-w-md mx-auto font-mono text-sm">
                    No Discord server detected. Deploy the bot to your server to begin operations.
                  </p>
                  <LiquidButton variant="liquid" size="lg" asChild magnetic ripple>
                    <a
                      href={`https://discord.com/api/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="no-underline text-white font-bold"
                    >
                      DEPLOY BOT NOW
                    </a>
                  </LiquidButton>
                </motion.div>
              )}

              {/* Connected servers section */}
              {filteredConnected.length > 0 && (
                <motion.section
                  className="mb-12"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-100px' }}
                  variants={staggerChildren}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <motion.div
                        className="w-1 h-6 rounded-full"
                        style={{ background: 'var(--color-neon-violet)' }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                        aria-hidden="true"
                      />
                      <h2 className="font-display text-sm font-bold text-white tracking-widest uppercase">
                        CONNECTED TACTICAL LOBBIES — PROD READY
                      </h2>
                      <StatusPulse variant="synced" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[var(--color-text-muted)] tracking-widest uppercase">SORT</span>
                      <select
                        className="liquid-input text-xs font-mono tracking-widest uppercase px-2 py-1"
                        aria-label="Sort servers"
                      >
                        <option value="activity" className="bg-[#0a0a14]">BY ACTIVITY</option>
                        <option value="name" className="bg-[#0a0a14]">BY NAME</option>
                        <option value="live" className="bg-[#0a0a14]">LIVE FIRST</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredConnected.map((server, index) => (
                      <motion.div key={server.guildId} variants={cardStack}>
                        <ServerCard {...server} />
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}

              {/* Eligible servers section */}
              {filteredEligible.length > 0 && activeTab !== 'connected' && (
                <motion.section
                  className="mb-12"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-100px' }}
                  variants={staggerChildren}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <motion.div
                      className="w-1 h-6 rounded-full"
                      style={{ background: 'var(--color-neon-cyan)' }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 0.2, duration: 0.4 }}
                      aria-hidden="true"
                    />
                    <h2 className="font-display text-sm font-bold text-white tracking-widest uppercase">
                      ELIGIBLE SERVERS (BOT NOT INSTALLED YET)
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEligible.map((server, index) => (
                      <motion.div key={server.guildId} variants={cardStack}>
                        <LiquidCard
                          liquid
                          magnetic
                          neonColor="cyan"
                          className="p-5 border-dashed"
                        >
                          <div className="flex items-center gap-4 mb-3">
                            <div className="w-12 h-12 rounded-full bg-[var(--color-neon-cyan)]/10 border border-[var(--color-neon-cyan)]/30 flex items-center justify-center flex-shrink-0">
                              <span className="font-display text-lg font-black text-[var(--color-neon-cyan)]">
                                {server.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-bold text-sm font-display truncate">{server.name}</p>
                              <p className="text-xs font-mono text-[var(--color-text-muted)] tracking-widest">
                                ID: {server.guildId}
                              </p>
                            </div>
                          </div>
                          <a
                            href={`https://discord.com/api/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${server.guildId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="liquid-button block w-full text-center text-xs font-mono font-bold tracking-widest uppercase px-3 py-2 rounded-lg bg-[var(--color-neon-cyan)]/10 border border-[var(--color-neon-cyan)]/40 text-[var(--color-neon-cyan)] hover:bg-[var(--color-neon-cyan)]/20 transition-colors"
                          >
                            + ADD DISCORD BOT
                          </a>
                        </LiquidCard>
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}

              {/* Missing server CTA banner */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-100px' }}
                variants={liquidReveal}
              >
                <LiquidCard liquid magnetic hud className="p-6 mb-8">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <NeonText as="h3" color="cyan" className="text-lg font-black tracking-widest mb-1 liquid-text">
                        MISSING A SERVER?
                      </NeonText>
                      <p className="text-sm font-mono text-[var(--color-text-secondary)]">
                        Deploy the bot to any Discord server you manage to unlock full tournament operations.
                      </p>
                    </div>
                    <LiquidButton variant="cyber" size="md" asChild magnetic ripple>
                      <a
                        href={`https://discord.com/api/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="no-underline text-black whitespace-nowrap"
                      >
                        ADD TO SERVER
                      </a>
                    </LiquidButton>
                  </div>
                </LiquidCard>
              </motion.div>

              {/* Optional note */}
              {data.note && (
                <p className="text-amber-400 text-sm text-center mt-4 font-mono">{data.note}</p>
              )}
            </>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link href="/" className="text-[var(--color-text-muted)] hover:text-[var(--color-neon-cyan)] text-xs font-mono tracking-widest uppercase transition-colors">
              ← BACK TO HOME
            </Link>
          </motion.div>
        </div>

        {/* Footer status bar */}
        <StatusBar shardOnline>
          <span className="text-[var(--color-neon-green)]">ACTIVE GATEWAY</span>
          <span className="mx-2 text-[var(--color-text-muted)]">|</span>
          <span>SYNC: <span className="text-[var(--color-neon-cyan)]">REAL-TIME WEBSOCKET 0s</span></span>
          <span className="mx-2 text-[var(--color-text-muted)]">|</span>
          <span>PLAYERS: <span className="text-[var(--color-neon-violet)]">{connectedOnline}</span></span>
        </StatusBar>
      </main>
    </>
  )
}