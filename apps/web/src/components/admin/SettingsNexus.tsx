'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Users, Settings2, Clock, Hash, AlertTriangle } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonText } from '@/components/ui/NeonText'
import { StatusPulse } from '@/components/ui/StatusPulse'
import { GlowButton } from '@/components/ui/GlowButton'

type SettingsTab = 'staff' | 'chrono' | 'security'

interface InitialSettings {
  name: string
  icon: string | null
  timezone: string
  accentColor: string
  logoUrl: string | null
  bannerUrl: string | null
  announcementChannelId: string | null
  matchChannelId: string | null
  resultsChannelId: string | null
  disputesChannelId: string | null
  adminChannelId: string | null
  refundOnCancel: boolean
  overlayTokenTail: string | null
  hasOverlayToken: boolean
}

interface SettingsNexusProps {
  guildId: string
  initialSettings: InitialSettings
}

const staffRoleData = [
  { discordRole: '@Administrator', appRole: 'SERVER_ADMIN', members: 2, tier: 'S5', color: '#7c3aed' },
  { discordRole: '@Tournament Manager', appRole: 'TOURNAMENT_MANAGER', members: 4, tier: 'S4', color: '#06b6d4' },
  { discordRole: '@Referee', appRole: 'REFEREE', members: 8, tier: 'S3', color: '#10b981' },
  { discordRole: '@Content Mod', appRole: 'CONTENT_MOD', members: 6, tier: 'S2', color: '#f59e0b' },
]

const staffDirectory = [
  { name: 'Cipher_X', role: 'SERVER ADMIN', status: 'online', lastActive: '2m ago' },
  { name: 'NightHawk', role: 'TOURNAMENT MGR', status: 'online', lastActive: '5m ago' },
  { name: 'ShadowByte', role: 'REFEREE', status: 'idle', lastActive: '22m ago' },
  { name: 'Vortex_99', role: 'REFEREE', status: 'offline', lastActive: '3h ago' },
]

const TIMEZONES = ['UTC', 'Asia/Kolkata', 'Asia/Singapore', 'US/Eastern', 'Europe/London']

