'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── IANA timezone list (subset of common zones) ──────────────────────────────
const TIMEZONES: string[] = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Seoul',
  'Australia/Sydney',
  'Pacific/Auckland',
]

const TABS = ['General', 'Discord Channels', 'Staff', 'Integrations'] as const
type Tab = (typeof TABS)[number]

// ─── Props ────────────────────────────────────────────────────────────────────

export interface InitialSettings {
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

interface ServerSettingsPanelProps {
  guildId: string
  initialSettings: InitialSettings
}

// ─── Channel type definition ──────────────────────────────────────────────────

interface DiscordChannel {
  id: string
  name: string
}

// ─── Role binding type ────────────────────────────────────────────────────────

interface RoleBinding {
  id: string
  discordRoleId: string
  discordRoleName: string
  appRole: string
}

interface DiscordRole {
  id: string
  name: string
}

// ─── App roles available for binding ─────────────────────────────────────────

const APP_ROLES = [
  { value: 'VIEWER', label: 'Viewer' },
  { value: 'PLAYER', label: 'Player' },
  { value: 'REFEREE', label: 'Referee' },
  { value: 'TOURNAMENT_MANAGER', label: 'Tournament Manager' },
  { value: 'SERVER_ADMIN', label: 'Server Admin' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function ServerSettingsPanel({ guildId, initialSettings }: ServerSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('General')

  // ── General tab state ──────────────────────────────────────────────────────
  const [timezone, setTimezone] = useState(initialSettings.timezone)
  const [accentColor, setAccentColor] = useState(initialSettings.accentColor)
  const [logoUrl, setLogoUrl] = useState(initialSettings.logoUrl ?? '')
  const [savingGeneral, setSavingGeneral] = useState(false)
  const [generalMsg, setGeneralMsg] = useState<string | null>(null)

  // ── Channels tab state ─────────────────────────────────────────────────────
  const [channels, setChannels] = useState<DiscordChannel[]>([])
  const [channelsLoading, setChannelsLoading] = useState(false)
  const [announcementChannelId, setAnnouncementChannelId] = useState(
    initialSettings.announcementChannelId ?? '',
  )
  const [matchChannelId, setMatchChannelId] = useState(
    initialSettings.matchChannelId ?? '',
  )
  const [resultsChannelId, setResultsChannelId] = useState(
    initialSettings.resultsChannelId ?? '',
  )
  const [disputesChannelId, setDisputesChannelId] = useState(
    initialSettings.disputesChannelId ?? '',
  )
  const [adminChannelId, setAdminChannelId] = useState(
    initialSettings.adminChannelId ?? '',
  )
  const [savingChannels, setSavingChannels] = useState(false)
  const [channelsMsg, setChannelsMsg] = useState<string | null>(null)

  // ── Staff tab state ────────────────────────────────────────────────────────
  const [roleBindings, setRoleBindings] = useState<RoleBinding[]>([])
  const [discordRoles, setDiscordRoles] = useState<DiscordRole[]>([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [newRoleId, setNewRoleId] = useState('')
  const [newAppRole, setNewAppRole] = useState('PLAYER')
  const [staffMsg, setStaffMsg] = useState<string | null>(null)
  const [savingStaff, setSavingStaff] = useState(false)

  // ── Integrations tab state ─────────────────────────────────────────────────
  const [hasOverlayToken, setHasOverlayToken] = useState(initialSettings.hasOverlayToken)
  const [overlayTokenTail, setOverlayTokenTail] = useState(
    initialSettings.overlayTokenTail ?? '',
  )
  const [generatingToken, setGeneratingToken] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [integrationsMsg, setIntegrationsMsg] = useState<string | null>(null)

  // ── Apply accent color on mount and changes ────────────────────────────────
  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', accentColor)
  }, [accentColor])

  // ── Logo upload handler ────────────────────────────────────────────────────
  const handleLogoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload/banner', { method: 'POST', body: form })
      if (res.ok) {
        const data = (await res.json()) as { url?: string }
        if (data.url) setLogoUrl(data.url)
      }
    },
    [],
  )

  // ── Save general settings ──────────────────────────────────────────────────
  const saveGeneral = async () => {
    setSavingGeneral(true)
    setGeneralMsg(null)
    try {
      const res = await fetch(`/api/servers/${guildId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timezone,
          accentColor,
          logoUrl: logoUrl || null,
        }),
      })
      if (res.ok) {
        setGeneralMsg('Settings saved.')
      } else {
        const err = (await res.json()) as { error?: string }
        setGeneralMsg(err.error ?? 'Failed to save.')
      }
    } catch {
      setGeneralMsg('Network error.')
    } finally {
      setSavingGeneral(false)
    }
  }

  // ── Load channels when tab opens ───────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'Discord Channels') return
    if (channels.length > 0) return
    setChannelsLoading(true)
    fetch(`/api/servers/${guildId}/channels`)
      .then((r) => r.json())
      .then((data: { channels?: DiscordChannel[] }) => {
        setChannels(data.channels ?? [])
      })
      .catch(() => { /* ignore */ })
      .finally(() => setChannelsLoading(false))
  }, [activeTab, guildId, channels.length])

  // ── Save channel settings ──────────────────────────────────────────────────
  const saveChannels = async () => {
    setSavingChannels(true)
    setChannelsMsg(null)
    try {
      const res = await fetch(`/api/servers/${guildId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          announcementChannelId: announcementChannelId || null,
          matchChannelId: matchChannelId || null,
          resultsChannelId: resultsChannelId || null,
          disputesChannelId: disputesChannelId || null,
          adminChannelId: adminChannelId || null,
        }),
      })
      if (res.ok) {
        setChannelsMsg('Channels saved.')
      } else {
        const err = (await res.json()) as { error?: string }
        setChannelsMsg(err.error ?? 'Failed to save.')
      }
    } catch {
      setChannelsMsg('Network error.')
    } finally {
      setSavingChannels(false)
    }
  }

  // ── Load staff data when tab opens ────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'Staff') return
    if (staffLoading) return
    setStaffLoading(true)
    Promise.all([
      fetch(`/api/servers/${guildId}/roles`).then((r) => r.json()),
      fetch(`/api/servers/${guildId}/admin/roles`).then((r) => r.json()).catch(() => ({ bindings: [] })),
    ])
      .then(([rolesData, bindingsData]: [{ roles?: DiscordRole[] }, { bindings?: RoleBinding[] }]) => {
        setDiscordRoles(rolesData.roles ?? [])
        setRoleBindings(bindingsData.bindings ?? [])
      })
      .catch(() => { /* ignore */ })
      .finally(() => setStaffLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // ── Add role binding ───────────────────────────────────────────────────────
  const addBinding = async () => {
    if (!newRoleId) return
    setSavingStaff(true)
    setStaffMsg(null)
    const role = discordRoles.find((r) => r.id === newRoleId)
    if (!role) {
      setSavingStaff(false)
      return
    }
    try {
      const res = await fetch(`/api/servers/${guildId}/admin/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordRoleId: newRoleId,
          discordRoleName: role.name,
          appRole: newAppRole,
        }),
      })
      if (res.ok) {
        const data = (await res.json()) as { binding?: RoleBinding }
        if (data.binding) {
          setRoleBindings((prev) => [...prev, data.binding!])
        }
        setStaffMsg('Role binding added.')
        setNewRoleId('')
      } else {
        const err = (await res.json()) as { error?: string }
        setStaffMsg(err.error ?? 'Failed to add binding.')
      }
    } catch {
      setStaffMsg('Network error.')
    } finally {
      setSavingStaff(false)
    }
  }

  // ── Remove role binding ────────────────────────────────────────────────────
  const removeBinding = async (bindingId: string) => {
    setSavingStaff(true)
    setStaffMsg(null)
    try {
      const res = await fetch(`/api/servers/${guildId}/admin/roles/${bindingId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setRoleBindings((prev) => prev.filter((b) => b.id !== bindingId))
        setStaffMsg('Binding removed.')
      } else {
        setStaffMsg('Failed to remove binding.')
      }
    } catch {
      setStaffMsg('Network error.')
    } finally {
      setSavingStaff(false)
    }
  }

  // ── Generate overlay token ─────────────────────────────────────────────────
  const generateToken = async () => {
    setGeneratingToken(true)
    setIntegrationsMsg(null)
    setNewToken(null)
    try {
      const res = await fetch(`/api/servers/${guildId}/overlay-token`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = (await res.json()) as { token: string }
        setNewToken(data.token)
        setOverlayTokenTail(data.token.slice(-8))
        setHasOverlayToken(true)
        setIntegrationsMsg('Token generated. Copy it now — it will not be shown again.')
      } else {
        const err = (await res.json()) as { error?: string }
        setIntegrationsMsg(err.error ?? 'Failed to generate token.')
      }
    } catch {
      setIntegrationsMsg('Network error.')
    } finally {
      setGeneratingToken(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="rounded-xl border border-white/10 overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-secondary, rgba(15,15,25,0.95))' }}
    >
      {/* Tab bar */}
      <div className="flex border-b border-white/10 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={[
              'px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors',
              activeTab === tab
                ? 'border-b-2 border-[var(--color-accent,#7c3aed)] text-white'
                : 'text-white/50 hover:text-white',
            ].join(' ')}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6 space-y-6">

        {/* ── GENERAL ──────────────────────────────────────────────────── */}
        {activeTab === 'General' && (
          <div className="space-y-6 max-w-xl">
            {/* Server name (display only) */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-white/70">Server Name</label>
              <p className="text-white text-base">{initialSettings.name}</p>
            </div>

            {/* Timezone selector */}
            <div className="space-y-1">
              <label htmlFor="timezone" className="block text-sm font-medium text-white/70">
                Timezone
              </label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent,#7c3aed)]"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz} className="bg-gray-900">
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            {/* Accent color picker */}
            <div className="space-y-2">
              <label htmlFor="accentColor" className="block text-sm font-medium text-white/70">
                Accent Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="accentColor"
                  type="color"
                  value={accentColor}
                  onChange={(e) => {
                    setAccentColor(e.target.value)
                    document.documentElement.style.setProperty('--color-accent', e.target.value)
                  }}
                  className="h-10 w-16 rounded cursor-pointer border border-white/10 bg-transparent p-0.5"
                />
                <span className="text-sm text-white/50 font-mono">{accentColor}</span>
                {/* Live preview swatch */}
                <div
                  className="h-8 w-8 rounded-full border border-white/20"
                  style={{ backgroundColor: accentColor }}
                  aria-label="Accent color preview"
                />
              </div>
            </div>

            {/* Logo upload */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/70">Server Logo</label>
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Server logo"
                  className="h-16 w-16 rounded-lg object-cover border border-white/10"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="text-sm text-white/60 file:mr-3 file:rounded file:border-0 file:bg-violet-700 file:px-3 file:py-1.5 file:text-sm file:text-white file:cursor-pointer hover:file:bg-violet-600"
                aria-label="Upload server logo"
              />
              {logoUrl && (
                <p className="text-xs text-white/40 break-all">{logoUrl}</p>
              )}
            </div>

            <button
              type="button"
              onClick={saveGeneral}
              disabled={savingGeneral}
              className="rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent,#7c3aed)' }}
            >
              {savingGeneral ? 'Saving…' : 'Save General Settings'}
            </button>

            {generalMsg && (
              <p className="text-sm text-white/60">{generalMsg}</p>
            )}
          </div>
        )}

        {/* ── DISCORD CHANNELS ─────────────────────────────────────────── */}
        {activeTab === 'Discord Channels' && (
          <div className="space-y-6 max-w-xl">
            {channelsLoading ? (
              <p className="text-white/40 text-sm">Loading channels…</p>
            ) : (
              <>
                {(
                  [
                    { id: 'announcement', label: 'Announcement Channel', value: announcementChannelId, set: setAnnouncementChannelId },
                    { id: 'match', label: 'Match Channel', value: matchChannelId, set: setMatchChannelId },
                    { id: 'results', label: 'Results Channel', value: resultsChannelId, set: setResultsChannelId },
                    { id: 'disputes', label: 'Disputes Channel', value: disputesChannelId, set: setDisputesChannelId },
                    { id: 'admin', label: 'Admin Channel', value: adminChannelId, set: setAdminChannelId },
                  ] as const
                ).map(({ id, label, value, set }) => (
                  <div key={id} className="space-y-1">
                    <label htmlFor={`channel-${id}`} className="block text-sm font-medium text-white/70">
                      {label}
                    </label>
                    <select
                      id={`channel-${id}`}
                      value={value}
                      onChange={(e) => (set as (v: string) => void)(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent,#7c3aed)]"
                    >
                      <option value="" className="bg-gray-900">— None —</option>
                      {channels.map((ch) => (
                        <option key={ch.id} value={ch.id} className="bg-gray-900">
                          #{ch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={saveChannels}
                  disabled={savingChannels}
                  className="rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-accent,#7c3aed)' }}
                >
                  {savingChannels ? 'Saving…' : 'Save Channel Settings'}
                </button>

                {channelsMsg && (
                  <p className="text-sm text-white/60">{channelsMsg}</p>
                )}
              </>
            )}
          </div>
        )}

        {/* ── STAFF ────────────────────────────────────────────────────── */}
        {activeTab === 'Staff' && (
          <div className="space-y-6">
            {staffLoading ? (
              <p className="text-white/40 text-sm">Loading staff roles…</p>
            ) : (
              <>
                {/* Role bindings table */}
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                          Discord Role
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                          App Role
                        </th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {roleBindings.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-6 text-center text-white/30">
                            No role bindings configured.
                          </td>
                        </tr>
                      )}
                      {roleBindings.map((binding) => (
                        <tr key={binding.id} className="border-b border-white/5">
                          <td className="px-4 py-3 text-white">{binding.discordRoleName}</td>
                          <td className="px-4 py-3 text-white/70">
                            {APP_ROLES.find((r) => r.value === binding.appRole)?.label ?? binding.appRole}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeBinding(binding.id)}
                              disabled={savingStaff}
                              className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add binding form */}
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1 flex-1 min-w-40">
                    <label htmlFor="newRoleId" className="block text-xs text-white/50">
                      Discord Role
                    </label>
                    <select
                      id="newRoleId"
                      value={newRoleId}
                      onChange={(e) => setNewRoleId(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent,#7c3aed)]"
                    >
                      <option value="" className="bg-gray-900">Select a role…</option>
                      {discordRoles.map((r) => (
                        <option key={r.id} value={r.id} className="bg-gray-900">
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 flex-1 min-w-40">
                    <label htmlFor="newAppRole" className="block text-xs text-white/50">
                      App Role
                    </label>
                    <select
                      id="newAppRole"
                      value={newAppRole}
                      onChange={(e) => setNewAppRole(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent,#7c3aed)]"
                    >
                      {APP_ROLES.map((r) => (
                        <option key={r.value} value={r.value} className="bg-gray-900">
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={addBinding}
                    disabled={savingStaff || !newRoleId}
                    className="rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-accent,#7c3aed)' }}
                  >
                    {savingStaff ? 'Saving…' : 'Add Binding'}
                  </button>
                </div>

                {staffMsg && (
                  <p className="text-sm text-white/60">{staffMsg}</p>
                )}
              </>
            )}
          </div>
        )}

        {/* ── INTEGRATIONS ─────────────────────────────────────────────── */}
        {activeTab === 'Integrations' && (
          <div className="space-y-6 max-w-xl">
            {/* Overlay token */}
            <div className="rounded-lg border border-white/10 p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Overlay Token</h3>
                <p className="text-xs text-white/40 mt-0.5">
                  Used to authenticate the live overlay with this server.
                </p>
              </div>

              {hasOverlayToken && !newToken && (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-white/60">
                    ••••••••••••••••••••••••{overlayTokenTail}
                  </span>
                </div>
              )}

              {/* Show full token immediately after generation */}
              {newToken && (
                <div className="rounded border border-yellow-500/30 bg-yellow-500/10 p-3">
                  <p className="text-xs text-yellow-400 mb-1 font-medium">
                    Copy this token now — it will not be shown again.
                  </p>
                  <code className="block text-xs font-mono text-yellow-300 break-all select-all">
                    {newToken}
                  </code>
                </div>
              )}

              <button
                type="button"
                onClick={generateToken}
                disabled={generatingToken}
                className="rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent,#7c3aed)' }}
              >
                {generatingToken
                  ? 'Generating…'
                  : hasOverlayToken
                  ? 'Regenerate Token'
                  : 'Generate Token'}
              </button>

              {integrationsMsg && (
                <p className="text-sm text-white/60">{integrationsMsg}</p>
              )}
            </div>

            {/* Integration health status */}
            <div className="rounded-lg border border-white/10 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">Integration Health</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: 'var(--color-accent,#7c3aed)' }}
                    aria-hidden="true"
                  />
                  <span className="text-white/70">Overlay</span>
                  <span className="ml-auto text-white/40 text-xs">
                    {hasOverlayToken ? 'Token configured' : 'No token'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
                  <span className="text-white/70">Discord Bot</span>
                  <span className="ml-auto text-white/40 text-xs">Connected</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
