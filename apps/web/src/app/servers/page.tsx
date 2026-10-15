'use client'
import { useState, useEffect } from 'react'
import Navigation from '@/components/ui/Navigation'
import { ServerCard } from '@/components/server/ServerCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { GlowButton } from '@/components/ui/GlowButton'
import Link from 'next/link'

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

export default function ServersPage() {
  const [data, setData] = useState<ServersData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  function fetchServers() {
    setLoading(true)
    setError(null)
    fetch('/api/servers')
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error('You must be logged in to view your servers.')
          }
          throw new Error(`Failed to load servers (${res.status})`)
        }
        return res.json() as Promise<ServersData>
      })
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchServers()
  }, [])

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page header */}
        <div className="mb-10">
          <h1
            className="text-4xl font-black text-white mb-2"
            style={{ fontFamily: 'var(--font-display, Orbitron, sans-serif)' }}
          >
            Your Servers
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Select a server to view its tournaments and leaderboards.
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card p-5 flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="text-center py-20">
            <div className="text-red-400 text-lg mb-2 font-semibold">Something went wrong</div>
            <p className="text-[var(--color-text-secondary)] mb-6 max-w-md mx-auto">{error}</p>
            <GlowButton variant="primary" size="sm" onClick={fetchServers}>
              Try Again
            </GlowButton>
          </div>
        )}

        {/* Data loaded */}
        {!loading && !error && data && (
          <>
            {/* No connected servers at all */}
            {data.connected.length === 0 && data.eligible.length === 0 && (
              <div className="text-center py-20">
                <div
                  className="text-5xl mb-4"
                  role="img"
                  aria-label="No servers"
                >
                  🏟️
                </div>
                <h2
                  className="text-2xl font-bold text-white mb-2"
                  style={{ fontFamily: 'var(--font-display, Orbitron, sans-serif)' }}
                >
                  No Servers Yet
                </h2>
                <p className="text-[var(--color-text-secondary)] mb-6 max-w-md mx-auto">
                  You haven&apos;t added the bot to any Discord server you manage. Add it to get
                  started with tournaments.
                </p>
                <GlowButton variant="primary" size="md" asChild>
                  <a
                    href={`https://discord.com/api/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-underline text-white"
                  >
                    Add Bot to a Server
                  </a>
                </GlowButton>
              </div>
            )}

            {/* Connected servers */}
            {data.connected.length > 0 && (
              <section className="mb-12">
                <h2
                  className="text-xl font-bold text-white mb-4"
                  style={{ fontFamily: 'var(--font-display, Orbitron, sans-serif)' }}
                >
                  Your Servers
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.connected.map((server) => (
                    <ServerCard key={server.guildId} {...server} />
                  ))}
                </div>
              </section>
            )}

            {/* Eligible servers (add bot CTA) */}
            {data.eligible.length > 0 && (
              <section className="mb-12">
                <h2
                  className="text-xl font-bold text-white mb-1"
                  style={{ fontFamily: 'var(--font-display, Orbitron, sans-serif)' }}
                >
                  Add Bot to Server
                </h2>
                <p className="text-[var(--color-text-secondary)] text-sm mb-4">
                  You manage these servers. Add the bot to unlock tournaments.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.eligible.map((server) => (
                    <ServerCard key={server.guildId} {...server} />
                  ))}
                </div>
              </section>
            )}

            {/* Optional note (e.g. no Discord token) */}
            {data.note && (
              <p className="text-amber-400 text-sm text-center mt-4">{data.note}</p>
            )}
          </>
        )}

        <div className="mt-8">
          <Link href="/" className="text-[var(--color-accent)] hover:underline text-sm">
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}
