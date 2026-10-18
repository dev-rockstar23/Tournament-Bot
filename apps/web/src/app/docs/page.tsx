'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonText } from '@/components/ui/NeonText'
import { GlowButton } from '@/components/ui/GlowButton'
import { staggerChildren, fadeUp } from '@/lib/motion'

export const dynamic = 'force-dynamic'

// ─── Quick start steps ────────────────────────────────────────────────────────

const quickStartSteps = [
  {
    number: '01',
    title: 'Invite Bot',
    description: 'Add the SHADØW TOURNAMENTS bot to your Discord server with Manage Server permissions.',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #9f5bff 100%)',
    cmd: '/invite',
    neon: 'violet' as const,
  },
  {
    number: '02',
    title: 'Server Setup',
    description: 'Run /server setup to configure announcement, registration, and match channels.',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
    cmd: '/server setup',
    neon: 'cyan' as const,
  },
  {
    number: '03',
    title: 'Create Tournament',
    description: 'Use /tournament create to launch the 6-step wizard — game, format, prize pool.',
    gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    cmd: '/tournament create',
    neon: 'green' as const,
  },
  {
    number: '04',
    title: 'Go Live',
    description: 'Publish with /tournament publish and players can register immediately.',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
    cmd: '/tournament publish',
    neon: 'violet' as const,
  },
]

// ─── Platform features ────────────────────────────────────────────────────────

const platformFeatures = [
  {
    icon: '🌐',
    title: 'Multi-Server',
    description: 'Run tournaments across multiple Discord servers independently',
    neonColor: 'cyan' as const,
  },
  {
    icon: '🎮',
    title: 'Discord-Native',
    description: 'Built entirely within Discord — no external apps needed',
    neonColor: 'violet' as const,
  },
  {
    icon: '🏆',
    title: 'Three Games',
    description: 'Supports Free Fire, COD Mobile, and BGMI',
    neonColor: 'cyan' as const,
  },
  {
    icon: '⚡',
    title: 'Real-Time',
    description: 'Live bracket updates and match notifications',
    neonColor: 'violet' as const,
  },
  {
    icon: '📊',
    title: 'Analytics',
    description: 'Player stats, win rates, and tournament history',
    neonColor: 'cyan' as const,
  },
  {
    icon: '🎬',
    title: 'OBS Overlay',
    description: 'Stream-ready overlays for your tournament broadcasts',
    neonColor: 'violet' as const,
  },
]

// ─── Docs section links ───────────────────────────────────────────────────────

const docLinks = [
  { href: '/docs/getting-started',       label: 'Getting Started',      desc: 'Set up the bot and run your first tournament',    icon: '⚡' },
  { href: '/docs/tournaments/create',    label: 'Create Tournament',    desc: 'Step-by-step tournament creation wizard guide',   icon: '🏆' },
  { href: '/docs/tournaments/formats',   label: 'Registration Formats', desc: 'Solo, duo, squad — picking the right format',     icon: '📋' },
  { href: '/docs/discord-commands',      label: 'Discord Commands',     desc: 'Full slash command reference with examples',      icon: '🤖' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  return (
    <div>
      {/* ── Hero ── */}
      <section id="overview" className="mb-14">
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <p
            className="text-xs font-mono uppercase tracking-widest mb-3"
            style={{ color: 'var(--color-neon-cyan)', letterSpacing: '0.25em' }}
          >
            // DOCUMENTATION
          </p>
          <h1
            className="text-4xl sm:text-5xl font-black mb-4 leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            SHADØW{' '}
            <NeonText as="span" color="violet" glitch>
              TOURNAMENTS
            </NeonText>
            <br />
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.65em', fontWeight: 400 }}>
              DOCS
            </span>
          </h1>
          <p
            className="text-base leading-relaxed mb-6"
            style={{ color: 'var(--color-text-secondary)', maxWidth: '520px' }}
          >
            Everything you need to run competitive esports tournaments on Discord.
            From bot setup to live OBS overlays.
          </p>
          <GlowButton variant="cyber" size="md" asChild>
            <Link href="/docs/getting-started">
              START HERE →
            </Link>
          </GlowButton>
        </motion.div>
      </section>

      {/* ── Quick access doc links ── */}
      <section className="mb-14">
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          variants={staggerChildren}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
        >
          {docLinks.map((link) => (
            <motion.div key={link.href} variants={fadeUp}>
              <Link href={link.href} className="block group">
                <GlassCard
                  className="p-5 flex gap-4 items-start"
                  neonColor="violet"
                  hover
                >
                  <span
                    aria-hidden="true"
                    className="text-2xl flex-shrink-0 mt-0.5"
                  >
                    {link.icon}
                  </span>
                  <div>
                    <p
                      className="font-bold text-sm mb-1 transition-colors"
                      style={{
                        fontFamily: 'var(--font-display)',
                        color: 'var(--color-text-primary)',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {link.label}
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      {link.desc}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="ml-auto flex-shrink-0 self-center text-sm transition-all"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    →
                  </span>
                </GlassCard>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Quick Start ── */}
      <section id="quick-start" className="mb-14">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-8"
        >
          <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--color-neon-violet)', letterSpacing: '0.2em' }}>
            // QUICK START
          </p>
          <h2 className="text-2xl font-black" style={{ fontFamily: 'var(--font-display)' }}>
            GET RUNNING IN 4 STEPS
          </h2>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-5"
          variants={staggerChildren}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {quickStartSteps.map((step) => (
            <motion.div key={step.number} variants={fadeUp}>
              <GlassCard className="p-5 flex gap-5 items-start" scanline>
                {/* Number badge */}
                <div
                  className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center font-black text-sm text-white"
                  style={{ background: step.gradient, boxShadow: `0 0 16px ${step.gradient.includes('#7c3aed') ? 'rgba(124,58,237,0.4)' : 'rgba(6,182,212,0.4)'}` }}
                  aria-hidden="true"
                >
                  {step.number}
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-bold text-white mb-1 text-sm"
                    style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                    {step.description}
                  </p>
                  {/* Command pill */}
                  <code
                    className="inline-block text-xs px-3 py-1 rounded-lg font-mono"
                    style={{
                      background: 'rgba(6,182,212,0.08)',
                      border: '1px solid rgba(6,182,212,0.2)',
                      color: 'var(--color-neon-cyan)',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {step.cmd}
                  </code>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Platform Features ── */}
      <section id="features">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-8"
        >
          <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--color-neon-cyan)', letterSpacing: '0.2em' }}>
            // PLATFORM CAPABILITIES
          </p>
          <h2 className="text-2xl font-black" style={{ fontFamily: 'var(--font-display)' }}>
            WHAT YOU GET
          </h2>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={staggerChildren}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {platformFeatures.map((feature) => (
            <motion.div key={feature.title} variants={fadeUp}>
              <GlassCard className="p-5 h-full" neonColor={feature.neonColor}>
                <div className="text-2xl mb-3" aria-hidden="true">
                  {feature.icon}
                </div>
                <h3
                  className="font-bold text-white mb-2 text-sm"
                  style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}
                >
                  {feature.title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {feature.description}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  )
}
