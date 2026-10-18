'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'

// ─── Command data ─────────────────────────────────────────────────────────────

const commands = [
  { command: '/server setup',           permission: 'Server Admin', description: 'Configure bot channels and roles',         example: '/server setup' },
  { command: '/server status',          permission: 'Server Admin', description: 'Show bot configuration status',            example: '/server status' },
  { command: '/server roles list',      permission: 'Server Admin', description: 'List configured roles',                    example: '/server roles list' },
  { command: '/tournament create',      permission: 'Organizer',    description: 'Create a new tournament with wizard',      example: '/tournament create' },
  { command: '/tournament list',        permission: 'Everyone',     description: 'List all tournaments',                     example: '/tournament list' },
  { command: '/tournament info',        permission: 'Everyone',     description: 'Show tournament details',                  example: '/tournament info name:Summer Cup' },
  { command: '/tournament standings',   permission: 'Everyone',     description: 'Show current standings',                   example: '/tournament standings name:Summer Cup' },
  { command: '/tournament publish',     permission: 'Organizer',    description: 'Open registration for a tournament',       example: '/tournament publish name:Summer Cup' },
  { command: '/tournament cancel',      permission: 'Organizer',    description: 'Cancel a tournament',                      example: '/tournament cancel name:Summer Cup' },
  { command: '/tournament participants',permission: 'Everyone',     description: 'List registered participants',             example: '/tournament participants name:Summer Cup' },
  { command: '/match schedule',         permission: 'Organizer',    description: 'Schedule a match between teams',           example: '/match schedule' },
  { command: '/match checkin',          permission: 'Player',       description: 'Check in for an upcoming match',           example: '/match checkin match_id:123' },
  { command: '/match room',             permission: 'Organizer',    description: 'Share room code for a match',              example: '/match room match_id:123' },
  { command: '/match result',           permission: 'Player',       description: 'Submit match result',                      example: '/match result match_id:123 score:2-1' },
  { command: '/match approve',          permission: 'Organizer',    description: 'Approve a submitted result',               example: '/match approve match_id:123' },
  { command: '/match dispute',          permission: 'Player',       description: 'Raise a dispute on a result',              example: '/match dispute match_id:123' },
  { command: '/register',               permission: 'Player',       description: 'Register for a tournament',                example: '/register name:Summer Cup' },
  { command: '/winners',                permission: 'Everyone',     description: 'Show tournament winners',                  example: '/winners name:Summer Cup' },
  { command: '/analytics',              permission: 'Everyone',     description: 'View player or tournament stats',          example: '/analytics player:@username' },
]

// ─── Permission badge colors ──────────────────────────────────────────────────

const permissionColor: Record<string, string> = {
  'Server Admin': '#ef4444',
  'Organizer':    '#f59e0b',
  'Player':       '#10b981',
  'Everyone':     '#06b6d4',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DiscordCommandsPage() {
  const [search, setSearch] = useState('')

  const filtered = commands.filter((cmd) => {
    const term = search.toLowerCase()
    return (
      cmd.command.toLowerCase().includes(term) ||
      cmd.description.toLowerCase().includes(term)
    )
  })

  return (
    <div>
      {/* Heading */}
      <h1
        className="text-3xl sm:text-4xl font-black mb-2"
        style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)' }}
      >
        Discord Commands
      </h1>
      <p className="mb-8 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Full reference for all {commands.length} slash commands. Use the search to filter by name or description.
      </p>

      {/* Search */}
      <div className="relative mb-6">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-sm select-none pointer-events-none"
          style={{ color: 'var(--color-text-muted)' }}
          aria-hidden="true"
        >
          🔍
        </span>
        <input
          type="search"
          placeholder="Search commands..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none border"
          style={{
            background: 'rgba(22,33,62,0.7)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-body)',
          }}
          aria-label="Search commands"
        />
      </div>

      {/* Table */}
      <div
        className="overflow-x-auto rounded-xl border"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <table
          className="w-full text-sm border-collapse"
          style={{ background: 'rgba(22,33,62,0.5)' }}
        >
          <thead>
            <tr
              className="text-left text-xs uppercase tracking-wider"
              style={{
                color: 'var(--color-text-muted)',
                borderBottom: '1px solid var(--color-border)',
                fontFamily: 'var(--font-jetbrains, monospace)',
              }}
            >
              <th className="px-4 py-3 font-medium">Command</th>
              <th className="px-4 py-3 font-medium">Permission</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Example Usage</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  No commands match &ldquo;{search}&rdquo;
                </td>
              </tr>
            ) : (
              filtered.map((cmd, i) => (
                <tr
                  key={cmd.command}
                  className="transition-colors"
                  style={{
                    borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
                    background: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLTableRowElement).style.background =
                      'rgba(124,58,237,0.07)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLTableRowElement).style.background = 'transparent'
                  }}
                >
                  {/* Command */}
                  <td className="px-4 py-3">
                    <code
                      className="text-xs px-2 py-1 rounded"
                      style={{
                        fontFamily: 'var(--font-jetbrains, monospace)',
                        background: 'rgba(124,58,237,0.15)',
                        color: '#9f5bff',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cmd.command}
                    </code>
                  </td>
                  {/* Permission */}
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: `${permissionColor[cmd.permission]}20`,
                        color: permissionColor[cmd.permission],
                        border: `1px solid ${permissionColor[cmd.permission]}40`,
                      }}
                    >
                      {cmd.permission}
                    </span>
                  </td>
                  {/* Description */}
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                    {cmd.description}
                  </td>
                  {/* Example */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <code
                      className="text-xs"
                      style={{
                        fontFamily: 'var(--font-jetbrains, monospace)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {cmd.example}
                    </code>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Result count */}
      <p className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Showing {filtered.length} of {commands.length} commands
      </p>
    </div>
  )
}
