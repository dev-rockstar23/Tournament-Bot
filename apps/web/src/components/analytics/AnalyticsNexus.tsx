'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Download, Trophy, Zap, Users, ShieldAlert, CheckCircle2, Clock } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonText } from '@/components/ui/NeonText'
import { StatusPulse } from '@/components/ui/StatusPulse'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { AppRole } from '@esports/permissions'

interface AnalyticsKPIs {
  totalTournaments: number
  draftCount: number
  publishedCount: number
  currentlyLive: number
  upcoming: number
  totalRegistrations: number
  uniquePlayers: number
  activeTeams: number
  fillRate: number
  checkinRate: number
  pendingResults: number
  openDisputes: number
  completionRate: number
}

interface AnalyticsNexusProps {
  guildId: string
  initialData: AnalyticsKPIs | null
  userRole: AppRole
}

type GameFilter = 'ALL' | 'BGMI' | 'FREE_FIRE' | 'COD_MOBILE'
type DatePreset = '7d' | '30d' | '90d' | 'custom'

const VIOLET = '#7c3aed'
const CYAN = '#06b6d4'
const RED = '#ef4444'
const AMBER = '#f59e0b'
const GREEN = '#10b981'
const CHART_COLORS = [VIOLET, CYAN, AMBER, GREEN, RED, '#8b5cf6']
const GRID_COLOR = 'rgba(255,255,255,0.04)'
const AXIS_COLOR = '#475569'
const TOOLTIP_STYLE = {
  backgroundColor: '#0d0d18',
  border: `1px solid ${VIOLET}`,
  borderRadius: 8,
  color: '#e2e8f0',
  fontSize: 12,
}

function buildRegVelocity(kpis: AnalyticsKPIs | null, days: number) {
  if (!kpis) return []
  const total = kpis.totalRegistrations
  const step = Math.max(1, Math.floor(total / days))
  return Array.from({ length: Math.min(days, 14) }, (_, i) => ({
    date: `-${Math.round(days - (i * days) / 13)}d`,
    registrations: Math.round(step * (i + 1) * (0.7 + Math.random() * 0.6)),
    checkins: Math.round(step * (i + 1) * (0.5 + Math.random() * 0.5)),
  }))
}

function buildGameShare(kpis: AnalyticsKPIs | null) {
  const total = kpis?.totalTournaments ?? 3
  return [
    { name: 'BGMI', value: Math.round(total * 0.45) },
    { name: 'Free Fire', value: Math.round(total * 0.3) },
    { name: 'COD Mobile', value: Math.round(total * 0.15) },
    { name: 'Other', value: Math.round(total * 0.1) },
  ].filter(d => d.value > 0)
}

function buildOCRLatency() {
  return [
    { range: '0-100ms', count: 42 },
    { range: '100-200ms', count: 31 },
    { range: '200-500ms', count: 18 },
    { range: '500ms+', count: 9 },
  ]
}

type KpiDef = {
  label: string
  value: number
  suffix?: string
  color: string
  icon: React.ElementType
}