export function SettingsNexus({ guildId: _guildId, initialSettings }: SettingsNexusProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('staff')

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'staff', label: 'STAFF MANAGEMENT & ROLES', icon: Users },
    { id: 'chrono', label: 'TIMEZONE & CHANNELS', icon: Clock },
    { id: 'security', label: 'ANTI-BRUTE FORCE SECURITY', icon: Shield },
  ]

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <div className="hud-grid-bg border-b border-[var(--color-neon-violet)] px-6 py-4">
        <NeonText as="h1" color="violet" glitch className="text-2xl font-black tracking-widest uppercase">
          SERVER CONFIGURATION NEXUS
        </NeonText>
        <p className="text-[11px] font-mono text-white/40 tracking-widest uppercase mt-1">
          GUILD CONFIG — STAFF · CHRONO · SECURITY SENTINEL
        </p>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mt-4">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex items-center gap-2 px-4 py-2 text-[10px] font-mono tracking-widest uppercase rounded border transition-all',
                  activeTab === tab.id
                    ? 'bg-violet-700/30 border-violet-500/60 text-violet-300'
                    : 'border-white/10 text-white/30 hover:border-white/20 hover:text-white/60',
                ].join(' ')}
              >
                <Icon size={12} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        {/* STAFF MANAGEMENT TAB */}
        {activeTab === 'staff' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 xl:grid-cols-3 gap-6"
          >
            {/* Left: Staff Role Bindings */}
            <div className="xl:col-span-2 space-y-4">
              <GlassCard className="p-5" hover={false} neonColor="violet">
                <div className="flex items-center gap-2 mb-4">
                  <Settings2 size={14} className="text-violet-400" />
                  <NeonText as="h2" color="violet" className="text-sm font-black tracking-widest uppercase">
                    STAFF ROLE BINDINGS
                  </NeonText>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10">
                        {['DISCORD ROLE', 'APP ROLE', 'MEMBERS', 'SECURITY TIER'].map(h => (
                          <th key={h} className="text-left py-2 px-3 font-mono text-[10px] text-white/30 tracking-widest uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {staffRoleData.map(row => (
                        <tr key={row.discordRole} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3 px-3 font-mono" style={{ color: row.color }}>{row.discordRole}</td>
                          <td className="py-3 px-3 text-white/70 font-mono text-[10px] tracking-widest">{row.appRole}</td>
                          <td className="py-3 px-3 font-black text-white">{row.members}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded border text-[10px] font-mono tracking-widest" style={{ color: row.color, borderColor: `${row.color}40` }}>
                              {row.tier}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4">
                  <GlowButton variant="cyber" size="sm">
                    + BIND NEW ROLE
                  </GlowButton>
                </div>
              </GlassCard>

              {/* Active Staff Directory */}
              <GlassCard className="p-5" hover={false} neonColor="cyan">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={14} className="text-cyan-400" />
                  <NeonText as="h2" color="cyan" className="text-sm font-black tracking-widest uppercase">
                    ACTIVE STAFF DIRECTORY
                  </NeonText>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {staffDirectory.map(staff => (
                    <div
                      key={staff.name}
                      className="flex items-center gap-3 p-3 rounded-lg border border-white/10 hover:border-violet-500/30 transition-colors"
                    >
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-violet-700/40 border border-violet-500/40 flex items-center justify-center text-xs font-bold text-white">
                          {staff.name.charAt(0).toUpperCase()}
                        </div>
                        <StatusPulse
                          variant={staff.status === 'online' ? 'synced' : staff.status === 'idle' ? 'pending' : 'offline'}
                          className="absolute -bottom-0.5 -right-0.5"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{staff.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] font-mono text-white/40 tracking-widest uppercase">{staff.role}</span>
                          <span className="text-[9px] text-white/20">·</span>
                          <span className="text-[9px] font-mono text-white/30">{staff.lastActive}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>

            {/* Right: Quick config */}
            <div className="space-y-4">
              <GlassCard className="p-5" hover={false} hud>
                <NeonText as="h3" color="violet" className="text-sm font-black tracking-widest uppercase mb-4">
                  SERVER INFO
                </NeonText>
                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <label className="text-[10px] text-white/30 tracking-widest uppercase">SERVER NAME</label>
                    <div className="mt-1 px-3 py-2 rounded border border-white/10 text-white/70">{initialSettings.name}</div>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 tracking-widest uppercase">ACCENT COLOR</label>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="w-6 h-6 rounded border border-white/10" style={{ backgroundColor: initialSettings.accentColor }} />
                      <span className="text-white/50">{initialSettings.accentColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 tracking-widest uppercase">OVERLAY TOKEN</label>
                    <div className="mt-1 px-3 py-2 rounded border border-white/10 text-white/40">
                      {initialSettings.hasOverlayToken ? `••••••••${initialSettings.overlayTokenTail}` : 'NOT SET'}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </motion.div>
        )}

        {/* CHRONO & CHANNELS TAB */}
        {activeTab === 'chrono' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 xl:grid-cols-2 gap-6"
          >
            <GlassCard className="p-5" hover={false} neonColor="cyan">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={14} className="text-cyan-400" />
                <NeonText as="h2" color="cyan" className="text-sm font-black tracking-widest uppercase">
                  CHRONO SETTINGS
                </NeonText>
              </div>
              <div className="space-y-4 text-xs font-mono">
                <div>
                  <label className="text-[10px] text-white/30 tracking-widest uppercase">TIMEZONE</label>
                  <select
                    defaultValue={initialSettings.timezone}
                    className="mt-1 w-full px-3 py-2 rounded border border-white/10 bg-white/5 text-white focus:outline-none focus:border-cyan-500"
                  >
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-white/30 tracking-widest uppercase">REFUND ON CANCEL</label>
                  <div className="mt-1 flex items-center gap-2">
                    <div className={[
                      'w-10 h-5 rounded-full border cursor-pointer transition-colors',
                      initialSettings.refundOnCancel ? 'bg-green-600/40 border-green-500/60' : 'bg-white/5 border-white/10',
                    ].join(' ')} />
                    <span className="text-white/50">{initialSettings.refundOnCancel ? 'ENABLED' : 'DISABLED'}</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5" hover={false} neonColor="violet">
              <div className="flex items-center gap-2 mb-4">
                <Hash size={14} className="text-violet-400" />
                <NeonText as="h2" color="violet" className="text-sm font-black tracking-widest uppercase">
                  CHANNEL BINDINGS
                </NeonText>
              </div>
              <div className="space-y-3 text-xs font-mono">
                {[
                  { label: 'ANNOUNCEMENT CHANNEL', value: initialSettings.announcementChannelId },
                  { label: 'MATCH CHANNEL', value: initialSettings.matchChannelId },
                  { label: 'RESULTS CHANNEL', value: initialSettings.resultsChannelId },
                  { label: 'DISPUTES CHANNEL', value: initialSettings.disputesChannelId },
                  { label: 'ADMIN CHANNEL', value: initialSettings.adminChannelId },
                ].map(ch => (
                  <div key={ch.label}>
                    <label className="text-[10px] text-white/30 tracking-widest uppercase">{ch.label}</label>
                    <div className="mt-1 px-3 py-2 rounded border border-white/10 text-white/50 flex items-center gap-2">
                      <Hash size={10} className="text-cyan-400/50" />
                      {ch.value ? ch.value : <span className="text-white/20">NOT CONFIGURED</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <GlowButton variant="cyber" size="sm">SYNC DISCORD CHANNELS</GlowButton>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* SECURITY SENTINEL TAB */}
        {activeTab === 'security' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 xl:grid-cols-2 gap-6"
          >
            <GlassCard className="p-5" hover={false} neonColor="red" scanline>
              <div className="flex items-center gap-2 mb-4">
                <Shield size={14} className="text-red-400" />
                <NeonText as="h2" color="violet" className="text-sm font-black tracking-widest uppercase">
                  ANTI-BRUTE FORCE SENTINEL
                </NeonText>
              </div>
              <div className="space-y-4 text-xs font-mono">
                {[
                  { label: 'RATE LIMIT (REG/MIN)', value: '10', color: '#06b6d4' },
                  { label: 'MAX FAILED AUTH', value: '5', color: '#ef4444' },
                  { label: 'LOCKOUT DURATION', value: '15 min', color: '#f59e0b' },
                  { label: 'IP WHITELIST', value: '3 IPs', color: '#10b981' },
                ].map(cfg => (
                  <div key={cfg.label} className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-white/40 tracking-widest uppercase text-[10px]">{cfg.label}</span>
                    <span className="font-black" style={{ color: cfg.color }}>{cfg.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                <GlowButton variant="destructive" size="sm" className="w-full justify-center">
                  TRIGGER LOCKDOWN
                </GlowButton>
                <GlowButton variant="ghost" size="sm" className="w-full justify-center">
                  VIEW IP BLOCKLIST
                </GlowButton>
              </div>
            </GlassCard>

            <GlassCard className="p-5" hover={false} hud>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={14} className="text-amber-400" />
                <NeonText as="h2" color="violet" className="text-sm font-black tracking-widest uppercase">
                  RECENT SECURITY EVENTS
                </NeonText>
              </div>
              <div className="space-y-2">
                {[
                  { event: 'Failed login attempt (5x)', ip: '192.168.x.x', time: '2m ago', level: 'critical' },
                  { event: 'Role escalation blocked', ip: 'UID:443xx', time: '18m ago', level: 'warning' },
                  { event: 'API rate limit triggered', ip: '10.0.x.x', time: '1h ago', level: 'warning' },
                  { event: 'Admin panel accessed', ip: 'UID:881xx', time: '3h ago', level: 'info' },
                ].map((ev, i) => (
                  <div key={i} className={[
                    'flex items-start gap-2 p-2 rounded border text-xs font-mono',
                    ev.level === 'critical' ? 'border-red-500/30 bg-red-500/5 text-red-400' :
                    ev.level === 'warning' ? 'border-amber-500/30 bg-amber-500/5 text-amber-400' :
                    'border-white/10 text-white/40',
                  ].join(' ')}>
                    <StatusPulse variant={ev.level === 'critical' ? 'critical' : ev.level === 'warning' ? 'warning' : 'synced'} className="mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{ev.event}</p>
                      <p className="text-[9px] text-white/30 mt-0.5">{ev.ip} · {ev.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </div>
    </div>
  )
}
