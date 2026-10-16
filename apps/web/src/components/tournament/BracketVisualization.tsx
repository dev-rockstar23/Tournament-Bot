'use client'

import { useState, useEffect, useCallback } from 'react'
import { MatchStatus } from '@esports/database'
import { format } from 'date-fns'
import { StatusPulse } from '@/components/ui/StatusPulse'
import { cn } from '@/lib/utils'

interface BracketMatch {
  id: string
  number: number
  round: number
  status: MatchStatus
  scheduledStart: Date | string | null
  participants: Array<{ teamId: string; teamName: string; score?: number | null }>
  nextMatchId?: string | null
}

interface BracketVisualizationProps {
  tournamentId: string
  format: 'SINGLE_ELIM' | 'DOUBLE_ELIM' | 'ROUND_ROBIN'
  matches: BracketMatch[]
  onMatchClick?: (match: BracketMatch) => void
}

const MATCH_WIDTH = 180
const MATCH_HEIGHT = 90
const ROUND_SPACING = 60
const MATCH_SPACING = 30

// Unused for now, but kept for future use
// function getStatusColor(status: MatchStatus): string {
//   switch (status) {
//     case 'LIVE':
//       return 'bg-green-500'
//     case 'COMPLETED':
//       return 'bg-cyan-500'
//     case 'CANCELLED':
//     case 'FORFEIT':
//       return 'bg-red-500'
//     case 'SCHEDULED':
//     case 'CHECK_IN':
//     case 'READY':
//       return 'bg-gray-500'
//     case 'AWAITING_RESULT':
//     case 'UNDER_REVIEW':
//       return 'bg-amber-500'
//     default:
//       return 'bg-gray-500'
//   }
// }

function getStatusPulseVariant(status: MatchStatus): 'live' | 'synced' | 'pending' | 'offline' {
  switch (status) {
    case 'LIVE':
      return 'live'
    case 'COMPLETED':
      return 'synced'
    case 'AWAITING_RESULT':
    case 'UNDER_REVIEW':
    case 'DISPUTED':
      return 'pending'
    default:
      return 'offline'
  }
}

interface MatchCardProps {
  match: BracketMatch
  x: number
  y: number
  onClick?: () => void
}

function MatchCard({ match, x, y, onClick }: MatchCardProps) {
  const [team1, team2] = match.participants
  const team1Score = team1?.score ?? null
  const team2Score = team2?.score ?? null
  const team1Winning = team1Score !== null && team2Score !== null && team1Score > team2Score
  const team2Winning = team1Score !== null && team2Score !== null && team2Score > team1Score

  return (
    <foreignObject x={x} y={y} width={MATCH_WIDTH} height={MATCH_HEIGHT}>
      <div
        className="w-full h-full bg-slate-900/90 border border-slate-700 rounded-lg overflow-hidden cursor-pointer hover:border-violet-500 transition-colors"
        onClick={onClick}
      >
        {/* Status Badge */}
        <div className="absolute top-1 right-1 flex items-center gap-1 px-2 py-0.5 rounded text-xs">
          <StatusPulse variant={getStatusPulseVariant(match.status)} />
          <span className="text-gray-300 text-[10px]">{match.status}</span>
        </div>

        {/* Match Number */}
        <div className="px-2 py-1 text-[10px] text-gray-400">Match #{match.number}</div>

        {/* Team Slots */}
        <div className="flex flex-col">
          {/* Team 1 */}
          <div
            className={cn(
              'px-2 py-1.5 flex items-center justify-between border-b border-slate-700',
              team1Winning && 'bg-violet-900/30'
            )}
          >
            <span className={cn('text-xs truncate', team1Winning ? 'text-violet-300 font-semibold' : 'text-gray-300')}>
              {team1?.teamName ?? 'TBD'}
            </span>
            {team1Score !== null && (
              <span className={cn('text-sm font-bold ml-2', team1Winning ? 'text-violet-300' : 'text-gray-300')}>
                {team1Score}
              </span>
            )}
          </div>

          {/* Team 2 */}
          <div
            className={cn(
              'px-2 py-1.5 flex items-center justify-between',
              team2Winning && 'bg-violet-900/30'
            )}
          >
            <span className={cn('text-xs truncate', team2Winning ? 'text-violet-300 font-semibold' : 'text-gray-300')}>
              {team2?.teamName ?? 'TBD'}
            </span>
            {team2Score !== null && (
              <span className={cn('text-sm font-bold ml-2', team2Winning ? 'text-violet-300' : 'text-gray-300')}>
                {team2Score}
              </span>
            )}
          </div>
        </div>

        {/* Scheduled Time */}
        {match.scheduledStart && (
          <div className="px-2 py-0.5 text-[9px] text-gray-500 border-t border-slate-800">
            {format(new Date(match.scheduledStart), 'MMM d, h:mm a')}
          </div>
        )}
      </div>
    </foreignObject>
  )
}

