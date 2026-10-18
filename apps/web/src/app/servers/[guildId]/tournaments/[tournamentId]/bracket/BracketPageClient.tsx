'use client'

import { useRef, useState } from 'react'
import { BracketVisualization } from '@/components/tournament/BracketVisualization'
import { MatchStatus } from '@esports/database'
import { Download, Share2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonText } from '@/components/ui/NeonText'
import { StatusBar } from '@/components/ui/StatusBar'
import { StatusPulse } from '@/components/ui/StatusPulse'
import { GlowButton } from '@/components/ui/GlowButton'

interface BracketMatch {
  id: string
  number: number
  round: number
  status: MatchStatus
  scheduledStart: string | null
  participants: Array<{ teamId: string; teamName: string; score?: number | null }>
  nextMatchId?: string | null
}

interface BracketPageClientProps {
  tournamentId: string
  tournamentName: string
  format: 'SINGLE_ELIM' | 'DOUBLE_ELIM' | 'ROUND_ROBIN'
  matches: BracketMatch[]
  guildId: string
}

const formatLabel: Record<string, string> = {
  SINGLE_ELIM: 'SINGLE ELIM',
  DOUBLE_ELIM: 'DOUBLE ELIM',
  ROUND_ROBIN: 'ROUND ROBIN',
}

const bracketTabs = ['UPPER BRACKET', 'LOWER BRACKET', 'GRAND FINALS', 'FULL TREE'] as const
type BracketTab = typeof bracketTabs[number]

