'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlowButton } from '@/components/ui/GlowButton'
import { Badge } from '@/components/ui/Badge'
import { NeonText } from '@/components/ui/NeonText'
import { Plus, Trash2, ChevronRight } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stage {
  id: string
  name: string
  type: string
  stageType: string
  order: number
  status: string
  teamsAdvancing: number
  teamsPerGroup: number
  matchCount: number
  bracketLocked: boolean
}

interface StageBuilderClientProps {
  guildId: string
  tournamentId: string
  tournamentName: string
  initialStages: Stage[]
}

const STAGE_TYPE_OPTIONS = [
  { value: 'GROUP_STAGE', label: 'Group Stage' },
  { value: 'KNOCKOUT', label: 'Knockout' },
  { value: 'ROUND_ROBIN', label: 'Round Robin' },
  { value: 'BATTLE_ROYALE_QUALIFIER', label: 'Battle Royale Qualifier' },
]

function statusToBadgeVariant(
  status: string
): 'live' | 'upcoming' | 'completed' | 'cancelled' | 'draft' | 'default' {
  switch (status) {
    case 'active':
    case 'live':
      return 'live'
    case 'pending':
      return 'draft'
    case 'completed':
      return 'completed'
    default:
      return 'default'
  }
}

function stageTypeLabel(type: string): string {
  return STAGE_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type
}

// ─── Add Stage Modal ──────────────────────────────────────────────────────────

interface AddStageModalProps {
  guildId: string
  tournamentId: string
  onClose: () => void
  onAdded: () => void
}

