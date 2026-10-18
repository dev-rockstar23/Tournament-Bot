'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
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
  serverName?: string
}

export default function OverlayClient({
  guildId,
  tournamentId,
  initialStandings,
  initialMatch,
  serverName = 'SHADØW TOURNAMENTS',
}: Props) {
  const queryClient = useQueryClient()
  const [standings, setStandings] = useState<StandingRow[]>(initialStandings)

  // Subscribe to realtime standings updates — when standings_updated fires,
  // re-fetch standings from the API and update local state.
  useRealtimeTournament(guildId, tournamentId)

  // Listen for query invalidations triggered by the realtime hook
  useEffect(() => {
    const unsub = queryClient.getQueryCache().subscribe((event) => {
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
                data.standings.map((s: Record<string, unknown>) => ({
                  teamId: s.teamId as string,
                  teamName: (s.name ?? s.teamName ?? s.teamId) as string,
                  totalPoints: s.totalPoints as number,
                  totalKills: s.totalKills as number,
                  matchesPlayed: s.matchesPlayed as number,
                  rank: s.rank as number,
                }))
              )
            }
          })
          .catch(() => {/* silently ignore fetch errors on the overlay */})
      }
    })
    return () => unsub()
  }, [queryClient, guildId, tournamentId])

  const currentMatch = initialMatch

  // Frag king = team with most total kills
  const fragKing = standings.length > 0
    ? standings.reduce((best, t) => (t.totalKills > best.totalKills ? t : best), standings[0])
    : null

  // Ticker messages
  const tickerRules = [
    '⚡ All kills must be submitted within 5 minutes of match end',
    '🎯 Disputed results must include screenshot evidence',
    '🔒 Room codes are shared 10 minutes before match start',
    '🏆 Final standings determined by Points → Kills → Match wins',
    '⚠️ Teaming or cheating results in immediate disqualification',
    '📡 Stay in your assigned custom room until the match begins',
  ]

  return (
    <div
      style={{
        background: 'transparent',
        width: '1920px',
        height: '1080px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Orbitron', 'JetBrains Mono', monospace",
      }}
    >
      {/* ═══════════════════════════════════════════════
          TOP BAR — server name / LIVE / tournament info
      ═══════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          background: 'linear-gradient(90deg, rgba(10,10,20,0.90) 0%, rgba(5,5,12,0.75) 50%, rgba(10,10,20,0.90) 100%)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(6,182,212,0.40)',
          boxShadow: '0 0 20px rgba(6,182,212,0.15)',
          zIndex: 20,
        }}
      >
        {/* Left: server name + shard */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 900,
              letterSpacing: '0.15em',
              color: '#f8fafc',
              textTransform: 'uppercase',
            }}
          >
            {serverName}
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.2em',
              color: '#22c55e',
              padding: '2px 8px',
              border: '1px solid rgba(34,197,94,0.40)',
              borderRadius: '4px',
              background: 'rgba(34,197,94,0.08)',
              textShadow: '0 0 8px rgba(34,197,94,0.8)',
            }}
          >
            SHARD ONLINE
          </span>
        </div>

        {/* Center: LIVE FEED */}
        {currentMatch && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 10px rgba(239,68,68,0.8)',
                animation: 'pulse 1.5s ease-in-out infinite',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.3em',
                color: '#ef4444',
                textTransform: 'uppercase',
                textShadow: '0 0 12px rgba(239,68,68,0.9)',
              }}
            >
              LIVE FEED
            </span>
          </div>
        )}

        {/* Right: match / map / zone info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '11px', letterSpacing: '0.15em', color: '#94a3b8' }}>
          {currentMatch && (
            <>
              <span>
                MATCH{' '}
                <span style={{ color: '#06b6d4', fontWeight: 700, textShadow: '0 0 8px rgba(6,182,212,0.8)' }}>
                  #{currentMatch.number}
                </span>
              </span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
            </>
          )}
          <span>
            STATUS{' '}
            <span
              style={{
                color: currentMatch?.status === 'LIVE' ? '#22c55e' : '#f59e0b',
                fontWeight: 700,
              }}
            >
              {currentMatch?.status ?? 'STANDBY'}
            </span>
          </span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span>
            ZONE{' '}
            <span style={{ color: '#7c3aed', fontWeight: 700, textShadow: '0 0 8px rgba(124,58,237,0.8)' }}>
              ACTIVE
            </span>
          </span>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════
          LEFT PANEL — LIVE STANDINGS WIDGET
      ═══════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, x: -60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
        style={{
          position: 'absolute',
          top: '80px',
          left: '32px',
          width: '340px',
          zIndex: 10,
        }}
      >
        {/* Panel header */}
        <div
          style={{
            background: 'rgba(10,10,20,0.90)',
            backdropFilter: 'blur(16px)',
            borderRadius: '12px 12px 0 0',
            padding: '10px 16px',
            borderBottom: '1px solid rgba(6,182,212,0.35)',
            border: '1px solid rgba(6,182,212,0.25)',
            borderBottomWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#06b6d4',
              boxShadow: '0 0 8px rgba(6,182,212,0.9)',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.25em',
              color: '#06b6d4',
              textTransform: 'uppercase',
              textShadow: '0 0 10px rgba(6,182,212,0.8)',
            }}
          >
            LIVE STANDINGS
          </span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '10px',
              color: '#64748b',
              letterSpacing: '0.1em',
            }}
          >
            TOP {Math.min(standings.length, 10)}
          </span>
        </div>

        {/* Table header */}
        <div
          style={{
            background: 'rgba(6,182,212,0.06)',
            border: '1px solid rgba(6,182,212,0.25)',
            borderTop: 'none',
            borderBottom: 'none',
            padding: '6px 16px',
            display: 'grid',
            gridTemplateColumns: '28px 1fr 56px 48px',
            gap: '8px',
            fontSize: '9px',
            fontWeight: 600,
            letterSpacing: '0.2em',
            color: '#64748b',
            textTransform: 'uppercase',
          }}
        >
          <span>#</span>
          <span>TEAM</span>
          <span style={{ textAlign: 'right' }}>PTS</span>
          <span style={{ textAlign: 'right' }}>KILLS</span>
        </div>

        {/* Rows */}
        <div
          style={{
            background: 'rgba(10,10,20,0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(6,182,212,0.25)',
            borderTop: 'none',
            borderRadius: '0 0 12px 12px',
            overflow: 'hidden',
          }}
        >
          <AnimatePresence>
            {standings.slice(0, 10).map((team, i) => (
              <motion.div
                key={team.teamId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr 56px 48px',
                  gap: '8px',
                  padding: '8px 16px',
                  borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  background: i === 0
                    ? 'linear-gradient(90deg, rgba(124,58,237,0.12) 0%, transparent 100%)'
                    : i === 1
                      ? 'linear-gradient(90deg, rgba(6,182,212,0.07) 0%, transparent 100%)'
                      : 'transparent',
                  alignItems: 'center',
                }}
              >
                {/* Rank */}
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#64748b',
                    textShadow: i === 0 ? '0 0 8px rgba(245,158,11,0.8)' : 'none',
                  }}
                >
                  {i + 1}
                </span>
                {/* Team name */}
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: i === 0 ? '#f8fafc' : '#cbd5e1',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.05em',
                  }}
                >
                  {team.teamName}
                </span>
                {/* Points */}
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#7c3aed',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    textShadow: '0 0 6px rgba(124,58,237,0.7)',
                  }}
                >
                  {team.totalPoints}
                </span>
                {/* Kills */}
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#ef4444',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {team.totalKills}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          {standings.length === 0 && (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                fontSize: '11px',
                color: '#64748b',
                letterSpacing: '0.15em',
              }}
            >
              AWAITING DATA...
            </div>
          )}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════
          FRAG KING WIDGET
      ═══════════════════════════════════════════════ */}
      {fragKing && fragKing.totalKills > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
          style={{
            position: 'absolute',
            bottom: '80px',
            left: '32px',
            width: '280px',
            zIndex: 10,
          }}
        >
          <div
            style={{
              background: 'rgba(10,10,20,0.90)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: '0 0 20px rgba(239,68,68,0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '16px' }}>💀</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.25em',
                  color: '#ef4444',
                  textTransform: 'uppercase',
                  textShadow: '0 0 8px rgba(239,68,68,0.9)',
                }}
              >
                FRAG KING
              </span>
            </div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 900,
                color: '#f8fafc',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {fragKing.teamName}
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <span style={{ fontSize: '10px', color: '#64748b', letterSpacing: '0.15em' }}>
                KILLS{' '}
                <span style={{ color: '#ef4444', fontWeight: 700, textShadow: '0 0 6px rgba(239,68,68,0.8)' }}>
                  {fragKing.totalKills}
                </span>
              </span>
              <span style={{ fontSize: '10px', color: '#64748b', letterSpacing: '0.15em' }}>
                PTS{' '}
                <span style={{ color: '#7c3aed', fontWeight: 700 }}>
                  {fragKing.totalPoints}
                </span>
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════
          BOTTOM TICKER — rule announcements scrolling
      ═══════════════════════════════════════════════ */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          background: 'linear-gradient(90deg, rgba(10,10,20,0.92) 0%, rgba(5,5,12,0.82) 100%)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(6,182,212,0.30)',
          zIndex: 20,
        }}
      >
        {/* Label */}
        <div
          style={{
            flexShrink: 0,
            padding: '0 14px',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.3em',
            color: '#050508',
            background: 'linear-gradient(90deg, #06b6d4, #22d3ee)',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          RULES
        </div>

        {/* Scrolling ticker */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '0',
              animation: 'ticker-scroll 40s linear infinite',
              whiteSpace: 'nowrap',
              willChange: 'transform',
            }}
          >
            {/* Double the rules for seamless loop */}
            {[...tickerRules, ...tickerRules].map((rule, i) => (
              <span
                key={i}
                style={{
                  fontSize: '12px',
                  color: '#94a3b8',
                  letterSpacing: '0.05em',
                  padding: '0 48px',
                  display: 'inline-block',
                }}
              >
                {rule}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Inline styles for ticker animation (not in globals.css to keep overlay self-contained) */}
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
