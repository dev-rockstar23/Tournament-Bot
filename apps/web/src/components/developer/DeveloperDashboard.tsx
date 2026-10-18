'use client'

import { useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Activity, AlertTriangle, Cpu, Globe, Wifi, Database, Server, Zap,
  CheckCircle2, XCircle, Clock, Terminal,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonText } from '@/components/ui/NeonText'
import { StatusPulse } from '@/components/ui/StatusPulse'
import { GlowButton } from '@/components/ui/GlowButton'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { formatDistanceToNow } from 'date-fns'

// ─── Types ─────────────────────────────────────────────────────────────────

type BridgeHealthCheck = {
  id: string
  guildId: string
  component: string
  status: string
  latencyMs: number | null
  metadata: unknown
  checkedAt: Date
  createdAt: Date
}

type ErrorLog = {
  id: string
  guildId: string
  source: string
  errorType: string
  message: string
  stack: string | null
  metadata: unknown
  timestamp: Date
  createdAt: Date
}

type BotAnalytics = {
  totalCommands: number
  uniqueCommands?: number
  topCommands: Array<{ name: string; count: number }>
  avgResponseTimeMs?: number | null
}

type SystemMetric = {
  id: string
  guildId: string
  metricType: string
  metricName: string
  value: number
  metadata: unknown
  timestamp: Date
  createdAt: Date
}

interface DeveloperDashboardProps {
  guildId: string
  initialMetrics: SystemMetric[]
  initialErrors: ErrorLog[]
  initialBridgeHealth: BridgeHealthCheck[]
  initialBotAnalytics: BotAnalytics
  initialWebsiteErrors: ErrorLog[]
}

// ─── Constants ─────────────────────────────────────────────────────────────

const VIOLET = '#7c3aed'
const CYAN = '#06b6d4'
const RED = '#ef4444'
const AMBER = '#f59e0b'
const GREEN = '#10b981'

const TOOLTIP_STYLE = {
  backgroundColor: '#0d0d18',
  border: `1px solid ${VIOLET}`,
  borderRadius: 8,
  color: '#e2e8f0',
  fontSize: 12,
}
const GRID_COLOR = 'rgba(255,255,255,0.04)'
const AXIS_COLOR = '#475569'

// ─── Bridge node config ────────────────────────────────────────────────────

const BRIDGE_NODES = [
  { key: 'neon_db', label: 'NEON DB', icon: Database, color: CYAN },
  { key: 'railway_bot', label: 'RAILWAY BOT', icon: Server, color: VIOLET },
  { key: 'vercel_web', label: 'VERCEL WEB', icon: Globe, color: GREEN },
  { key: 'upstash_redis', label: 'UPSTASH REDIS', icon: Wifi, color: AMBER },
]

function getBridgeNode(component: string) {
  return BRIDGE_NODES.find(n => n.key === component) ?? {
    key: component,
    label: component.replace(/_/g, ' ').toUpperCase(),
    icon: Cpu,
    color: '#94a3b8',
  }
}

function getStatusVariant(status: string): 'synced' | 'pending' | 'offline' | 'critical' {
  if (status === 'healthy') return 'synced'
  if (status === 'degraded') return 'warning' as 'pending'
  return 'offline'
}

function extractCommand(metadata: unknown): string | null {
  if (metadata && typeof metadata === 'object') {
    const m = metadata as Record<string, unknown>
    if (typeof m.command === 'string') return m.command
    if (m.context && typeof m.context === 'object') {
      const ctx = m.context as Record<string, unknown>
      if (typeof ctx.command === 'string') return ctx.command
    }
  }
  return null
}

function extractPath(metadata: unknown): string | null {
  if (metadata && typeof metadata === 'object') {
    const m = metadata as Record<string, unknown>
    if (typeof m.path === 'string') return m.path
    if (m.context && typeof m.context === 'object') {
      const ctx = m.context as Record<string, unknown>
      if (typeof ctx.path === 'string') return ctx.path
    }
  }
  return null
}

// ─── Tab Components ────────────────────────────────────────────────────────