export function BracketPageClient({
  tournamentId,
  tournamentName,
  format,
  matches,
  guildId,
}: BracketPageClientProps) {
  const bracketRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [activeTab, setActiveTab] = useState<BracketTab>('FULL TREE')
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null)

  const liveMatches = matches.filter((m) => m.status === 'LIVE')
  const completedMatches = matches.filter((m) => m.status === 'COMPLETED')
  const totalMatches = matches.length

  const handleExportPNG = async () => {
    if (!bracketRef.current) return
    setIsExporting(true)
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(bracketRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#050508',
      })
      const link = document.createElement('a')
      link.download = `${tournamentName.replace(/\s+/g, '_')}_bracket.png`
      link.href = dataUrl
      link.click()
      toast.success('Bracket exported successfully!')
    } catch (error) {
      console.error('Failed to export bracket:', error)
      toast.error('Failed to export bracket')
    } finally {
      setIsExporting(false)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: `${tournamentName} - Bracket`, url })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success('Link copied to clipboard!')
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to share:', error)
        toast.error('Failed to share bracket')
      }
    }
  }

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="scanline-overlay" aria-hidden="true" />

      {/* HUD Header */}
      <div className="sticky top-0 z-20 hud-grid-bg border-b border-[var(--color-neon-cyan)] backdrop-blur-sm">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href={`/servers/${guildId}/tournaments/${tournamentId}`}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-neon-cyan)] transition-colors"
                aria-label="Back to tournament"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <NeonText as="h1" color="violet" className="text-lg font-black tracking-widest">
                  {tournamentName}
                </NeonText>
                <p className="text-xs font-mono text-[var(--color-text-muted)] tracking-widest uppercase">
                  TOURNAMENT BRACKET
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded text-xs font-mono font-bold tracking-widest uppercase bg-[var(--color-neon-violet)]/10 border border-[var(--color-neon-violet)]/30 text-[var(--color-neon-violet)]">
                {formatLabel[format] ?? format}
              </span>
              {liveMatches.length > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-bold tracking-widest uppercase text-red-400 border border-red-500/30 bg-red-500/5">
                  <StatusPulse variant="live" />
                  {liveMatches.length} LIVE
                </span>
              )}
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-widest uppercase text-[var(--color-text-secondary)] border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">SHARE</span>
              </button>
              <button
                onClick={handleExportPNG}
                disabled={isExporting}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-widest uppercase text-black border border-[var(--color-neon-cyan)]/60 bg-[var(--color-neon-cyan)] hover:bg-[var(--color-neon-cyan)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isExporting ? 'EXPORTING...' : 'EXPORT PNG'}</span>
              </button>
            </div>
          </div>

          {/* Bracket Tabs */}
          <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
            {bracketTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={[
                  'px-3 py-1.5 rounded text-xs font-mono font-bold whitespace-nowrap tracking-widest uppercase transition-all',
                  activeTab === tab
                    ? 'bg-[var(--color-neon-violet)] text-black'
                    : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 border border-white/10',
                ].join(' ')}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bracket + Sidebar Layout */}
      <div className="flex flex-col lg:flex-row gap-0">
        {/* Main bracket area */}
        <div className="flex-1 max-w-full overflow-x-auto px-4 sm:px-6 py-8">
          <div ref={bracketRef} className="rounded-lg overflow-hidden min-w-max">
            <BracketVisualization
              tournamentId={tournamentId}
              format={format}
              matches={matches}
            />
          </div>
        </div>

        {/* Right side panel */}
        <div className="w-full lg:w-80 flex-shrink-0 px-4 sm:px-6 lg:px-4 py-8 flex flex-col gap-4">
          {/* Stats */}
          <GlassCard hud className="p-4">
            <p className="text-xs font-mono text-[var(--color-text-muted)] tracking-widest uppercase mb-3">MATCH STATS</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="text-2xl font-black font-display text-white">{totalMatches}</div>
                <p className="text-xs font-mono text-[var(--color-text-muted)] tracking-wider">TOTAL</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black font-display neon-text-cyan">{completedMatches.length}</div>
                <p className="text-xs font-mono text-[var(--color-text-muted)] tracking-wider">DONE</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black font-display text-red-400">{liveMatches.length}</div>
                <p className="text-xs font-mono text-[var(--color-text-muted)] tracking-wider">LIVE</p>
              </div>
            </div>
          </GlassCard>

          {/* Live match popup panel */}
          {liveMatches.length > 0 && (
            <GlassCard neonColor="red" className="p-4 border-red-500/40">
              <div className="flex items-center gap-2 mb-3">
                <StatusPulse variant="live" />
                <NeonText as="h3" color="cyan" className="text-xs font-bold tracking-widest uppercase">
                  LIVE MATCHES
                </NeonText>
              </div>
              <div className="space-y-3">
                {liveMatches.map((match) => (
                  <button
                    key={match.id}
                    onClick={() => setSelectedMatch(selectedMatch?.id === match.id ? null : match)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedMatch?.id === match.id
                        ? 'bg-red-500/15 border-red-500/40'
                        : 'bg-white/5 border-white/10 hover:bg-red-500/10 hover:border-red-500/30'
                    }`}
                  >
                    <p className="text-xs font-mono text-[var(--color-text-muted)] tracking-widest mb-1">MATCH #{match.number}</p>
                    <div className="space-y-1">
                      {match.participants.map((p) => (
                        <div key={p.teamId} className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white font-display truncate">{p.teamName}</span>
                          <span className="text-xs font-mono text-[var(--color-neon-cyan)] ml-2">
                            {p.score ?? '--'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Selected match detail */}
          {selectedMatch && (
            <GlassCard neonColor="violet" className="p-4">
              <NeonText as="h3" color="violet" className="text-xs font-bold tracking-widest uppercase mb-3">
                MATCH #{selectedMatch.number} DETAIL
              </NeonText>
              {selectedMatch.scheduledStart && (
                <p className="text-xs font-mono text-[var(--color-text-muted)] mb-3 tracking-wider">
                  {new Date(selectedMatch.scheduledStart).toLocaleString('en-IN')}
                </p>
              )}
              <div className="space-y-2">
                {selectedMatch.participants.map((p, idx) => (
                  <div
                    key={p.teamId}
                    className={`flex items-center justify-between p-2 rounded-lg border ${
                      idx === 0 ? 'border-[var(--color-neon-violet)]/30 bg-[var(--color-neon-violet)]/5' : 'border-white/10 bg-white/3'
                    }`}
                  >
                    <span className="text-sm font-bold text-white font-display">{p.teamName}</span>
                    <span className="text-lg font-black font-display neon-text-cyan">{p.score ?? '--'}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Map veto / credentials placeholder */}
          <GlassCard className="p-4">
            <p className="text-xs font-mono text-[var(--color-text-muted)] tracking-widest uppercase mb-3">MAP VETO TIMELINE</p>
            <p className="text-xs font-mono text-[var(--color-text-muted)]">No map veto data available for this tournament.</p>
          </GlassCard>

          <GlassCard className="p-4">
            <p className="text-xs font-mono text-[var(--color-text-muted)] tracking-widest uppercase mb-2">ROOM CREDENTIALS</p>
            <p className="text-xs font-mono text-[var(--color-text-muted)]">Room ID and password will be broadcast via Discord before each match.</p>
          </GlassCard>

          {/* Back links */}
          <div className="flex flex-col gap-2 pt-2">
            <GlowButton variant="ghost" size="sm" asChild>
              <Link href={`/servers/${guildId}/tournaments/${tournamentId}`}>
                ← BACK TO TOURNAMENT
              </Link>
            </GlowButton>
          </div>
        </div>
      </div>

      <StatusBar shardOnline>
        <span className={liveMatches.length > 0 ? 'text-red-400' : 'text-[var(--color-neon-green)]'}>
          {liveMatches.length > 0 ? `${liveMatches.length} MATCHES LIVE` : 'BRACKET ONLINE'}
        </span>
      </StatusBar>
    </div>
  )
}