interface MatchDetailModalProps {
  match: BracketMatch
  onClose: () => void
}

function MatchDetailModal({ match, onClose }: MatchDetailModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Match #{match.number}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <StatusPulse variant={getStatusPulseVariant(match.status)} />
            <span className="text-sm text-gray-300">Status: {match.status}</span>
          </div>

          {/* Scheduled Time */}
          {match.scheduledStart && (
            <div className="text-sm text-gray-300">
              Scheduled: {format(new Date(match.scheduledStart), 'MMMM d, yyyy h:mm a')}
            </div>
          )}

          {/* Participants */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-400">Participants</h3>
            {match.participants.map((participant) => (
              <div
                key={participant.teamId}
                className="flex items-center justify-between bg-slate-800 rounded p-3"
              >
                <span className="text-white font-medium">{participant.teamName}</span>
                {participant.score !== null && participant.score !== undefined && (
                  <span className="text-xl font-bold text-violet-400">{participant.score}</span>
                )}
              </div>
            ))}
          </div>

          {/* Round Info */}
          <div className="text-sm text-gray-400">
            Round: {match.round}
          </div>
        </div>
      </div>
    </div>
  )
}

function SingleElimBracket({
  matches,
  onMatchClick,
}: {
  matches: BracketMatch[]
  onMatchClick?: (match: BracketMatch) => void
}) {
  // Group matches by round
  const roundMap = new Map<number, BracketMatch[]>()
  let maxRound = 0

  matches.forEach((match) => {
    if (!roundMap.has(match.round)) {
      roundMap.set(match.round, [])
    }
    roundMap.get(match.round)!.push(match)
    maxRound = Math.max(maxRound, match.round)
  })

  const rounds = Array.from({ length: maxRound }, (_, i) => i + 1)
  const firstRoundMatches = roundMap.get(1)?.length ?? 0

  const svgWidth = maxRound * (MATCH_WIDTH + ROUND_SPACING) + 80
  const svgHeight = firstRoundMatches * (MATCH_HEIGHT + MATCH_SPACING) + 80

  // Calculate positions for each match
  const positions = new Map<string, { x: number; y: number }>()

  rounds.forEach((round) => {
    const roundMatches = roundMap.get(round) ?? []
    const x = (round - 1) * (MATCH_WIDTH + ROUND_SPACING) + 40

    // Vertical spacing increases with each round
    const verticalGap = Math.pow(2, round - 1) * (MATCH_HEIGHT + MATCH_SPACING)
    const totalHeight = roundMatches.length * verticalGap
    const startY = (svgHeight - totalHeight) / 2

    roundMatches.forEach((match, idx) => {
      positions.set(match.id, {
        x,
        y: startY + idx * verticalGap,
      })
    })
  })

  return (
    <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="overflow-visible">
      {/* Draw connection lines */}
      {matches.map((match) => {
        if (!match.nextMatchId) return null
        const startPos = positions.get(match.id)
        const endPos = positions.get(match.nextMatchId)
        if (!startPos || !endPos) return null

        const startX = startPos.x + MATCH_WIDTH
        const startY = startPos.y + MATCH_HEIGHT / 2
        const endX = endPos.x
        const endY = endPos.y + MATCH_HEIGHT / 2
        const midX = (startX + endX) / 2

        return (
          <path
            key={`line-${match.id}`}
            d={`M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`}
            stroke="#4b5563"
            strokeWidth={2}
            fill="none"
          />
        )
      })}

      {/* Draw match cards */}
      {matches.map((match) => {
        const pos = positions.get(match.id)
        if (!pos) return null
        return (
          <MatchCard
            key={match.id}
            match={match}
            x={pos.x}
            y={pos.y}
            onClick={() => onMatchClick?.(match)}
          />
        )
      })}
    </svg>
  )
}

