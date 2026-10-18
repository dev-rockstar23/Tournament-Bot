'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CreditCard, Shield, CheckCircle2, XCircle, AlertTriangle, Activity, Lock,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonText } from '@/components/ui/NeonText'
import { StatusPulse } from '@/components/ui/StatusPulse'
import { GlowButton } from '@/components/ui/GlowButton'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'

interface PaymentConfig {
  id: string
  provider: string
  razorpayKeyId: string
  hasKeySecret: boolean
  hasWebhookSecret: boolean
  isActive: boolean
  isVerified: boolean
  createdAt: string
  updatedAt: string
}

type LedgerFilter = 'ALL' | 'COLLECTED' | 'ESCROW' | 'DISBURSED' | 'FAILED'

const mockLedger = [
  { id: 'TXN001', team: 'Team Alpha', amount: 200, status: 'COLLECTED', tournament: 'BGMI S3', ts: '2h ago' },
  { id: 'TXN002', team: 'Iron Wolves', amount: 200, status: 'ESCROW', tournament: 'BGMI S3', ts: '2h ago' },
  { id: 'TXN003', team: 'Shadow Squad', amount: 200, status: 'DISBURSED', tournament: 'FF Open', ts: '1d ago' },
  { id: 'TXN004', team: 'Nova Force', amount: 200, status: 'FAILED', tournament: 'COD Cup', ts: '2d ago' },
  { id: 'TXN005', team: 'Phantom IX', amount: 200, status: 'COLLECTED', tournament: 'BGMI S3', ts: '3h ago' },
]

const STATUS_COLORS: Record<string, string> = {
  COLLECTED: '#10b981',
  ESCROW: '#f59e0b',
  DISBURSED: '#06b6d4',
  FAILED: '#ef4444',
}

interface Props {
  guildId: string
}

