'use client'

import { useState, useEffect } from 'react'

interface PaymentConfig {
  id: string
  provider: string
  maskedKeyId: string
  hasKeySecret: boolean
  hasWebhookSecret: boolean
  isActive: boolean
  isVerified: boolean
  createdAt: string
  updatedAt: string
}

interface PaymentConfigPanelProps {
  guildId: string
  userId: string
}

export function PaymentConfigPanel({ guildId, userId }: PaymentConfigPanelProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [config, setConfig] = useState<PaymentConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    razorpayKeyId: '',
    razorpayKeySecret: '',
    razorpayWebhookSecret: '',
  })

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhooks/razorpay`

  // Fetch current config
  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch(`/api/servers/${guildId}/payment-config`)
        if (res.ok) {
          const data = await res.json()
          setConfigured(data.configured)
          if (data.configured) {
            setConfig(data.config)
          }
        }
      } catch (err) {
        console.error('Failed to fetch config:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [guildId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)

    try {
      const res = await fetch(`/api/servers/${guildId}/payment-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess('Payment configuration saved and verified successfully!')
        setConfigured(true)
        // Refetch config
        const configRes = await fetch(`/api/servers/${guildId}/payment-config`)
        if (configRes.ok) {
          const configData = await configRes.json()
          if (configData.configured) {
            setConfig(configData.config)
          }
        }
        // Clear form
        setFormData({
          razorpayKeyId: '',
          razorpayKeySecret: '',
          razorpayWebhookSecret: '',
        })
      } else {
        setError(data.message || data.error || 'Failed to save configuration')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!confirm('Are you sure you want to deactivate payment configuration?')) {
      return
    }

    setError(null)
    setSuccess(null)
    setSaving(true)

    try {
      const res = await fetch(`/api/servers/${guildId}/payment-config`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess('Payment configuration deactivated successfully!')
        setConfigured(false)
        setConfig(null)
      } else {
        setError(data.error || 'Failed to deactivate configuration')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white/5 rounded-lg p-6 text-white">
        <p>Loading payment configuration...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <h3 className="font-semibold text-blue-400 mb-2">Getting Started with Razorpay</h3>
        <ol className="text-sm text-white/70 space-y-2 list-decimal list-inside">
          <li>
            Log in to your{' '}
            <a
              href="https://dashboard.razorpay.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              Razorpay Dashboard
            </a>
          </li>
          <li>Navigate to Settings → API Keys to find your Key ID and Key Secret</li>
          <li>
            Go to Settings → Webhooks and add this URL:{' '}
            <code className="bg-black/30 px-2 py-1 rounded text-xs">{webhookUrl}</code>
          </li>
          <li>
            Select events: <code>payment.captured</code>, <code>payment.failed</code>,{' '}
            <code>payment.refunded</code>
          </li>
          <li>Copy the Webhook Secret and paste below</li>
        </ol>
      </div>

      {/* Status Badge */}
      {configured && config && (
        <div className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">Payment Configuration</span>
              {config.isVerified ? (
                <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded">
                  ✓ Verified
                </span>
              ) : (
                <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded">
                  ⚠ Not Verified
                </span>
              )}
              {config.isActive ? (
                <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded">
                  Active
                </span>
              ) : (
                <span className="bg-gray-500/20 text-gray-400 text-xs px-2 py-1 rounded">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-white/50 text-sm mt-1">Key ID: {config.maskedKeyId}</p>
          </div>
          <button
            onClick={handleDeactivate}
            disabled={saving}
            className="bg-red-500/20 text-red-400 px-4 py-2 rounded hover:bg-red-500/30 disabled:opacity-50"
          >
            Deactivate
          </button>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-green-400">
          {success}
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white/5 rounded-lg p-6">
        <h3 className="text-white font-semibold mb-4">
          {configured ? 'Update Razorpay Credentials' : 'Configure Razorpay Credentials'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/70 text-sm mb-2">
              Razorpay Key ID <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.razorpayKeyId}
              onChange={(e) =>
                setFormData({ ...formData, razorpayKeyId: e.target.value })
              }
              required
              placeholder="rzp_test_xxxxxxxxxxxx or rzp_live_xxxxxxxxxxxx"
              className="w-full bg-black/30 text-white border border-white/10 rounded px-4 py-2 focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-2">
              Razorpay Key Secret <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              value={formData.razorpayKeySecret}
              onChange={(e) =>
                setFormData({ ...formData, razorpayKeySecret: e.target.value })
              }
              required
              placeholder="Enter your Razorpay Key Secret"
              className="w-full bg-black/30 text-white border border-white/10 rounded px-4 py-2 focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-2">
              Razorpay Webhook Secret <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              value={formData.razorpayWebhookSecret}
              onChange={(e) =>
                setFormData({ ...formData, razorpayWebhookSecret: e.target.value })
              }
              required
              placeholder="Enter your Razorpay Webhook Secret"
              className="w-full bg-black/30 text-white border border-white/10 rounded px-4 py-2 focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3 text-sm text-yellow-400">
            ⚠ Credentials will be encrypted and stored securely. Never share your secrets
            with anyone.
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : configured ? 'Update Configuration' : 'Save Configuration'}
          </button>
        </form>
      </div>
    </div>
  )
}