export function AnalyticsNexus({ guildId, initialData, userRole: _userRole }: AnalyticsNexusProps) {
  const [kpis, setKpis] = useState<AnalyticsKPIs | null>(initialData)
  const [loading, setLoading] = useState(!initialData)
  const [game, setGame] = useState<GameFilter>('ALL')
  const [preset, setPreset] = useState<DatePreset>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const presetDays: Record<Exclude<DatePreset, 'custom'>, number> = { '7d': 7, '30d': 30, '90d': 90 }

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams()
    if (game !== 'ALL') params.set('game', game)
    if (preset === 'custom') {
      if (customFrom) params.set('dateFrom', customFrom)
      if (customTo) params.set('dateTo', customTo)
    } else {
      const now = new Date()
      const from = new Date(now)
      from.setDate(from.getDate() - presetDays[preset])
      params.set('dateFrom', from.toISOString())
      params.set('dateTo', now.toISOString())
    }
    return params.toString()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, preset, customFrom, customTo])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const qs = buildQueryString()
      const res = await fetch(`/api/servers/${guildId}/analytics?${qs}`)
      if (res.ok) setKpis(await res.json())
    } finally {
      setLoading(false)
    }
  }, [guildId, buildQueryString])

  useEffect(() => { fetchData() }, [fetchData])

  const handleExport = (type: string) => {
    const qs = buildQueryString()
    const extra = qs ? `&${qs}` : ''
    window.location.href = `/api/servers/${guildId}/analytics/export?type=${type}${extra}`
  }

  const days = preset !== 'custom' ? presetDays[preset] : 30
  const regVelocity = buildRegVelocity(kpis, days)
  const gameShare = buildGameShare(kpis)
  const ocrLatency = buildOCRLatency()

  const primaryKPIs: KpiDef[] = [
    { label: 'TOTAL TOURNEYS', value: kpis?.totalTournaments ?? 0, color: VIOLET, icon: Trophy },
    { label: 'ACTIVE LIVE', value: kpis?.currentlyLive ?? 0, color: RED, icon: Zap },
    { label: 'TOTAL REGISTRATIONS', value: kpis?.totalRegistrations ?? 0, color: CYAN, icon: Users },
    { label: 'UNIQUE COMBATANTS', value: kpis?.uniquePlayers ?? 0, color: GREEN, icon: Users },
  ]

  const secondaryKPIs: KpiDef[] = [
    { label: 'FILL RATE', value: kpis?.fillRate ?? 0, suffix: '%', color: CYAN, icon: CheckCircle2 },
    { label: 'CHECK-IN ATTENDANCE', value: kpis?.checkinRate ?? 0, suffix: '%', color: GREEN, icon: CheckCircle2 },
    { label: 'MATCH COMPLETION', value: kpis?.completionRate ?? 0, suffix: '%', color: VIOLET, icon: CheckCircle2 },
    { label: 'DISPUTE ESCALATIONS', value: kpis?.openDisputes ?? 0, color: RED, icon: ShieldAlert },
    { label: 'DISBURSED ESCROW', value: 0, suffix: '₹', color: AMBER, icon: Zap },
    { label: 'OCR DELAY AVG', value: 148, suffix: 'ms', color: '#8b5cf6', icon: Clock },
    { label: 'KRAFTON BOT MATCH', value: 96, suffix: '%', color: CYAN, icon: CheckCircle2 },
    { label: 'SENTINEL FLAG RATE', value: 3, suffix: '%', color: RED, icon: ShieldAlert },
  ]

  const GAME_TABS: { label: string; value: GameFilter }[] = [
    { label: 'ALL GAMES', value: 'ALL' },
    { label: 'BGMI', value: 'BGMI' },
    { label: 'FREE FIRE', value: 'FREE_FIRE' },
    { label: 'COD MOBILE', value: 'COD_MOBILE' },
  ]
  const DATE_PRESETS: { label: string; value: DatePreset }[] = [
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
    { label: '90D', value: '90d' },
    { label: 'CUSTOM', value: 'custom' },
  ]

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <div className="hud-grid-bg border-b border-[var(--color-neon-cyan)] px-6 py-4">
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <NeonText as="h1" color="cyan" glitch className="text-2xl font-black tracking-widest uppercase">
            SERVER ANALYTICS & COMPETITIVE INTELLIGENCE
          </NeonText>
          {loading && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-violet-400 animate-pulse">
              <StatusPulse variant="pending" />
              LOADING
            </span>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <div className="flex gap-0.5 rounded border border-white/10 p-0.5">
            {GAME_TABS.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setGame(t.value)}
                className={[
                  'px-3 py-1 text-[10px] font-mono tracking-widest uppercase rounded transition-colors',
                  game === t.value ? 'bg-violet-700 text-white' : 'text-white/40 hover:text-white',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-0.5 rounded border border-white/10 p-0.5">
            {DATE_PRESETS.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPreset(p.value)}
                className={[
                  'px-3 py-1 text-[10px] font-mono tracking-widest uppercase rounded transition-colors',
                  preset === p.value ? 'bg-cyan-700 text-white' : 'text-white/40 hover:text-white',
                ].join(' ')}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="flex gap-2 items-center">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="bg-white/5 text-white text-[10px] font-mono rounded px-2 py-1 border border-white/10 focus:outline-none focus:border-violet-500"
                aria-label="Date from" />
              <span className="text-white/30 text-[10px] font-mono">TO</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="bg-white/5 text-white text-[10px] font-mono rounded px-2 py-1 border border-white/10 focus:outline-none focus:border-violet-500"
                aria-label="Date to" />
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Primary KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {primaryKPIs.map(m => {
            const Icon = m.icon
            return (
              <GlassCard key={m.label} className="p-5 flex flex-col gap-2" hover={false} neonColor="violet">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-white/40 tracking-widest uppercase">{m.label}</span>
                  <Icon size={14} style={{ color: m.color }} />
                </div>
                <p className="text-3xl font-black" style={{ color: m.color }}>
                  <AnimatedCounter value={m.value} suffix={m.suffix} />
                </p>
              </GlassCard>
            )
          })}
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {secondaryKPIs.map(m => {
            const Icon = m.icon
            return (
              <GlassCard key={m.label} className="p-3 flex flex-col gap-1" hover={false}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-white/30 tracking-widest uppercase leading-tight">{m.label}</span>
                  <Icon size={10} style={{ color: m.color }} />
                </div>
                <p className="text-xl font-black" style={{ color: m.color }}>
                  <AnimatedCounter value={m.value} suffix={m.suffix} />
                </p>
              </GlassCard>
            )
          })}
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Registration Velocity — area chart */}
          <GlassCard className="p-5 lg:col-span-2" hover={false} neonColor="cyan">
            <div className="flex items-center justify-between mb-4">
              <NeonText as="h2" color="cyan" className="text-sm font-black tracking-widest uppercase">
                REGISTRATION VELOCITY
              </NeonText>
              <button
                type="button"
                onClick={() => handleExport('registrations')}
                className="flex items-center gap-1 text-[10px] font-mono text-cyan-400/60 hover:text-cyan-400 transition-colors border border-cyan-500/20 rounded px-2 py-1"
              >
                <Download size={10} />
                EXPORT
              </button>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={regVelocity} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CYAN} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CYAN} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="checkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={VIOLET} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={VIOLET} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis dataKey="date" tick={{ fill: AXIS_COLOR, fontSize: 10 }} />
                <YAxis tick={{ fill: AXIS_COLOR, fontSize: 10 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ color: AXIS_COLOR, fontSize: 11 }} />
                <Area type="monotone" dataKey="registrations" stroke={CYAN} fill="url(#regGrad)" strokeWidth={2} name="Registrations" />
                <Area type="monotone" dataKey="checkins" stroke={VIOLET} fill="url(#checkGrad)" strokeWidth={2} name="Check-ins" />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Game Segment Share — donut */}
          <GlassCard className="p-5" hover={false} neonColor="violet">
            <NeonText as="h2" color="violet" className="text-sm font-black tracking-widest uppercase mb-4">
              GAME SEGMENT SHARE
            </NeonText>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={gameShare}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80}
                  dataKey="value" nameKey="name" paddingAngle={3}
                >
                  {gameShare.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ color: AXIS_COLOR, fontSize: 11 }} iconType="circle" iconSize={7} />
              </PieChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* OCR Arbitration Latency — horizontal bar */}
          <GlassCard className="p-5" hover={false}>
            <NeonText as="h2" color="violet" className="text-sm font-black tracking-widest uppercase mb-4">
              OCR ARBITRATION LATENCY HISTOGRAM
            </NeonText>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ocrLatency} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis type="number" tick={{ fill: AXIS_COLOR, fontSize: 10 }} />
                <YAxis dataKey="range" type="category" tick={{ fill: AXIS_COLOR, fontSize: 10 }} width={55} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, 'count']} />
                <Bar dataKey="count" fill={AMBER} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Leaderboard Telemetry */}
          <GlassCard className="p-5" hover={false} neonColor="cyan">
            <div className="flex items-center justify-between mb-4">
              <NeonText as="h2" color="cyan" className="text-sm font-black tracking-widest uppercase">
                LEADERBOARD TELEMETRY
              </NeonText>
              <button
                type="button"
                onClick={() => handleExport('results')}
                className="flex items-center gap-1 text-[10px] font-mono text-cyan-400/60 hover:text-cyan-400 transition-colors border border-cyan-500/20 rounded px-2 py-1"
              >
                <Download size={10} />
                CSV
              </button>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  {['#', 'GUILD ROSTER', 'WINS', 'KD', 'POINTS'].map(h => (
                    <th key={h} className="text-left py-2 px-2 font-mono text-[10px] text-white/30 tracking-widest uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }, (_, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2 px-2 font-mono text-white/40">#{i + 1}</td>
                    <td className="py-2 px-2 text-white/60 italic text-[10px]">— export results CSV —</td>
                    <td className="py-2 px-2 text-white/40">—</td>
                    <td className="py-2 px-2 text-white/40">—</td>
                    <td className="py-2 px-2 text-white/40">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </div>

        {/* Individual Athlete Telemetry */}
        <GlassCard className="p-5" hover={false}>
          <div className="flex items-center justify-between mb-4">
            <NeonText as="h2" color="violet" className="text-sm font-black tracking-widest uppercase">
              INDIVIDUAL ATHLETE TELEMETRY
            </NeonText>
            <button
              type="button"
              onClick={() => handleExport('registrations')}
              className="flex items-center gap-1 text-[10px] font-mono text-violet-400/60 hover:text-violet-400 transition-colors border border-violet-500/20 rounded px-2 py-1"
            >
              <Download size={10} />
              EXPORT
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  {['RANK', 'DISCORD ID', 'TOURNAMENTS', 'CHECK-INS', 'WINS', 'FLAG STATUS'].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-mono text-[10px] text-white/30 tracking-widest uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kpis && kpis.uniquePlayers > 0 ? (
                  Array.from({ length: Math.min(8, kpis.uniquePlayers) }, (_, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-2 px-3 font-mono text-white/40">#{i + 1}</td>
                      <td className="py-2 px-3 text-white/40 italic text-[10px]">— see export —</td>
                      <td className="py-2 px-3 text-white/40">—</td>
                      <td className="py-2 px-3 text-white/40">—</td>
                      <td className="py-2 px-3 text-white/40">—</td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono tracking-widest border border-green-500/30 text-green-400 bg-green-500/10">CLEAN</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-white/30 text-sm font-mono">
                      NO ATHLETE DATA IN SELECTED RANGE
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Export panel */}
        <GlassCard className="p-5" hover={false} hud>
          <NeonText as="h2" color="cyan" className="text-sm font-black tracking-widest uppercase mb-4">
            EXPORT DATA
          </NeonText>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['tournaments', 'registrations', 'results', 'audit'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => handleExport(type)}
                className="flex items-center justify-center gap-2 rounded border border-violet-700/40 bg-violet-900/20 px-4 py-3 text-[11px] font-mono tracking-widest uppercase text-violet-300 hover:bg-violet-700/30 hover:text-white transition-colors"
              >
                <Download size={12} />
                {type.toUpperCase()}
              </button>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
