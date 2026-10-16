'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GlowButton } from '@/components/ui/GlowButton'

interface FinalizeButtonProps {
  guildId: string
  tournamentId: string
  disabled?: boolean
}

export function FinalizeButton({ guildId, tournamentId, disabled }: FinalizeButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFinalize() {
    if (disabled || loading) return
    setError(null)

    const confirmed = window.confirm(
      'This will lock results and mark the tournament COMPLETED. This action cannot be undone. Continue?'
    )
    if (!confirmed) return

    setLoading(true)
    try {
      const res = await fetch(
        `/api/servers/${guildId}/tournaments/${tournamentId}/finalize`,
        { method: 'POST' }
      )
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Finalization failed')
        return
      }
      // Refresh to show updated state
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <GlowButton
        variant="primary"
        size="lg"
        disabled={disabled || loading}
        onClick={handleFinalize}
        aria-label="Finalize tournament and lock results"
      >
        {loading ? 'Finalizing…' : '🏆 Finalize Tournament'}
      </GlowButton>
      {error && (
        <p className="text-red-400 text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
