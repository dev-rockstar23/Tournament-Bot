'use client'
import { useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'

// ─── Format data ──────────────────────────────────────────────────────────────

const formats = [
  {
    name: 'Format 1 — Simple',
    bestFor: 'Squad tournaments (4 players)',
    template: `Team Name: [Your Team Name]
@Player1 @Player2 @Player3 @Player4`,
    rules: [
      'Must include team name line',
      'Must have 4 @mentions',
    ],
  },
  {
    name: 'Format 2 — Captain Required',
    bestFor: 'Tournaments requiring a designated captain',
    template: `Team Name: [Your Team Name]
Team Captain: @Captain
Player 1: @Player1
Player 2: @Player2
Player 3: @Player3
Player 4: @Player4`,
    rules: [
      'Must include captain mention',
      'All 4 player slots required',
    ],
  },
  {
    name: 'Format 3 — Full Details',
    bestFor: 'Competitive tournaments needing verification',
    template: `Team Name: [Your Team Name]
Team Captain: @Captain
Player 1: @mention | IGN: [In-Game Name] | UID: [Player UID]
Player 2: @mention | IGN: [In-Game Name] | UID: [Player UID]
Player 3: @mention | IGN: [In-Game Name] | UID: [Player UID]
Player 4: @mention | IGN: [In-Game Name] | UID: [Player UID]`,
    rules: [
      'All IGN and UID fields required',
    ],
  },
  {
    name: 'Format 4 — With Substitute',
    bestFor: 'Tournaments allowing a bench player',
    template: `Team Name: [Your Team Name]
Team Captain: @Captain
Player 1: @Player1
Player 2: @Player2
Player 3: @Player3
Player 4: @Player4
Substitute: @Substitute (Optional)`,
    rules: [
      'Substitute is optional but must be a valid @mention if provided',
    ],
  },
  {
    name: 'Format 5 — COD 5-Player',
    bestFor: 'Call of Duty Mobile (5-player squads)',
    template: `Team Name: [Your Team Name]
Team Captain: @Captain
Player 1: @Player1
Player 2: @Player2
Player 3: @Player3
Player 4: @Player4
Player 5: @Player5
Substitute: @Substitute (Optional)`,
    rules: [
      '5 main players required',
      'Substitute optional',
    ],
  },
  {
    name: 'Format 6 — Full with Substitute',
    bestFor: 'Full verification with bench player',
    template: `Team Name: [Your Team Name]
Team Captain: @Captain
Player 1: @mention | IGN: [In-Game Name] | UID: [Player UID]
Player 2: @mention | IGN: [In-Game Name] | UID: [Player UID]
Player 3: @mention | IGN: [In-Game Name] | UID: [Player UID]
Player 4: @mention | IGN: [In-Game Name] | UID: [Player UID]
Player 5: @mention | IGN: [In-Game Name] | UID: [Player UID]
Substitute: @mention | IGN: [In-Game Name] | UID: [Player UID] (Optional)`,
    rules: [
      'All IGN/UID required for main players',
      'Substitute with full details if provided',
    ],
  },
]

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
      style={{
        background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(124,58,237,0.2)',
        border: `1px solid ${copied ? 'rgba(16,185,129,0.4)' : 'rgba(124,58,237,0.4)'}`,
        color: copied ? '#34d399' : '#9f5bff',
        fontFamily: 'var(--font-jetbrains, monospace)',
      }}
      aria-label={copied ? 'Copied!' : 'Copy template to clipboard'}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegistrationFormatsPage() {
  return (
    <div>
      <h1
        className="text-3xl sm:text-4xl font-black mb-2"
        style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)' }}
      >
        Registration Formats
      </h1>
      <p className="mb-10 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Choose the format that matches your tournament&apos;s requirements. Copy the template and paste it into your Discord registration channel configuration.
      </p>

      <div className="flex flex-col gap-8">
        {formats.map((fmt) => (
          <GlassCard key={fmt.name} className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
              <h2
                className="text-xl font-black"
                style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)' }}
              >
                {fmt.name}
              </h2>
              <CopyButton text={fmt.template} />
            </div>

            {/* Best for */}
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
              <span
                className="font-mono uppercase tracking-wider mr-1"
                style={{ color: 'var(--color-accent-2)', fontFamily: 'var(--font-jetbrains, monospace)' }}
              >
                Best for:
              </span>
              {fmt.bestFor}
            </p>

            {/* Template */}
            <pre
              className="rounded-xl p-4 text-sm overflow-x-auto mb-4"
              style={{
                fontFamily: 'var(--font-jetbrains, monospace)',
                background: '#0d1117',
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#e2e8f0',
                lineHeight: '1.7',
                whiteSpace: 'pre',
              }}
            >
              {fmt.template}
            </pre>

            {/* Validation rules */}
            <div>
              <p
                className="text-xs font-mono uppercase tracking-wider mb-2"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-jetbrains, monospace)' }}
              >
                Validation Rules
              </p>
              <ul className="space-y-1">
                {fmt.rules.map((rule) => (
                  <li
                    key={rule}
                    className="flex items-start gap-2 text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <span
                      className="text-green-400 flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
