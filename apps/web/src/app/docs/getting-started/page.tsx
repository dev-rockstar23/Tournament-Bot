'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { staggerChildren, fadeUp } from '@/lib/motion'

// ─── Steps data ───────────────────────────────────────────────────────────────

const steps = [
  {
    number: '1',
    icon: '🤖',
    title: 'Invite the Bot',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #9f5bff 100%)',
    description:
      "Visit the bot invite link and add Legendary Esports to your server. You'll need 'Manage Server' permission.",
    action: (
      <Link
        href="/invite"
        className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-colors mt-3"
        style={{
          background: 'rgba(124,58,237,0.2)',
          border: '1px solid rgba(124,58,237,0.4)',
          color: '#9f5bff',
        }}
      >
        Invite Bot →
      </Link>
    ),
  },
  {
    number: '2',
    icon: '⚙️',
    title: 'Run /server setup',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
    description:
      'In your Discord server, run /server setup. The bot will guide you through configuring announcement, registration, and match channels, plus organizer and player roles.',
    action: null,
  },
  {
    number: '3',
    icon: '🏆',
    title: 'Create Your First Tournament',
    gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    description:
      'Use /tournament create to launch the 6-step wizard. Choose your game, format, participant limit, and prize pool.',
    action: (
      <Link
        href="/docs/tournaments/create"
        className="inline-flex items-center gap-1.5 text-sm font-medium mt-3"
        style={{ color: 'var(--color-accent-2)' }}
      >
        View the tournament creation guide →
      </Link>
    ),
  },
  {
    number: '4',
    icon: '🕐',
    title: 'Set Your Timezone',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
    description:
      "Timezone configuration is important for match scheduling. All times displayed to players use the server's configured timezone. Set it during /server setup.",
    action: null,
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GettingStartedPage() {
  return (
    <div>
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <p
          className="text-xs font-mono uppercase tracking-widest mb-3"
          style={{ color: 'var(--color-accent-2)', fontFamily: 'var(--font-jetbrains, monospace)' }}
        >
          Getting Started
        </p>
        <h1
          className="text-3xl sm:text-4xl font-black mb-2"
          style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)' }}
        >
          Getting Started
        </h1>
        <p className="mb-10 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Follow these four steps to get Legendary Esports up and running in your Discord server.
        </p>
      </motion.div>

      {/* Steps */}
      <motion.div
        className="flex flex-col gap-6 mb-12"
        variants={staggerChildren}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        {steps.map((step) => (
          <motion.div key={step.number} variants={fadeUp}>
            <GlassCard className="p-6">
              <div className="flex items-start gap-4">
                {/* Badge */}
                <div
                  className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-base font-black text-white"
                  style={{ background: step.gradient }}
                  aria-hidden="true"
                >
                  {step.number}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl" aria-hidden="true">{step.icon}</span>
                    <h2
                      className="text-lg font-black"
                      style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)' }}
                    >
                      {step.title}
                    </h2>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {step.description}
                  </p>
                  {step.action}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Bottom navigation links */}
      <div
        className="flex flex-wrap gap-4 pt-6 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <Link
          href="/docs/server-setup"
          className="text-sm font-medium transition-colors"
          style={{ color: 'var(--color-accent-2)' }}
        >
          Next: Server Setup →
        </Link>
        <Link
          href="/docs/discord-commands"
          className="text-sm font-medium transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Explore Discord Commands →
        </Link>
      </div>
    </div>
  )
}