function BotAnalyticsContent({ data }: { data: BotAnalytics }) {
  const chartData = data.topCommands.slice(0, 10)
  const total = data.totalCommands
  const unique = data.uniqueCommands ?? data.topCommands.length
  const execRatio = total > 0 ? Math.round((unique / Math.max(total, 1)) * 100) : 0
  const donutData = [
    { name: 'Executed', value: execRatio },
    { name: 'Overhead', value: 100 - execRatio },
  ]

  const liveTraces = [
    { cmd: '/tournament register', user: 'user#1234', latency: '120ms', status: 'OK' },
    { cmd: '/team create', user: 'user#5678', latency: '340ms', status: 'OK' },
    { cmd: '/match submit', user: 'user#9012', latency: '2100ms', status: 'SLOW' },
    { cmd: '/admin sync', user: 'user#3456', latency: '890ms', status: 'OK' },
  ]

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'TOTAL COMMANDS', value: total, color: VIOLET, icon: Terminal },
          { label: 'UNIQUE COMMANDS', value: unique, color: CYAN, icon: Zap },
          { label: 'AVG RESPONSE TIME', value: Math.round(data.avgResponseTimeMs ?? 0), suffix: 'ms', color: GREEN, icon: Clock },
        ].map(kpi => {
          const Icon = kpi.icon
          return (
            <GlassCard key={kpi.label} className="p-5 flex flex-col gap-2" hover={false} neonColor="violet">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-white/40 tracking-widest uppercase">{kpi.label}</span>
                <Icon size={13} style={{ color: kpi.color }} />
              </div>
              <p className="text-2xl font-black" style={{ color: kpi.color }}>
                <AnimatedCounter value={kpi.value} suffix={kpi.suffix} />
              </p>
            </GlassCard>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Execution ratio donut */}
        <GlassCard className="p-5" hover={false}>
          <NeonText as="h3" color="violet" className="text-xs font-black tracking-widest uppercase mb-3">EXECUTION RATIO</NeonText>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" paddingAngle={3}>
                <Cell fill={VIOLET} />
                <Cell fill="rgba(255,255,255,0.08)" />
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`]} />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-center text-2xl font-black text-violet-400 -mt-2">
            <AnimatedCounter value={execRatio} suffix="%" />
          </p>
        </GlassCard>

        {/* Top commands horizontal bar */}
        <GlassCard className="p-5 lg:col-span-2" hover={false} neonColor="cyan">
          <NeonText as="h3" color="cyan" className="text-xs font-black tracking-widest uppercase mb-3">MOST USED COMMANDS</NeonText>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis type="number" tick={{ fill: AXIS_COLOR, fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: AXIS_COLOR, fontSize: 10 }} width={95} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(124,58,237,0.1)' }} />
                <Bar dataKey="count" fill={VIOLET} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-white/30 text-sm font-mono">NO COMMAND DATA</div>
          )}
        </GlassCard>
      </div>

      {/* Live trace table */}
      <GlassCard className="p-5" hover={false} hud>
        <div className="flex items-center gap-2 mb-3">
          <StatusPulse variant="live" />
          <NeonText as="h3" color="violet" className="text-xs font-black tracking-widest uppercase">LIVE COMMAND TRACE</NeonText>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10">
              {['COMMAND', 'USER', 'LATENCY', 'STATUS'].map(h => (
                <th key={h} className="text-left py-2 px-3 font-mono text-[10px] text-white/30 tracking-widest uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {liveTraces.map((trace, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="py-2 px-3 font-mono text-cyan-400/80">{trace.cmd}</td>
                <td className="py-2 px-3 text-white/50">{trace.user}</td>
                <td className="py-2 px-3 font-mono" style={{ color: trace.status === 'SLOW' ? AMBER : GREEN }}>{trace.latency}</td>
                <td className="py-2 px-3">
                  <span className={[
                    'px-1.5 py-0.5 rounded border text-[10px] font-mono tracking-widest uppercase',
                    trace.status === 'SLOW' ? 'border-amber-500/40 text-amber-400 bg-amber-500/10' : 'border-green-500/40 text-green-400 bg-green-500/10',
                  ].join(' ')}>
                    {trace.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  )
}

function BotErrorsContent({ data }: { data: ErrorLog[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (data.length === 0) {
    return (
      <GlassCard className="p-12 text-center" hover={false}>
        <CheckCircle2 size={40} className="text-green-400 mx-auto mb-3" />
        <p className="text-green-400 font-mono text-sm tracking-widest uppercase">ALL SYSTEMS NOMINAL — NO BOT ERRORS</p>
      </GlassCard>
    )
  }

  const critical = data.filter(e => e.errorType?.toLowerCase().includes('critical') || e.errorType?.toLowerCase().includes('fatal'))
  const rest = data.filter(e => !critical.includes(e))

  return (
    <div className="space-y-4">
      {/* Critical errors */}
      {critical.map(err => (
        <GlassCard key={err.id} className="p-5" hover={false} neonColor="red" scanline>
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-1.5 py-0.5 rounded border border-red-500/40 bg-red-500/10 text-[10px] font-mono text-red-400 tracking-widest uppercase">CRITICAL</span>
                <span className="text-[10px] font-mono text-white/30">{formatDistanceToNow(new Date(err.timestamp), { addSuffix: true })}</span>
              </div>
              <p className="text-sm font-semibold text-white mb-1">{err.message}</p>
              <p className="text-[10px] font-mono text-white/40">{err.errorType} · {err.source}</p>
              {expanded === err.id && err.stack && (
                <pre className="mt-3 text-[10px] p-3 bg-black/40 rounded text-red-400 overflow-x-auto max-h-48 overflow-y-auto font-mono">
                  {err.stack}
                </pre>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <GlowButton variant="ghost" size="sm" onClick={() => setExpanded(expanded === err.id ? null : err.id)}>
              {expanded === err.id ? 'HIDE TRACE' : 'STACK TRACE'}
            </GlowButton>
            <GlowButton variant="secondary" size="sm">SNOOZE</GlowButton>
            <GlowButton variant="cyber" size="sm">MARK RESOLVED</GlowButton>
          </div>
        </GlassCard>
      ))}

      {/* Rest */}
      {rest.map(err => {
        const cmd = extractCommand(err.metadata)
        return (
          <GlassCard key={err.id} className="p-4" hover={false} neonColor="cyan">
            <div className="flex items-start gap-3">
              <XCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {cmd && <code className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-[10px] font-mono text-amber-400">{cmd}</code>}
                  <span className="text-[10px] font-mono text-white/30">{formatDistanceToNow(new Date(err.timestamp), { addSuffix: true })}</span>
                </div>
                <p className="text-xs text-white/70 truncate">{err.message}</p>
                {expanded === err.id && err.stack && (
                  <pre className="mt-2 text-[10px] p-3 bg-black/40 rounded text-red-400 overflow-x-auto max-h-48 overflow-y-auto font-mono">
                    {err.stack}
                  </pre>
                )}
              </div>
              <button
                type="button"
                onClick={() => setExpanded(expanded === err.id ? null : err.id)}
                className="text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors"
              >
                {expanded === err.id ? '▲' : '▼'}
              </button>
            </div>
          </GlassCard>
        )
      })}
    </div>
  )
}

function BridgeHealthContent({ data }: { data: BridgeHealthCheck[] }) {
  // Merge real data with known nodes (show all 4 even if not in data)
  const nodeMap = new Map(data.map(d => [d.component, d]))

  const nodes4 = BRIDGE_NODES.map(node => ({
    ...node,
    check: nodeMap.get(node.key) ?? null,
  }))

  return (
    <div className="space-y-5">
      {/* 4-node grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {nodes4.map(node => {
          const Icon = node.icon
          const status = node.check?.status ?? 'unknown'
          const latency = node.check?.latencyMs
          const isHealthy = status === 'healthy'
          const isDegraded = status === 'degraded'

          return (
            <motion.div
              key={node.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GlassCard className="p-5" hover={false} neonColor={isHealthy ? 'cyan' : isDegraded ? undefined : undefined}>
                <div className="flex items-center justify-between mb-3">
                  <Icon size={20} style={{ color: node.color }} />
                  <StatusPulse variant={isHealthy ? 'synced' : isDegraded ? 'pending' : 'offline'} />
                </div>
                <NeonText as="h3" color="cyan" className="text-sm font-black tracking-widest uppercase mb-1">
                  {node.label}
                </NeonText>
                <div className="space-y-1 text-[10px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-white/30 uppercase tracking-widest">STATUS</span>
                    <span style={{ color: isHealthy ? GREEN : isDegraded ? AMBER : RED }}>
                      {status.toUpperCase()}
                    </span>
                  </div>
                  {latency !== undefined && latency !== null && (
                    <div className="flex justify-between">
                      <span className="text-white/30 uppercase tracking-widest">LATENCY</span>
                      <span className="text-white/70">{latency}ms</span>
                    </div>
                  )}
                  {node.check && (
                    <div className="flex justify-between">
                      <span className="text-white/30 uppercase tracking-widest">LAST CHECK</span>
                      <span className="text-white/50">{formatDistanceToNow(new Date(node.check.checkedAt), { addSuffix: true })}</span>
                    </div>
                  )}
                  {!node.check && (
                    <div className="text-white/20 uppercase tracking-widest">NO DATA</div>
                  )}
                </div>
                {/* Latency bar */}
                {latency !== undefined && latency !== null && (
                  <div className="mt-3">
                    <div className="h-1 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (latency / 500) * 100)}%`,
                          backgroundColor: latency < 100 ? GREEN : latency < 300 ? AMBER : RED,
                        }}
                      />
                    </div>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )
        })}
      </div>

      {/* Any extra health checks */}
      {data.filter(d => !BRIDGE_NODES.find(n => n.key === d.component)).map(check => {
        const node = getBridgeNode(check.component)
        const Icon = node.icon
        return (
          <GlassCard key={check.id} className="p-4" hover={false}>
            <div className="flex items-center gap-3">
              <Icon size={16} style={{ color: node.color }} />
              <div>
                <p className="font-mono text-sm text-white">{node.label}</p>
                <p className="text-[10px] font-mono text-white/40">{check.latencyMs}ms · {check.status}</p>
              </div>
            </div>
          </GlassCard>
        )
      })}
    </div>
  )
}