function DoubleElimBracket({
  matches,
  onMatchClick,
}: {
  matches: BracketMatch[]
  onMatchClick?: (match: BracketMatch) => void
}) {
  // Split into winner and loser brackets
  // Assuming positive rounds are winners bracket, and loser bracket follows
  const allRounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b)
  const maxRound = Math.max(...allRounds)
  const midRound = Math.ceil(maxRound / 2)

  // Keeping these for potential future use
  // const winnerMatches = matches.filter((m) => m.round <= midRound)
  // const loserMatches = matches.filter((m) => m.round > midRound)

  const firstRoundCount = matches.filter((m) => m.round === 1).length
  const svgWidth = maxRound * (MATCH_WIDTH + ROUND_SPACING) + 80
  const svgHeight = Math.max(firstRoundCount * (MATCH_HEIGHT + MATCH_SPACING), 400) * 2 + 100

  return (
    <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="overflow-visible">
      {/* Winner Bracket Label */}
      <text x={20} y={30} className="fill-violet-400 text-sm font-semibold">
        Winner Bracket
      </text>

      {/* Loser Bracket Label */}
      <text x={20} y={svgHeight / 2 + 30} className="fill-amber-400 text-sm font-semibold">
        Loser Bracket
      </text>

      {/* Draw matches - simplified layout */}
      {matches.map((match, idx) => {
        const isLoser = match.round > midRound
        const x = ((match.round - 1) % midRound) * (MATCH_WIDTH + ROUND_SPACING) + 40
        const baseY = isLoser ? svgHeight / 2 + 60 : 60
        const y = baseY + (idx % 4) * (MATCH_HEIGHT + MATCH_SPACING)

        return (
          <MatchCard
            key={match.id}
            match={match}
            x={x}
            y={y}
            onClick={() => onMatchClick?.(match)}
          />
        )
      })}
    </svg>
  )
}

function RoundRobinBracket({
  matches,
  onMatchClick,
}: {
  matches: BracketMatch[]
  onMatchClick?: (match: BracketMatch) => void
}) {
  const roundMap = new Map<number, BracketMatch[]>()
  matches.forEach((match) => {
    if (!roundMap.has(match.round)) {
      roundMap.set(match.round, [])
    }
    roundMap.get(match.round)!.push(match)
  })

  const rounds = Array.from(roundMap.keys()).sort((a, b) => a - b)
  const maxMatchesPerRound = Math.max(...rounds.map((r) => roundMap.get(r)?.length ?? 0))

  const nodeWidth = 160
  const nodeHeight = 80
  const spacing = 20

  const svgWidth = maxMatchesPerRound * (nodeWidth + spacing) + 40
  const svgHeight = rounds.length * (nodeHeight + spacing) + 40

  return (
    <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="overflow-visible">
      {rounds.map((round, roundIdx) => {
        const roundMatches = roundMap.get(round) ?? []
        return roundMatches.map((match, matchIdx) => (
          <MatchCard
            key={match.id}
            match={match}
            x={matchIdx * (nodeWidth + spacing) + 20}
            y={roundIdx * (nodeHeight + spacing) + 20}
            onClick={() => onMatchClick?.(match)}
          />
        ))
      })}
    </svg>
  )
}

export function BracketVisualization({
  tournamentId,
  format,
  matches,
  onMatchClick,
}: BracketVisualizationProps) {
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null)

  const handleMatchClick = useCallback(
    (match: BracketMatch) => {
      setSelectedMatch(match)
      onMatchClick?.(match)
    },
    [onMatchClick]
  )

  // Realtime subscription (optional, graceful degradation)
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      // Attempt to subscribe to match updates
      // This is optional and will fail silently if Supabase is not configured
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createClient } = require('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const channel = supabase
          .channel(`tournament-${tournamentId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'matches',
              filter: `stage_id=in.(${matches.map((m) => m.id).join(',')})`,
            },
            () => {
              // Trigger re-fetch in parent component
              window.dispatchEvent(new CustomEvent('bracket-update'))
            }
          )
          .subscribe()

        return () => {
          supabase.removeChannel(channel)
        }
      }
    } catch (error) {
      // Silently ignore if Supabase is not available
      console.debug('Supabase realtime not configured')
    }
  }, [tournamentId, matches])

  if (matches.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No matches have been created yet
      </div>
    )
  }

  return (
    <>
      <div className="w-full overflow-x-auto overflow-y-hidden bg-slate-950 rounded-lg p-4">
        {format === 'SINGLE_ELIM' && <SingleElimBracket matches={matches} onMatchClick={handleMatchClick} />}
        {format === 'DOUBLE_ELIM' && <DoubleElimBracket matches={matches} onMatchClick={handleMatchClick} />}
        {format === 'ROUND_ROBIN' && <RoundRobinBracket matches={matches} onMatchClick={handleMatchClick} />}
      </div>

      {selectedMatch && <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />}
    </>
  )
}
