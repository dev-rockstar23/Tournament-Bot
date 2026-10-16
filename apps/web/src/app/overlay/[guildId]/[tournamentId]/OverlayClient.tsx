'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRealtimeTournament } from '@/lib/realtime'

export interface StandingRow {
  teamId: string
  teamName: string
  totalPoints: number
  totalKills: number
  matchesPlayed: number
  rank: number
}

export interface CurrentMatch {
  id: string
  number: number
  status: string
}

interface Props {
  guildId: string
  tournamentId: string
  initialStandings: StandingRow[]
  initialMatch: CurrentMatch | null
}

export default function OverlayClient({
  guildId,
  tournamentId,
  initialStandings,
  initialMatch,
}: Props) {
  const queryClient = useQueryClient()
  const [standings, setStandings] = useState<StandingRow[]>(initialStandings)

  // Subscribe to realtime standings updates — when standings_updated fires,
  // re-fetch standings from the API and update local state.
  useRealtimeTournament(guildId, tournamentId)

  // Listen for query invalidations triggered by the realtime hook
  queryClient.getQueryCache().subscribe((event) => {
    if (
      event.type === 'updated' &&
      Array.isArray(event.query.queryKey) &&
      event.query.queryKey[0] === 'standings' &&
      event.query.queryKey[1] === tournamentId
    ) {
      fetch(`/api/servers/${guildId}/tournaments/${tournamentId}/standings`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.standings) {
            setStandings(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data.standings.map((s: any) => ({
                teamId: s.teamId,
                teamName: s.name ?? s.teamName ?? s.teamId,
                totalPoints: s.totalPoints,
                totalKills: s.totalKills,
                matchesPlayed: s.matchesPlayed,
                rank: s.rank,
              }))
            )
          }
        })
        .catch(() => {/* silently ignore fetch errors on the overlay */})
    }
  })

  const currentMatch = initialMatch

  return (
    <div
      style={{
        background: 'transparent',
        width: '1920px',
        height: '1080px',
        position: 'relative',
      }}
    >
      {/* Top standings panel — bottom right corner */}
      <div style={{ position: 'absolute', bottom: 40, right: 40, width: 380 }}>
        <div className="glass-card p-4">
          <h3 className="font-display text-sm text-cyan uppercase tracking-widest mb-3">
            Live Standings
          </h3>
          {standings.slice(0, 10).map((team, i) => (
            <div key={team.teamId} className="flex justify-between items-center py-1">
              <span className="text-muted text-sm">#{i + 1}</span>
              <span className="text-white text-sm font-medium flex-1 ml-2">{team.teamName}</span>
              <span className="text-electric text-sm font-mono">{team.totalPoints}pts</span>
            </div>
          ))}
        </div>
      </div>

      {/* Current match indicator — top right */}
      {currentMatch && (
        <div style={{ position: 'absolute', top: 40, right: 40 }}>
          <div className="glass-card px-4 py-2 flex items-center gap-2">
            <span className="live-indicator text-white text-sm">
              LIVE — Match {currentMatch.number}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
