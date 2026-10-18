'use client'

export const dynamic = 'force-dynamic'

import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { staggerChildren, fadeUp } from '@/lib/motion'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WizardField {
  name: string
  type: string
  options?: string
  note?: string
}

interface WizardStep {
  number: string
  title: string
  gradient: string
  fields: WizardField[]
  example: string
}

// ─── Wizard steps data ────────────────────────────────────────────────────────

const wizardSteps: WizardStep[] = [
  {
    number: '1',
    title: 'Basic Info',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #9f5bff 100%)',
    fields: [
      { name: 'Tournament Name', type: 'text' },
      { name: 'Game', type: 'select', options: 'Free Fire / COD Mobile / BGMI' },
      { name: 'Format', type: 'select', options: 'Solo / Duo / Squad' },
      { name: 'Start Date/Time', type: 'datetime' },
    ],
    example: 'Name: "Summer Cup 2025", Game: Free Fire, Format: Squad',
  },
  {
    number: '2',
    title: 'Registration',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
    fields: [
      { name: 'Max Participants', type: 'number' },
      { name: 'Registration Format', type: 'select', options: '1 – 6 (see Registration Formats guide)' },
      { name: 'Registration Deadline', type: 'datetime' },
    ],
    example: 'Max: 32 teams, Format: 2 (Captain Required)',
  },
  {
    number: '3',
    title: 'Match Settings',
    gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    fields: [
      { name: 'Check-in Window', type: 'number', note: 'minutes' },
      { name: 'Best of', type: 'select', options: '1 / 3 / 5' },
      { name: 'Room Creation Method', type: 'select', options: 'Manual / Auto' },
    ],
    example: 'Check-in: 15 min, Best of 3',
  },
  {
    number: '4',
    title: 'Prizes',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
    fields: [
      { name: 'Prize Pool Description', type: 'text' },
      { name: '1st Place Prize', type: 'text' },
      { name: '2nd Place Prize', type: 'text' },
      { name: '3rd Place Prize', type: 'text' },
    ],
    example: '1st: ₹500, 2nd: ₹250, 3rd: ₹100',
  },
  {
    number: '5',
    title: 'Channels',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
    fields: [
      { name: 'Announcement Channel', type: 'channel' },
      { name: 'Registration Channel', type: 'channel' },
      { name: 'Match Channel', type: 'channel' },
    ],
    example: '#tournaments, #register, #matches',
  },
  {
    number: '6',
    title: 'Review & Publish',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
    fields: [
      { name: 'Summary of all fields', type: 'readonly' },
      { name: 'Publish Button', type: 'action', note: 'Triggers /tournament publish' },
    ],
    example: 'Review all settings, then publish with /tournament publish',
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TournamentCreatePage() {
  return (
    <div>
      <h1
        className="text-3xl sm:text-4xl font-black mb-2"
        style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)' }}
      >
        Create Tournament
      </h1>
      <p className="mb-10 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Walk through the 6-step wizard that appears when you run{' '}
        <code
          className="px-1.5 py-0.5 rounded text-xs"
          style={{
            fontFamily: 'var(--font-jetbrains, monospace)',
            background: 'rgba(124,58,237,0.15)',
            color: '#9f5bff',
          }}
        >
          /tournament create
        </code>{' '}
        in Discord.
      </p>

      <motion.div
        className="flex flex-col gap-6"
        variants={staggerChildren}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        {wizardSteps.map((step) => (
          <motion.div
            key={step.number}
            variants={fadeUp}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <GlassCard className="p-6">
              <div className="flex items-center gap-4 mb-5">
                {/* Step badge */}
                <div
                  className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-base font-black text-white"
                  style={{ background: step.gradient }}
                  aria-hidden="true"
                >
                  {step.number}
                </div>
                <h2
                  className="text-xl font-black"
                  style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)' }}
                >
                  {step.title}
                </h2>
              </div>

              {/* Fields */}
              <ul className="mb-4 space-y-1.5">
                {step.fields.map((field) => (
                  <li
                    key={field.name}
                    className="flex items-start gap-2 text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <span
                      className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: 'var(--color-accent)', marginTop: '7px' }}
                      aria-hidden="true"
                    />
                    <span>
                      <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {field.name}
                      </span>
                      {field.options && (
                        <span className="ml-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          — {field.options}
                        </span>
                      )}
                      {field.note && (
                        <span className="ml-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          ({field.note})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Example */}
              <div
                className="rounded-lg px-4 py-3 text-sm"
                style={{
                  background: 'rgba(124,58,237,0.08)',
                  border: '1px solid rgba(124,58,237,0.2)',
                }}
              >
                <span
                  className="text-xs font-mono uppercase tracking-widest mr-2"
                  style={{ color: 'var(--color-accent-2)', fontFamily: 'var(--font-jetbrains, monospace)' }}
                >
                  Example:
                </span>
                <code
                  className="text-sm"
                  style={{
                    fontFamily: 'var(--font-jetbrains, monospace)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {step.example}
                </code>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