function AddStageModal({ guildId, tournamentId, onClose, onAdded }: AddStageModalProps) {
  const [name, setName] = useState('')
  const [stageType, setStageType] = useState('GROUP_STAGE')
  const [teamsPerGroup, setTeamsPerGroup] = useState(12)
  const [teamsAdvancing, setTeamsAdvancing] = useState(3)
  const [matchCount, setMatchCount] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/servers/${guildId}/admin/tournaments/${tournamentId}/stages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, stageType, teamsPerGroup, teamsAdvancing, matchCount }),
        }
      )

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Failed to create stage')
      }

      onAdded()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-stage-title"
    >
      <GlassCard className="w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <NeonText as="h2" id="add-stage-title" color="violet" className="text-lg font-black tracking-widest uppercase">
            Add Stage
          </NeonText>
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-sm mb-4 font-mono">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-white/50 tracking-widest uppercase mb-1.5">
              Stage Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="e.g. Qualifier Round"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-white/50 tracking-widest uppercase mb-1.5">
              Stage Type
            </label>
            <select
              value={stageType}
              onChange={e => setStageType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
            >
              {STAGE_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-[#0f0f19]">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-mono text-white/50 tracking-widest uppercase mb-1.5">
                Teams/Group
              </label>
              <input
                type="number"
                value={teamsPerGroup}
                onChange={e => setTeamsPerGroup(Number(e.target.value))}
                min={1}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-white/50 tracking-widest uppercase mb-1.5">
                Advancing
              </label>
              <input
                type="number"
                value={teamsAdvancing}
                onChange={e => setTeamsAdvancing(Number(e.target.value))}
                min={1}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-white/50 tracking-widest uppercase mb-1.5">
                Matches
              </label>
              <input
                type="number"
                value={matchCount}
                onChange={e => setMatchCount(Number(e.target.value))}
                min={1}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <GlowButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </GlowButton>
            <GlowButton
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Adding…' : 'Add Stage'}
            </GlowButton>
          </div>
        </form>
      </GlassCard>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function StageBuilderClient({
  guildId,
  tournamentId,
  tournamentName,
  initialStages,
}: StageBuilderClientProps) {
  const router = useRouter()
  const [stages, setStages] = useState<Stage[]>(initialStages)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshStages = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/servers/${guildId}/admin/tournaments/${tournamentId}/stages`
      )
      if (!res.ok) return
      const data = await res.json() as { stages: Stage[] }
      setStages(data.stages)
    } catch { /* non-fatal */ }
    router.refresh()
  }, [guildId, tournamentId, router])

  async function handleDelete(stageId: string) {
    if (!confirm('Delete this stage? This cannot be undone.')) return
    setDeletingId(stageId)
    setError(null)
    try {
      const res = await fetch(
        `/api/servers/${guildId}/admin/tournaments/${tournamentId}/stages?stageId=${stageId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Failed to delete stage')
      }
      await refreshStages()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div
      className="min-h-screen pb-16"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      {/* Header */}
      <div className="hud-grid-bg border-b border-[var(--color-neon-violet)] px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <NeonText as="h1" color="violet" className="text-2xl font-black tracking-widest uppercase">
              Stage Builder
            </NeonText>
            <p className="text-xs font-mono text-white/40 tracking-widest uppercase mt-0.5">
              {tournamentName}
            </p>
          </div>
          <GlowButton
            variant="primary"
            size="md"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} aria-hidden="true" />
            Add Stage
          </GlowButton>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <GlassCard className="p-4 border-red-500/20 text-red-400 text-sm mb-6" role="alert">
            {error}
          </GlassCard>
        )}

        {/* Bracket lock rule */}
        <GlassCard hud className="p-4 mb-6">
          <p className="text-xs font-mono text-[var(--color-text-muted)] tracking-widest uppercase mb-1">
            📋 Bracket Lock Rule
          </p>
          <p className="text-xs font-mono text-white/60">
            Brackets unlock only for the last 3 stages (Semi-Finals and beyond). Earlier stages are locked to prevent premature bracket reveals.
          </p>
        </GlassCard>

        {/* Pipeline visualization */}
        {stages.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <p className="text-white/40 font-mono text-sm mb-4">No stages yet. Click "Add Stage" to create your tournament pipeline.</p>
            <GlowButton variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
              <Plus size={14} aria-hidden="true" />
              Add First Stage
            </GlowButton>
          </GlassCard>
        ) : (
          <div>
            {/* Horizontal stage pipeline */}
            <div
              className="flex items-center gap-2 overflow-x-auto pb-4 mb-8"
              role="list"
              aria-label="Stage pipeline"
            >
              {stages.map((stage, index) => (
                <div key={stage.id} className="flex items-center gap-2 flex-shrink-0" role="listitem">
                  <div
                    className={[
                      'px-3 py-2 rounded-lg border text-xs font-mono font-bold tracking-wider whitespace-nowrap',
                      stage.bracketLocked
                        ? 'border-white/10 bg-white/5 text-white/50'
                        : 'border-violet-500/40 bg-violet-500/10 text-violet-300',
                    ].join(' ')}
                  >
                    {stage.bracketLocked ? '🔒' : '🔓'} {stage.name}
                  </div>
                  {index < stages.length - 1 && (
                    <ChevronRight size={16} className="text-white/30 flex-shrink-0" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>

            {/* Stage cards */}
            <div className="space-y-4">
              {stages.map((stage) => (
                <GlassCard key={stage.id} className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="text-lg font-mono font-black text-white">
                          {stage.bracketLocked ? '🔒' : '🔓'} {stage.name}
                        </span>
                        <Badge variant={statusToBadgeVariant(stage.status)}>
                          {stage.status.toUpperCase()}
                        </Badge>
                        <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-violet-500/10 border border-violet-500/30 text-violet-300">
                          {stageTypeLabel(stage.stageType)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono text-white/60">
                        <div>
                          <span className="text-white/30 tracking-widest uppercase block">Teams/Group</span>
                          <span className="text-white font-bold">{stage.teamsPerGroup}</span>
                        </div>
                        <div>
                          <span className="text-white/30 tracking-widest uppercase block">Advancing</span>
                          <span className="text-white font-bold">{stage.teamsAdvancing}</span>
                        </div>
                        <div>
                          <span className="text-white/30 tracking-widest uppercase block">Matches</span>
                          <span className="text-white font-bold">{stage.matchCount}</span>
                        </div>
                        <div>
                          <span className="text-white/30 tracking-widest uppercase block">Order</span>
                          <span className="text-white font-bold">#{stage.order}</span>
                        </div>
                      </div>
                    </div>

                    {/* Delete only on pending stages */}
                    {stage.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleDelete(stage.id)}
                        disabled={deletingId === stage.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-red-400 border border-red-500/30 bg-red-500/5 hover:bg-red-500/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                        aria-label={`Delete stage ${stage.name}`}
                      >
                        <Trash2 size={12} aria-hidden="true" />
                        {deletingId === stage.id ? 'Deleting…' : 'Delete'}
                      </button>
                    )}
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Stage Modal */}
      {showAddModal && (
        <AddStageModal
          guildId={guildId}
          tournamentId={tournamentId}
          onClose={() => setShowAddModal(false)}
          onAdded={refreshStages}
        />
      )}
    </div>
  )
}
