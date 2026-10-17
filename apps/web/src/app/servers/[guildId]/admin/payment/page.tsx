'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { GlowButton } from '@/components/ui/GlowButton'

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

export default function PaymentSettingsPage() {
  const params = useParams()
  const guildId = params.guildId as string

  const [config, setConfig] = useState<PaymentConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [keyId, setKeyId] = useState('')
  const [keySecret, setKeySecret] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')

  // Fetch existing config
  useEffect(() => {
    fetchConfig()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId])

  async function fetchConfig() {
    try {
      setLoading(true)
      const res = await fetch(`/api/servers/${guildId}/payment-config`)
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
      } else if (res.status === 404) {
        setConfig(null)
      } else {
        throw new Error('Failed to load payment configuration')
      }
    } catch (err) {
      console.error(err)
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
        body: JSON.stringify({
          provider: 'RAZORPAY',
          razorpayKeyId: keyId,
          razorpayKeySecret: keySecret,
          razorpayWebhookSecret: webhookSecret,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save configuration')
      }

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
    if (!confirm('Are you sure you want to delete this payment configuration?')) {
      return
    }

    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/servers/${guildId}/payment-config`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete configuration')
      }

      setSuccess('Payment configuration deleted successfully')
      setConfig(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete configuration')
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-3xl font-black text-white mb-2"
          style={{ fontFamily: 'var(--font-display, Orbitron, sans-serif)' }}
        >
          Payment Settings
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Configure Razorpay credentials to accept payments for paid tournaments
        </p>
      </div>

      {/* Alert messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400">
          {success}
        </div>
      )}

      {loading ? (
        <div className="glass-card p-8 text-center">
          <div className="text-[var(--color-text-secondary)]">Loading...</div>
        </div>
      ) : (
        <>
          {/* Existing config */}
          {config && (
              <div className="glass-card p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white mb-1">Current Configuration</h2>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Provider: {config.provider}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {config.isVerified && (
                      <span className="px-2 py-1 text-xs font-semibold bg-green-500/20 text-green-400 rounded">
                        Verified
                      </span>
                    )}
                    {config.isActive && (
                      <span className="px-2 py-1 text-xs font-semibold bg-blue-500/20 text-blue-400 rounded">
                        Active
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <div className="text-sm text-[var(--color-text-secondary)] mb-1">Key ID</div>
                    <div className="text-white font-mono">{config.razorpayKeyId}</div>
                  </div>
                  <div>
                    <div className="text-sm text-[var(--color-text-secondary)] mb-1">Key Secret</div>
                    <div className="text-white font-mono">
                      {config.hasKeySecret ? '••••••••••••••••' : 'Not set'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-[var(--color-text-secondary)] mb-1">
                      Webhook Secret
                    </div>
                    <div className="text-white font-mono">
                      {config.hasWebhookSecret ? '••••••••••••••••' : 'Not set'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <GlowButton
                    variant="danger"
                    size="sm"
                    onClick={handleDelete}
                  >
                    Delete Configuration
                  </GlowButton>
                </div>
              </div>
            )}

            {/* Configuration form */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold text-white mb-4">
                {config ? 'Update' : 'Add'} Razorpay Credentials
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Razorpay Key ID
                  </label>
                  <input
                    type="text"
                    value={keyId}
                    onChange={(e) => setKeyId(e.target.value)}
                    placeholder="rzp_live_xxxxxxxx or rzp_test_xxxxxxxx"
                    className="w-full px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-white placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Razorpay Key Secret
                  </label>
                  <input
                    type="password"
                    value={keySecret}
                    onChange={(e) => setKeySecret(e.target.value)}
                    placeholder="Enter your Razorpay key secret"
                    className="w-full px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-white placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Webhook Secret
                  </label>
                  <input
                    type="password"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    placeholder="Enter your webhook secret"
                    className="w-full px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-white placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-amber-400 mb-2">How to get credentials</h3>
                <ol className="text-sm text-amber-300/80 space-y-1 list-decimal list-inside">
                  <li>Login to Razorpay Dashboard</li>
                  <li>Go to Settings → API Keys</li>
                  <li>Generate keys if you haven&apos;t already</li>
                  <li>Copy Key ID and Key Secret</li>
                  <li>Go to Settings → Webhooks to get Webhook Secret</li>
                </ol>
              </div>

              <div className="flex gap-3">
                <GlowButton
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving || !keyId || !keySecret || !webhookSecret}
                >
                  {saving ? 'Testing & Saving...' : 'Save Configuration'}
                </GlowButton>
              </div>

              <p className="text-xs text-[var(--color-text-tertiary)] mt-4">
                Your credentials are encrypted before storage. We&apos;ll test them before saving.
              </p>
            </div>
        </>
      )}
    </div>
  )
}
