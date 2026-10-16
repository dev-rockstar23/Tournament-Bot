'use client'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { staggerChildren, fadeUp } from '@/lib/motion'

// ─── Quick start steps ────────────────────────────────────────────────────────

const quickStartSteps = [
  {
    number: '1',
    title: 'Invite Bot',
    description: 'Add the Legendary Esports bot to your Discord server',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #9f5bff 100%)',
  },
  {
    number: '2',
    title: 'Setup',
    description: 'Run /server setup to configure channels and roles',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
  },
  {
    number: '3',
    title: 'Create Tournament',
    description: 'Use /tournament create to launch your first tournament',
    gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
  },
  {
    number: '4',
    title: 'Go Live',
    description: 'Publish with /tournament publish and players can register',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
  },
]

// ─── Platform features ────────────────────────────────────────────────────────

const platformFeatures = [
  {
    icon: '🌐',
    title: 'Multi-Server',
    description: 'Run tournaments across multiple Discord servers independently',
  },
  {
    icon: '🎮',
    title: 'Discord-Native',
    description: 'Built entirely within Discord — no external apps needed',
  },
  {
    icon: '🏆',
    title: 'Three Games',
    description: 'Supports Free Fire, COD Mobile, and BGMI',
  },
  {
    icon: '⚡',
    title: 'Real-Time',
    description: 'Live bracket updates and match notifications',
  },
  {
    icon: '📊',
    title: 'Analytics',
    description: 'Player stats, win rates, and tournament history',
  },
  {
    icon: '🎬',
    title: 'OBS Overlay',
    description: 'Stream-ready overlays for your tournament broadcasts',
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  return (
    <div>
      {/* ── Hero ── */}
      <section id="overview" className="mb-16">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <p
            className="text-xs font-mono uppercase tracking-widest mb-3"
            style={{ color: 'var(--color-accent-2)', fontFamily: 'var(--font-jetbrains, monospace)' }}
          >
            Documentation
          </p>
          <h1
            className="text-4xl sm:text-5xl font-black mb-4 leading-tight"
            style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)' }}
          >
            Legendary Esports <span style={{ color: 'var(--color-accent)' }}>Docs</span>
          </h1>
          <p className="text-lg" style={{ color: 'var(--color-text-secondary)', maxWidth: '560px' }}>
            Everything you need to run competitive esports tournaments on Discord.
          </p>
        </motion.div>
      </section>

      {/* ── Quick Start ── */}
      <section id="quick-start" className="mb-16">
        <motion.h2
          className="text-2xl font-black mb-8"
          style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)' }}
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          Get Started in 4 Steps
        </motion.h2>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-6"
          variants={staggerChildren}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {quickStartSteps.map((step) => (
            <motion.div
              key={step.number}
              variants={fadeUp}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <GlassCard className="p-6 flex gap-5 items-start">
                {/* Circular numbered badge */}
                <div
                  className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-lg font-black text-white"
                  style={{ background: step.gradient }}
                  aria-hidden="true"
                >
                  {step.number}
                </div>
                <div>
                  <h3
                    className="font-bold text-white mb-1"
                    style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)' }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {step.description}
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Platform Features ── */}
      <section id="features">
        <motion.h2
          className="text-2xl font-black mb-8"
          style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)' }}
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          Platform Features
        </motion.h2>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          variants={staggerChildren}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {platformFeatures.map((feature) => (
            <motion.div key={feature.title} variants={fadeUp}>
              <GlassCard className="p-6 h-full">
                <div className="text-3xl mb-3" aria-hidden="true">
                  {feature.icon}
                </div>
                <h3
                  className="font-bold text-white mb-2"
                  style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)' }}
                >
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
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