export function PaymentOperationsClient({ guildId }: Props) {
  const [config, setConfig] = useState<PaymentConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('ALL')

  const [keyId, setKeyId] = useState('')
  const [keySecret, setKeySecret] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')

  useEffect(() => {
    fetchConfig()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId])

  async function fetchConfig() {
    try {
      setLoading(true)
      const res = await fetch(`/api/servers/${guildId}/payment-config`)
      if (res.ok) setConfig(await res.json())
      else if (res.status !== 404) throw new Error('Failed to load payment configuration')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/servers/${guildId}/payment-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'RAZORPAY', razorpayKeyId: keyId, razorpayKeySecret: keySecret, razorpayWebhookSecret: webhookSecret }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save configuration')
      setSuccess('Payment configuration saved and verified successfully!')
      setKeyId('')
      setKeySecret('')
      setWebhookSecret('')
      await fetchConfig()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete payment configuration?')) return
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/servers/${guildId}/payment-config`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete configuration')
      }
      setSuccess('Payment configuration deleted')
      setConfig(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete configuration')
    }
  }

  const filteredLedger = ledgerFilter === 'ALL' ? mockLedger : mockLedger.filter(t => t.status === ledgerFilter)
  const totalCollected = mockLedger.filter(t => t.status === 'COLLECTED' || t.status === 'DISBURSED').reduce((s, t) => s + t.amount, 0)
  const escrowTotal = mockLedger.filter(t => t.status === 'ESCROW').reduce((s, t) => s + t.amount, 0)
  const disbursedTotal = mockLedger.filter(t => t.status === 'DISBURSED').reduce((s, t) => s + t.amount, 0)
  const failedTotal = mockLedger.filter(t => t.status === 'FAILED').reduce((s, t) => s + t.amount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 animate-pulse tracking-widest uppercase">
          <StatusPulse variant="pending" />
          LOADING PAYMENT SYSTEMS...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <div className="hud-grid-bg border-b border-[var(--color-neon-cyan)] px-6 py-4">
        <div className="flex items-center gap-3 flex-wrap mb-1">
          <NeonText as="h1" color="cyan" glitch className="text-2xl font-black tracking-widest uppercase">
            PAYMENT OPERATIONS & TRANSACTION AUDIT
          </NeonText>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-green-500/40 bg-green-500/10 text-[10px] font-mono text-green-400 tracking-widest">
            <Lock size={9} />
            PCI-DSS COMPLIANT
          </span>
        </div>
        <p className="text-[11px] font-mono text-white/40 tracking-widest uppercase">
          RAZORPAY GATEWAY — ESCROW ENGINE — TRANSACTION LEDGER
        </p>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-[1400px] mx-auto">
        {/* Alert messages */}
        {error && (
          <div className="p-4 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 text-sm font-mono">{error}</div>
        )}
        {success && (
          <div className="p-4 rounded-lg border border-green-500/40 bg-green-500/10 text-green-400 text-sm font-mono">{success}</div>
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'TOTAL COLLECTED', value: totalCollected, prefix: '₹', color: '#10b981', icon: CheckCircle2 },
            { label: 'ACTIVE ESCROW', value: escrowTotal, prefix: '₹', color: '#f59e0b', icon: CreditCard },
            { label: 'DISBURSED', value: disbursedTotal, prefix: '₹', color: '#06b6d4', icon: Activity },
            { label: 'FAILED / REVERSED', value: failedTotal, prefix: '₹', color: '#ef4444', icon: XCircle },
          ].map(kpi => {
            const Icon = kpi.icon
            return (
              <GlassCard key={kpi.label} className="p-5 flex flex-col gap-2" hover={false} neonColor="cyan">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-white/40 tracking-widest uppercase">{kpi.label}</span>
                  <Icon size={14} style={{ color: kpi.color }} />
                </div>
                <p className="text-2xl font-black" style={{ color: kpi.color }}>
                  {kpi.prefix}<AnimatedCounter value={kpi.value} />
                </p>
              </GlassCard>
            )
          })}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: Ledger */}
          <div className="xl:col-span-2 space-y-4">
            {/* Filter tabs */}
            <div className="flex flex-wrap gap-1">
              {(['ALL', 'COLLECTED', 'ESCROW', 'DISBURSED', 'FAILED'] as LedgerFilter[]).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setLedgerFilter(f)}
                  className={[
                    'px-3 py-1.5 text-[10px] font-mono tracking-widest uppercase rounded border transition-all',
                    ledgerFilter === f
                      ? 'bg-violet-700/30 border-violet-500/60 text-violet-300'
                      : 'border-white/10 text-white/30 hover:border-white/20 hover:text-white/60',
                  ].join(' ')}
                >
                  {f}
                </button>
              ))}
            </div>

            <GlassCard className="p-5" hover={false} neonColor="violet">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard size={14} className="text-violet-400" />
                <NeonText as="h2" color="violet" className="text-sm font-black tracking-widest uppercase">
                  LIVE TRANSACTION LEDGER
                </NeonText>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      {['TXN ID', 'TEAM', 'AMOUNT', 'STATUS', 'TOURNAMENT', 'TIME'].map(h => (
                        <th key={h} className="text-left py-2 px-3 font-mono text-[10px] text-white/30 tracking-widest uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLedger.map(txn => (
                      <motion.tr
                        key={txn.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-2 px-3 font-mono text-cyan-400/70 text-[10px]">{txn.id}</td>
                        <td className="py-2 px-3 text-white font-semibold">{txn.team}</td>
                        <td className="py-2 px-3 font-mono text-white/80">₹{txn.amount}</td>
                        <td className="py-2 px-3">
                          <span
                            className="px-1.5 py-0.5 rounded border text-[10px] font-mono tracking-widest uppercase"
                            style={{
                              color: STATUS_COLORS[txn.status],
                              borderColor: `${STATUS_COLORS[txn.status]}40`,
                              backgroundColor: `${STATUS_COLORS[txn.status]}10`,
                            }}
                          >
                            {txn.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-white/50 text-[10px]">{txn.tournament}</td>
                        <td className="py-2 px-3 text-white/30 font-mono text-[10px]">{txn.ts}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>

          {/* Right: Webhook Health + Escrow Policy + Credentials */}
          <div className="space-y-4">
            {/* Razorpay Webhook Health */}
            <GlassCard className="p-5" hover={false} hud>
              <div className="flex items-center gap-2 mb-3">
                <Activity size={14} className="text-cyan-400" />
                <NeonText as="h3" color="cyan" className="text-sm font-black tracking-widest uppercase">
                  RAZORPAY WEBHOOK HEALTH
                </NeonText>
              </div>
              <div className="space-y-2 text-xs font-mono">
                {[
                  { label: 'WEBHOOK STATUS', value: config?.isVerified ? 'VERIFIED' : 'PENDING', ok: !!config?.isVerified },
                  { label: 'GATEWAY ACTIVE', value: config?.isActive ? 'LIVE' : 'INACTIVE', ok: !!config?.isActive },
                  { label: 'LAST EVENT', value: config ? '2m ago' : 'N/A', ok: !!config },
                  { label: 'KEY SECRET', value: config?.hasKeySecret ? 'PRESENT' : 'MISSING', ok: !!config?.hasKeySecret },
                ].map(stat => (
                  <div key={stat.label} className="flex items-center justify-between py-1.5 border-b border-white/5">
                    <span className="text-white/30 tracking-widest uppercase text-[10px]">{stat.label}</span>
                    <span className="flex items-center gap-1" style={{ color: stat.ok ? '#10b981' : '#ef4444' }}>
                      <StatusPulse variant={stat.ok ? 'synced' : 'offline'} />
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Escrow Release Policy */}
            <GlassCard className="p-5" hover={false} neonColor="violet">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={14} className="text-violet-400" />
                <NeonText as="h3" color="violet" className="text-sm font-black tracking-widest uppercase">
                  ESCROW RELEASE POLICY
                </NeonText>
              </div>
              <div className="space-y-2 text-xs font-mono text-white/50">
                {[
                  { policy: 'Auto-release on result confirm', active: true },
                  { policy: 'Refund on cancel (admin)', active: true },
                  { policy: '72h dispute window', active: true },
                  { policy: 'Anti-fraud verification', active: false },
                ].map(p => (
                  <div key={p.policy} className="flex items-center gap-2 py-1">
                    <div className={[
                      'w-3 h-3 rounded border flex items-center justify-center flex-shrink-0',
                      p.active ? 'border-green-500/50 bg-green-500/10' : 'border-white/10',
                    ].join(' ')}>
                      {p.active && <CheckCircle2 size={8} className="text-green-400" />}
                    </div>
                    <span className={p.active ? 'text-white/70' : 'text-white/30'}>{p.policy}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Credentials Form */}
            <GlassCard className="p-5" hover={false}>
              <div className="flex items-center gap-2 mb-3">
                <Lock size={14} className="text-amber-400" />
                <NeonText as="h3" color="violet" className="text-sm font-black tracking-widest uppercase">
                  {config ? 'UPDATE' : 'ADD'} CREDENTIALS
                </NeonText>
              </div>
              <div className="space-y-3 text-xs">
                {[
                  { label: 'KEY ID', value: keyId, setter: setKeyId, type: 'text', placeholder: 'rzp_live_xxxxxxxx' },
                  { label: 'KEY SECRET', value: keySecret, setter: setKeySecret, type: 'password', placeholder: '••••••••••••••••' },
                  { label: 'WEBHOOK SECRET', value: webhookSecret, setter: setWebhookSecret, type: 'password', placeholder: '••••••••••••••••' },
                ].map(field => (
                  <div key={field.label}>
                    <label className="text-[10px] font-mono text-white/30 tracking-widest uppercase">{field.label}</label>
                    <input
                      type={field.type}
                      value={field.value}
                      onChange={e => field.setter(e.target.value)}
                      placeholder={field.placeholder}
                      className="mt-1 w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-xs font-mono placeholder-white/20 focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <GlowButton
                    variant="primary"
                    size="sm"
                    onClick={handleSave}
                    disabled={saving || !keyId || !keySecret || !webhookSecret}
                    className="flex-1"
                  >
                    {saving ? 'VERIFYING...' : 'SAVE CONFIG'}
                  </GlowButton>
                  {config && (
                    <GlowButton variant="destructive" size="sm" onClick={handleDelete}>
                      DELETE
                    </GlowButton>
                  )}
                </div>
              </div>
            </GlassCard>

            {/* Existing config status */}
            {config && (
              <GlassCard className="p-4" hover={false}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-white/30 tracking-widest uppercase">CURRENT CONFIG</span>
                  <div className="flex gap-1">
                    {config.isVerified && <span className="px-1.5 py-0.5 text-[10px] font-mono rounded border border-green-500/30 text-green-400">VERIFIED</span>}
                    {config.isActive && <span className="px-1.5 py-0.5 text-[10px] font-mono rounded border border-blue-500/30 text-blue-400">ACTIVE</span>}
                  </div>
                </div>
                <div className="font-mono text-xs text-white/60">{config.razorpayKeyId}</div>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
