'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  ShieldAlert, Trophy, Users, CheckCircle2, XCircle, AlertTriangle,
  FileText, Zap, Clock, Eye,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonText } from '@/components/ui/NeonText'
import { StatusPulse } from '@/components/ui/StatusPulse'
import { GlowButton } from '@/components/ui/GlowButton'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import type { AdminTournament } from './TournamentAdminTable'
import type { AppRole } from '@esports/permissions'

interface AdminDashboardNexusProps {
  guildId: string
  tournaments: AdminTournament[]
  userRole: AppRole
}

const VIOLET = '#7c3aed'
const CYAN = '#06b6d4'
const GRID_COLOR = 'rgba(255,255,255,0.04)'
const TOOLTIP_STYLE = {
  backgroundColor: '#0d0d18',
  border: `1px solid ${VIOLET}`,
  borderRadius: 8,
  color: '#e2e8f0',
  fontSize: 12,
}

type MetricCard = {
  label: string
  value: number
  suffix?: string
  color: string
  icon: React.ElementType
}

function buildRegVelocity(count: number) {
  return Array.from({ length: 14 }, (_, i) => ({
    day: `-${13 - i}d`,
    regs: Math.max(0, Math.round(count / 14 * (0.6 + Math.random() * 0.8))),
  }))
}

