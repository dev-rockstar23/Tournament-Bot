'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'

// ── Types ──────────────────────────────────────────────────────────────────

export interface BracketParticipant {
  teamId: string
  teamName: string
  isWinner?: boolean
}

export interface BracketMatch {
  id: string
  number: number
  participants: BracketParticipant[]
  /** teamId of the winner, or null if not yet determined */
  winnerId?: string | null
}

export interface BracketStage {
  id: string
  name: string
  order: number
  matches: BracketMatch[]
}

interface BracketProps {
  stages: BracketStage[]
}

// ── Layout constants ───────────────────────────────────────────────────────

const MATCH_W = 160
const MATCH_H = 70
const MATCH_GAP_Y = 28
const ROUND_GAP_X = 90
const PADDING = 24

// ── Helpers ────────────────────────────────────────────────────────────────

function matchY(matchIndex: number, totalInRound: number, maxInAnyRound: number): number {
  // Centre-align matches within a round relative to the tallest round
  const totalH = totalInRound * MATCH_H + (totalInRound - 1) * MATCH_GAP_Y
  const maxH = maxInAnyRound * MATCH_H + (maxInAnyRound - 1) * MATCH_GAP_Y
  const offsetY = (maxH - totalH) / 2
  return offsetY + matchIndex * (MATCH_H + MATCH_GAP_Y)
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface MatchCardProps {
  x: number
  y: number
  match: BracketMatch
  /** animation delay so cards appear sequentially */
  delay: number
}

function MatchCard({ x, y, match, delay }: MatchCardProps) {
  const p1 = match.participants[0]
  const p2 = match.participants[1]

  return (
    <motion.g
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
    >
      {/* Card background */}
      <rect
        x={x}
        y={y}
        width={MATCH_W}
        height={MATCH_H}
        rx={8}
        fill="rgba(22,33,62,0.85)"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={1}
      />
      {/* Divider */}
      <line
        x1={x + 8}
        y1={y + MATCH_H / 2}
        x2={x + MATCH_W - 8}
        y2={y + MATCH_H / 2}
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={1}
      />

      {/* Participant 1 */}
      <rect
        x={x}
        y={y}
        width={MATCH_W}
        height={MATCH_H / 2}
        rx={8}
        fill={
          p1 && match.winnerId === p1.teamId
            ? 'rgba(124,58,237,0.25)'
            : 'transparent'
        }
      />
      <text
        x={x + 10}
        y={y + MATCH_H / 4 + 5}
        fontSize={11}
        fill={
          p1 && match.winnerId === p1.teamId
            ? '#c4b5fd'
            : p1
            ? '#e2e8f0'
            : '#475569'
        }
        fontFamily="var(--font-body, Inter, sans-serif)"
        dominantBaseline="middle"
      >
        {p1 ? truncate(p1.teamName, 16) : 'TBD'}
      </text>
      {p1 && match.winnerId === p1.teamId && (
        <text
          x={x + MATCH_W - 8}
          y={y + MATCH_H / 4 + 5}
          fontSize={9}
          fill="#7c3aed"
          textAnchor="end"
          dominantBaseline="middle"
          fontFamily="var(--font-body, Inter, sans-serif)"
        >
          ✓
        </text>
      )}

      {/* Participant 2 */}
      <rect
        x={x}
        y={y + MATCH_H / 2}
        width={MATCH_W}
        height={MATCH_H / 2}
        rx={8}
        fill={
          p2 && match.winnerId === p2.teamId
            ? 'rgba(124,58,237,0.25)'
            : 'transparent'
        }
      />
      <text
        x={x + 10}
        y={y + (MATCH_H * 3) / 4 + 5}
        fontSize={11}
        fill={
          p2 && match.winnerId === p2.teamId
            ? '#c4b5fd'
            : p2
            ? '#e2e8f0'
            : '#475569'
        }
        fontFamily="var(--font-body, Inter, sans-serif)"
        dominantBaseline="middle"
      >
        {p2 ? truncate(p2.teamName, 16) : 'TBD'}
      </text>
      {p2 && match.winnerId === p2.teamId && (
        <text
          x={x + MATCH_W - 8}
          y={y + (MATCH_H * 3) / 4 + 5}
          fontSize={9}
          fill="#7c3aed"
          textAnchor="end"
          dominantBaseline="middle"
          fontFamily="var(--font-body, Inter, sans-serif)"
        >
          ✓
        </text>
      )}
    </motion.g>
  )
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

// ── Connector lines between rounds ─────────────────────────────────────────

interface ConnectorProps {
  fromX: number
  fromY: number
  toX: number
  toY: number
  isWinnerPath: boolean
  delay: number
}

function Connector({ fromX, fromY, toX, toY, isWinnerPath, delay }: ConnectorProps) {
  const midX = fromX + (toX - fromX) / 2
  const d = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`

  return (
    <motion.path
      d={d}
      fill="none"
      stroke={isWinnerPath ? '#7c3aed' : 'rgba(255,255,255,0.12)'}
      strokeWidth={isWinnerPath ? 2 : 1}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.5, delay, ease: 'easeInOut' }}
    />
  )
}

// ── Main bracket component ─────────────────────────────────────────────────

export function Bracket({ stages }: BracketProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Sort stages by order
  const sortedStages = [...stages].sort((a, b) => a.order - b.order)

  if (sortedStages.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 text-white/30 text-sm">
        No bracket data available
      </div>
    )
  }

  const maxMatchesInRound = Math.max(...sortedStages.map((s) => s.matches.length))

  // Total SVG dimensions
  const totalW =
    PADDING * 2 +
    sortedStages.length * MATCH_W +
    (sortedStages.length - 1) * ROUND_GAP_X

  const maxH =
    maxMatchesInRound * MATCH_H + (maxMatchesInRound - 1) * MATCH_GAP_Y

  const totalH = PADDING * 2 + maxH + 40 // extra 40 for round labels

  // Pre-compute match positions keyed by matchId
  const positions = new Map<string, { cx: number; cy: number; x: number; y: number }>()
  sortedStages.forEach((stage, roundIdx) => {
    const x = PADDING + roundIdx * (MATCH_W + ROUND_GAP_X)
    stage.matches.forEach((match, matchIdx) => {
      const y =
        PADDING + 40 + matchY(matchIdx, stage.matches.length, maxMatchesInRound)
      positions.set(match.id, {
        x,
        y,
        cx: x + MATCH_W, // right edge centre
        cy: y + MATCH_H / 2,
      })
    })
  })

  // Build connectors: for now wire each match in round N to the match in round N+1
  // that it feeds into (pair 0+1 → 0, pair 2+3 → 1, etc.)
  const connectors: {
    key: string
    fromX: number
    fromY: number
    toX: number
    toY: number
    isWinnerPath: boolean
    delay: number
  }[] = []

  let connectorDelay = 0.4

  sortedStages.forEach((stage, roundIdx) => {
    const nextStage = sortedStages[roundIdx + 1]
    if (!nextStage) return

    stage.matches.forEach((match, matchIdx) => {
      const targetMatchIdx = Math.floor(matchIdx / 2)
      const targetMatch = nextStage.matches[targetMatchIdx]
      if (!targetMatch) return

      const from = positions.get(match.id)
      const to = positions.get(targetMatch.id)
      if (!from || !to) return

      // Determine if this is the winner's path
      const isWinnerPath = !!(match.winnerId && targetMatch.participants.some(
        (p) => p.teamId === match.winnerId
      ))

      connectors.push({
        key: `${match.id}->${targetMatch.id}`,
        fromX: from.cx,
        fromY: from.cy,
        toX: to.x,
        toY: to.cy,
        isWinnerPath,
        delay: connectorDelay,
      })
      connectorDelay += 0.06
    })
  })

  let cardDelay = 0

  return (
    <div ref={containerRef} className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${totalW} ${totalH}`}
        width="100%"
        style={{ minWidth: Math.min(totalW, 320) }}
        aria-label="Tournament bracket"
        role="img"
      >
        {/* Round labels */}
        {sortedStages.map((stage, roundIdx) => {
          const x = PADDING + roundIdx * (MATCH_W + ROUND_GAP_X) + MATCH_W / 2
          return (
            <text
              key={stage.id}
              x={x}
              y={PADDING + 16}
              textAnchor="middle"
              fontSize={11}
              fill="rgba(255,255,255,0.35)"
              fontFamily="var(--font-display, Orbitron, sans-serif)"
              letterSpacing={1}
            >
              {stage.name.toUpperCase()}
            </text>
          )
        })}

        {/* Connectors (drawn below cards) */}
        {connectors.map((c) => (
          <Connector
            key={c.key}
            fromX={c.fromX}
            fromY={c.fromY}
            toX={c.toX}
            toY={c.toY}
            isWinnerPath={c.isWinnerPath}
            delay={c.delay}
          />
        ))}

        {/* Match cards */}
        {sortedStages.map((stage) =>
          stage.matches.map((match) => {
            const pos = positions.get(match.id)
            if (!pos) return null
            const delay = cardDelay
            cardDelay += 0.08
            return (
              <MatchCard
                key={match.id}
                x={pos.x}
                y={pos.y}
                match={match}
                delay={delay}
              />
            )
          })
        )}
      </svg>
    </div>
  )
}