function WebsiteErrorsContent({ data }: { data: ErrorLog[] }) {
  const critical = data.filter(e => e.errorType?.toLowerCase().includes('500') || e.errorType?.toLowerCase().includes('critical')).length
  const warning = data.filter(e => e.errorType?.toLowerCase().includes('400') || e.errorType?.toLowerCase().includes('warn')).length
  const info = data.length - critical - warning

  if (data.length === 0) {
    return (
      <GlassCard className="p-12 text-center" hover={false}>
        <CheckCircle2 size={40} className="text-green-400 mx-auto mb-3" />
        <p className="text-green-400 font-mono text-sm tracking-widest uppercase">NO WEBSITE ERRORS RECORDED</p>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-5">
      {/* Summary counts */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'CRITICAL', value: critical, color: RED, icon: XCircle },
          { label: 'WARNING', value: warning, color: AMBER, icon: AlertTriangle },
          { label: 'INFO', value: info, color: CYAN, icon: Activity },
        ].map(cat => {
          const Icon = cat.icon
          return (
            <GlassCard key={cat.label} className="p-4 flex flex-col gap-1" hover={false}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-white/30 tracking-widest uppercase">{cat.label}</span>
                <Icon size={12} style={{ color: cat.color }} />
              </div>
              <p className="text-2xl font-black" style={{ color: cat.color }}>{cat.value}</p>
            </GlassCard>
          )
        })}
      </div>

      {/* NextJS error categories table */}
      <GlassCard className="p-5" hover={false} neonColor="violet">
        <NeonText as="h3" color="violet" className="text-sm font-black tracking-widest uppercase mb-4">NEXTJS ERROR CATEGORIES</NeonText>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                {['TIMESTAMP', 'PATH', 'TYPE', 'MESSAGE', 'SEVERITY'].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-mono text-[10px] text-white/30 tracking-widest uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 20).map(err => {
                const path = extractPath(err.metadata)
                const isCrit = err.errorType?.toLowerCase().includes('500') || err.errorType?.toLowerCase().includes('critical')
                const isWarn = err.errorType?.toLowerCase().includes('400') || err.errorType?.toLowerCase().includes('warn')
                return (
                  <tr key={err.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2 px-3 font-mono text-white/40 text-[10px] whitespace-nowrap">
                      {formatDistanceToNow(new Date(err.timestamp), { addSuffix: true })}
                    </td>
                    <td className="py-2 px-3">
                      <code className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-red-400/80">{path ?? 'N/A'}</code>
                    </td>
                    <td className="py-2 px-3 font-mono text-white/50 text-[10px]">{err.errorType}</td>
                    <td className="py-2 px-3 text-white/60 truncate max-w-[200px]">{err.message}</td>
                    <td className="py-2 px-3">
                      <span className={[
                        'px-1.5 py-0.5 rounded border text-[10px] font-mono tracking-widest uppercase',
                        isCrit ? 'border-red-500/40 text-red-400 bg-red-500/10' :
                        isWarn ? 'border-amber-500/40 text-amber-400 bg-amber-500/10' :
                        'border-cyan-500/40 text-cyan-400 bg-cyan-500/10',
                      ].join(' ')}>
                        {isCrit ? 'CRITICAL' : isWarn ? 'WARNING' : 'INFO'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  )
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export function DeveloperDashboard({
  guildId: _guildId,
  initialMetrics: _initialMetrics,
  initialErrors,
  initialBridgeHealth,
  initialBotAnalytics,
  initialWebsiteErrors,
}: DeveloperDashboardProps) {
  const healthyNodes = initialBridgeHealth.filter(h => h.status === 'healthy').length
  const totalNodes = Math.max(initialBridgeHealth.length, BRIDGE_NODES.length)
  const criticalErrors = initialErrors.filter(e =>
    e.errorType?.toLowerCase().includes('critical') || e.errorType?.toLowerCase().includes('fatal')
  ).length

  const tabs = [
    { id: 'bot-analytics', label: 'BOT ANALYTICS', icon: Activity, color: VIOLET },
    { id: 'bot-errors', label: 'BOT ERRORS', icon: AlertTriangle, color: criticalErrors > 0 ? RED : AMBER, badge: criticalErrors > 0 ? criticalErrors : undefined },
    { id: 'bridge-health', label: 'BRIDGE HEALTH', icon: Wifi, color: CYAN },
    { id: 'website-errors', label: 'WEBSITE ERRORS', icon: Globe, color: RED, badge: initialWebsiteErrors.length > 0 ? initialWebsiteErrors.length : undefined },
  ]

  return (
    <main className="min-h-screen pb-16" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <div className="hud-grid-bg border-b border-[var(--color-neon-violet)] px-8 py-4">
        <div className="flex items-center gap-3 flex-wrap mb-1">
          <NeonText as="h1" color="violet" glitch className="text-2xl font-black tracking-widest uppercase">
            DEVELOPER NEXUS
          </NeonText>
          <span className="px-2 py-0.5 rounded border border-[rgba(124,58,237,0.5)] text-[10px] font-mono text-violet-400 tracking-widest">DEV</span>
        </div>
        <p className="text-[11px] font-mono text-white/40 tracking-widest uppercase">
          BOT TELEMETRY · ERROR LOGS · BRIDGE HEALTH · WEBSITE DIAGNOSTICS
        </p>

        {/* System pulse row */}
        <div className="flex flex-wrap gap-6 mt-3 text-[10px] font-mono tracking-widest uppercase">
          <span className="flex items-center gap-1.5">
            <StatusPulse variant={healthyNodes === totalNodes ? 'synced' : 'warning'} />
            <span className="text-white/40">BRIDGE:</span>
            <span style={{ color: healthyNodes === totalNodes ? GREEN : AMBER }}>
              {healthyNodes}/{totalNodes} NODES ONLINE
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <StatusPulse variant={criticalErrors > 0 ? 'critical' : 'synced'} />
            <span className="text-white/40">BOT ERRORS:</span>
            <span style={{ color: criticalErrors > 0 ? RED : GREEN }}>
              {criticalErrors > 0 ? `${criticalErrors} CRITICAL` : 'NOMINAL'}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <StatusPulse variant="synced" />
            <span className="text-white/40">COMMANDS:</span>
            <span className="text-cyan-400">{initialBotAnalytics.totalCommands.toLocaleString()} PROCESSED</span>
          </span>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1600px] mx-auto">
        <Tabs.Root defaultValue="bot-analytics" className="w-full">
          {/* Tab list */}
          <Tabs.List className="flex flex-wrap gap-1 mb-6 border-b border-white/10 pb-3">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <Tabs.Trigger
                  key={tab.id}
                  value={tab.id}
                  className={[
                    'group flex items-center gap-2 px-4 py-2 text-[11px] font-mono tracking-widest uppercase rounded border transition-all outline-none',
                    'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60',
                    'data-[state=active]:border-violet-500/60 data-[state=active]:bg-violet-700/20 data-[state=active]:text-violet-300',
                  ].join(' ')}
                >
                  <Icon size={12} style={{ color: tab.color }} />
                  {tab.label}
                  {tab.badge !== undefined && (
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-red-500/80 text-white text-[9px] font-bold">
                      {tab.badge}
                    </span>
                  )}
                </Tabs.Trigger>
              )
            })}
          </Tabs.List>

          <Tabs.Content value="bot-analytics" className="focus:outline-none">
            <BotAnalyticsContent data={initialBotAnalytics} />
          </Tabs.Content>

          <Tabs.Content value="bot-errors" className="focus:outline-none">
            <BotErrorsContent data={initialErrors} />
          </Tabs.Content>

          <Tabs.Content value="bridge-health" className="focus:outline-none">
            <BridgeHealthContent data={initialBridgeHealth} />
          </Tabs.Content>

          <Tabs.Content value="website-errors" className="focus:outline-none">
            <WebsiteErrorsContent data={initialWebsiteErrors} />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </main>
  )
}