export function AdminDashboardNexus({ guildId, tournaments, userRole: _userRole }: AdminDashboardNexusProps) {
  const [_tab, setTab] = useState<'queue' | 'grid'>('queue')
  const tab = _tab

  const live = tournaments.filter(t => t.status === 'LIVE').length
  const upcoming = tournaments.filter(t => t.status === 'PUBLISHED').length
  const totalRegs = tournaments.reduce((s, t) => s + (t.acceptedCount ?? 0), 0)
  const teamCapacityTotal = tournaments.reduce((s, t) => s + (t.teamCapacity ?? 0), 0)
  const fillRate = teamCapacityTotal > 0 ? Math.round((totalRegs / teamCapacityTotal) * 100) : 0

  const regVelocity = buildRegVelocity(totalRegs)

  const metricRow1: MetricCard[] = [
    { label: 'TOTAL TOURNEYS', value: tournaments.length, color: VIOLET, icon: Trophy },
    { label: 'CURRENTLY LIVE', value: live, color: '#ef4444', icon: Zap },
    { label: 'UPCOMING', value: upcoming, color: CYAN, icon: Clock },
    { label: 'REGISTRATIONS', value: totalRegs, color: '#10b981', icon: Users },
    { label: 'UNIQUE PLAYERS', value: totalRegs * 4, color: '#f59e0b', icon: Users },
    { label: 'ACTIVE TEAMS', value: totalRegs, color: '#8b5cf6', icon: CheckCircle2 },
  ]

  const metricRow2: MetricCard[] = [
    { label: 'FILL RATE', value: fillRate, suffix: '%', color: CYAN, icon: Zap },
    { label: 'CHECK-IN RATE', value: 82, suffix: '%', color: '#10b981', icon: CheckCircle2 },
    { label: 'NO-SHOW RATE', value: 18, suffix: '%', color: '#ef4444', icon: XCircle },
    { label: 'PENDING RESULTS', value: 3, color: '#f59e0b', icon: FileText },
    { label: 'OPEN DISPUTES', value: 1, color: '#ef4444', icon: ShieldAlert },
    { label: 'COMPLETION', value: 74, suffix: '%', color: VIOLET, icon: CheckCircle2 },
  ]

  const disputeQueue = [
    { id: 'd1', team: 'Team Alpha', opponent: 'Team Nexus', issue: 'Roster manipulation — screenshot submitted', severity: 'critical', tourneyName: 'BGMI Championship S3' },
    { id: 'd2', team: 'Shadow Squad', opponent: 'Iron Wolves', issue: 'OCR result mismatch on Match #7', severity: 'warning', tourneyName: 'Free Fire Open Cup' },
  ]

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Page Header */}
      <div className="hud-grid-bg border-b border-[var(--color-neon-cyan)] px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <NeonText as="h1" color="cyan" glitch className="text-2xl font-black tracking-widest uppercase">
                TOURNAMENT CONTROL NEXUS
              </NeonText>
              <span className="px-2 py-0.5 rounded border border-[rgba(6,182,212,0.5)] text-[10px] font-mono text-[#06b6d4] tracking-widest">
                v3.42
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/10 border border-green-500/40 text-[10px] font-mono text-green-400">
                <StatusPulse variant="synced" />
                SYNCED
              </span>
            </div>
            <p className="text-[11px] font-mono text-white/40 tracking-widest uppercase">
              ADMIN / TOURNAMENTS — GUILD {guildId.slice(-6).toUpperCase()}
            </p>
          </div>
          <GlowButton variant="cyber" size="sm" onClick={() => {
            window.location.href = `/servers/${guildId}/admin/tournaments/new`
          }}>
            + DEPLOY TOURNAMENT
          </GlowButton>
        </div>

        {/* HUD Status Row */}
        <div className="flex flex-wrap items-center gap-6 mt-3 text-[10px] font-mono tracking-widest uppercase">
          {[
            { label: 'COMMANDS', value: 'ACTIVE', color: '#06b6d4' },
            { label: 'DELAY', value: '12ms', color: '#10b981' },
            { label: 'ROOM', value: live > 0 ? 'OCCUPIED' : 'STANDBY', color: live > 0 ? '#ef4444' : '#94a3b8' },
            { label: 'ROLES', value: 'SYNCED', color: '#10b981' },
            { label: 'BROADCAST HUD', value: 'LIVE', color: '#ef4444' },
          ].map(item => (
            <span key={item.label} className="flex items-center gap-1.5">
              <StatusPulse variant={item.color === '#ef4444' ? 'live' : 'synced'} />
              <span className="text-white/40">{item.label}:</span>
              <span style={{ color: item.color }}>{item.value}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Metrics Row 1 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {metricRow1.map((m) => {
            const Icon = m.icon
            return (
              <GlassCard key={m.label} className="p-4 flex flex-col gap-2" hover={false} neonColor="violet">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-white/40 tracking-widest uppercase">{m.label}</span>
                  <Icon size={12} style={{ color: m.color }} />
                </div>
                <p className="text-2xl font-black" style={{ color: m.color }}>
                  <AnimatedCounter value={m.value} suffix={m.suffix} />
                </p>
              </GlassCard>
            )
          })}
        </div>

        {/* Metrics Row 2 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {metricRow2.map((m) => {
            const Icon = m.icon
            return (
              <GlassCard key={m.label} className="p-4 flex flex-col gap-2" hover={false} neonColor="cyan">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-white/40 tracking-widest uppercase">{m.label}</span>
                  <Icon size={12} style={{ color: m.color }} />
                </div>
                <p className="text-2xl font-black" style={{ color: m.color }}>
                  <AnimatedCounter value={m.value} suffix={m.suffix} />
                </p>
              </GlassCard>
            )
          })}
        </div>

        {/* Main Grid: Disputes + Chart + Staff */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: Dispute Queue + Deploy Grid */}
          <div className="xl:col-span-2 space-y-6">
            {/* Urgent Ops Queue */}
            <GlassCard className="p-5" hover={false} neonColor="red" scanline>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={16} className="text-red-400" />
                  <NeonText as="h2" color="violet" className="text-sm font-black tracking-widest uppercase">
                    URGENT OPS QUEUE
                  </NeonText>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="flex gap-1 rounded border border-white/10 p-0.5"
                  >
                    {(['queue', 'grid'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={[
                          'px-3 py-1 text-[10px] font-mono tracking-widest uppercase rounded transition-colors',
                          tab === t ? 'bg-violet-700 text-white' : 'text-white/40 hover:text-white',
                        ].join(' ')}
                      >
                        {t === 'queue' ? 'DISPUTE QUEUE' : 'DEPLOY GRID'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {tab === 'queue' ? (
                <div className="space-y-3">
                  {disputeQueue.length === 0 ? (
                    <p className="text-center text-white/40 text-sm py-6">No active disputes</p>
                  ) : (
                    disputeQueue.map((dispute) => (
                      <motion.div
                        key={dispute.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={[
                          'rounded-lg border p-4 space-y-2',
                          dispute.severity === 'critical'
                            ? 'border-red-500/40 bg-red-500/5'
                            : 'border-amber-500/40 bg-amber-500/5',
                        ].join(' ')}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={[
                                'text-[10px] font-mono px-1.5 py-0.5 rounded border tracking-widest uppercase',
                                dispute.severity === 'critical'
                                  ? 'text-red-400 border-red-500/40 bg-red-500/10'
                                  : 'text-amber-400 border-amber-500/40 bg-amber-500/10',
                              ].join(' ')}>
                                {dispute.severity.toUpperCase()}
                              </span>
                              <span className="text-[10px] font-mono text-white/40">{dispute.tourneyName}</span>
                            </div>
                            <p className="text-sm font-semibold text-white">
                              {dispute.team} <span className="text-white/40">vs</span> {dispute.opponent}
                            </p>
                            <p className="text-xs text-white/60 mt-0.5">{dispute.issue}</p>
                          </div>
                          <Eye size={14} className="text-white/30 shrink-0 mt-1" />
                        </div>
                        <div className="flex gap-2 mt-2">
                          <GlowButton variant="cyber" size="sm">
                            FILE EVIDENCE
                          </GlowButton>
                          <GlowButton variant="secondary" size="sm">
                            APPROVE
                          </GlowButton>
                          <GlowButton variant="destructive" size="sm">
                            REJECT
                          </GlowButton>
                          <GlowButton variant="ghost" size="sm">
                            OPEN DISPUTE
                          </GlowButton>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              ) : (
                /* Active Deployment Grid */
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10">
                        {['TOURNAMENT', 'GAME', 'STATUS', 'SLOTS', 'STAGE', 'ACTIONS'].map(h => (
                          <th key={h} className="text-left py-2 px-3 font-mono text-[10px] text-white/40 tracking-widest uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tournaments.slice(0, 8).map(t => (
                        <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-2 px-3 text-white font-semibold truncate max-w-[160px]">{t.name}</td>
                          <td className="py-2 px-3 text-white/60 font-mono">{t.game}</td>
                          <td className="py-2 px-3">
                            <span className={[
                              'px-1.5 py-0.5 rounded text-[10px] font-mono tracking-widest uppercase border',
                              t.status === 'LIVE' ? 'text-red-400 border-red-500/40 bg-red-500/10' :
                              t.status === 'PUBLISHED' ? 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10' :
                              t.status === 'COMPLETED' ? 'text-green-400 border-green-500/40 bg-green-500/10' :
                              'text-white/40 border-white/10',
                            ].join(' ')}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-white/60">{t.acceptedCount}/{t.teamCapacity}</td>
                          <td className="py-2 px-3 text-white/40 font-mono text-[10px]">
                            {t.stages?.[0]?.name ?? '—'}
                          </td>
                          <td className="py-2 px-3">
                            <a
                              href={`/servers/${guildId}/admin/tournaments/${t.id}`}
                              className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors tracking-widest uppercase"
                            >
                              MANAGE →
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>

            {/* Registration Velocity Chart */}
            <GlassCard className="p-5" hover={false} neonColor="cyan">
              <div className="flex items-center gap-2 mb-4">
                <NeonText as="h2" color="cyan" className="text-sm font-black tracking-widest uppercase">
                  REGISTRATION VELOCITY
                </NeonText>
                <span className="text-[10px] font-mono text-white/40">— LAST 14 DAYS</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={regVelocity} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CYAN} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CYAN} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                  <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="regs" stroke={CYAN} fill="url(#regGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>

          {/* Right: Staff & Defense Panel */}
          <div className="space-y-4">
            <GlassCard className="p-5" hover={false} hud>
              <NeonText as="h3" color="violet" className="text-sm font-black tracking-widest uppercase mb-4">
                STAFF & DEFENSE PANEL
              </NeonText>
              <div className="space-y-3">
                {[
                  { role: 'SERVER ADMIN', count: 2, color: '#7c3aed', tier: 'S5' },
                  { role: 'TOURNAMENT MGR', count: 4, color: '#06b6d4', tier: 'S4' },
                  { role: 'REFEREE', count: 8, color: '#10b981', tier: 'S3' },
                  { role: 'CONTENT MOD', count: 6, color: '#f59e0b', tier: 'S2' },
                ].map(s => (
                  <div key={s.role} className="flex items-center justify-between py-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <StatusPulse variant="synced" />
                      <span className="text-[11px] font-mono text-white/70 tracking-widest uppercase">{s.role}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 text-white/40">{s.tier}</span>
                      <span className="text-sm font-black" style={{ color: s.color }}>{s.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-5" hover={false} neonColor="red">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-amber-400" />
                <NeonText as="h3" color="violet" className="text-sm font-black tracking-widest uppercase">
                  SENTINEL ALERTS
                </NeonText>
              </div>
              <div className="space-y-2">
                {[
                  { msg: 'Anti-cheat flag: UID 839xx', level: 'critical' },
                  { msg: 'OCR delay spike: +340ms', level: 'warning' },
                  { msg: 'Roster lock: 3 pending', level: 'info' },
                ].map((a, i) => (
                  <div key={i} className={[
                    'flex items-start gap-2 text-xs p-2 rounded border',
                    a.level === 'critical' ? 'border-red-500/30 bg-red-500/5 text-red-400' :
                    a.level === 'warning' ? 'border-amber-500/30 bg-amber-500/5 text-amber-400' :
                    'border-white/10 text-white/40',
                  ].join(' ')}>
                    <StatusPulse variant={a.level === 'critical' ? 'critical' : a.level === 'warning' ? 'warning' : 'synced'} className="mt-0.5 shrink-0" />
                    <span className="font-mono">{a.msg}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-5" hover={false}>
              <NeonText as="h3" color="cyan" className="text-sm font-black tracking-widest uppercase mb-3">
                QUICK ACTIONS
              </NeonText>
              <div className="space-y-2">
                {[
                  { label: 'SYNC BOT ROLES', color: 'primary' as const },
                  { label: 'BROADCAST ANNOUNCEMENT', color: 'cyber' as const },
                  { label: 'FORCE CHECK-IN CLOSE', color: 'secondary' as const },
                  { label: 'EXPORT TOURNAMENT CSV', color: 'ghost' as const },
                ].map(a => (
                  <GlowButton key={a.label} variant={a.color} size="sm" className="w-full justify-center">
                    {a.label}
                  </GlowButton>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  )
}
