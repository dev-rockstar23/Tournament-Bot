'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlowButton } from '@/components/ui/GlowButton'
import Navigation from '@/components/ui/Navigation'
import HeroSceneWrapper from '@/components/three/HeroSceneWrapper'
import { fadeUp, fadeIn, staggerChildren } from '@/lib/motion'

// ─── Feature data ────────────────────────────────────────────────────────────

const features = [
  {
    icon: '🎮',
    title: 'Discord-Native',
    description:
      'Built from the ground up for Discord. Every tournament lives in your server, with roles, channels, and notifications you already have.',
  },
  {
    icon: '🏆',
    title: 'Multi-Game Support',
    description:
      'Full support for BGMI, Free Fire, and COD Mobile — each with game-specific scoring, formats, and leaderboards.',
  },
  {
    icon: '⚡',
    title: 'Real-Time Sync',
    description:
      'Two-way sync between Discord and the web dashboard. Changes anywhere reflect everywhere, instantly.',
  },
]

// ─── Game data ────────────────────────────────────────────────────────────────

const games = [
  {
    name: 'BGMI',
    modes: 'Battle Royale • Clash Squad',
    gradient: 'linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(22,33,62,0.8) 100%)',
    accentColor: '#7c3aed',
    emoji: '🇮🇳',
  },
  {
    name: 'Free Fire',
    modes: 'Battle Royale • Clash Squad • Lone Wolf',
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.25) 0%, rgba(22,33,62,0.8) 100%)',
    accentColor: '#ef4444',
    emoji: '🔥',
  },
  {
    name: 'COD Mobile',
    modes: 'Multiplayer • Battle Royale',
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.25) 0%, rgba(22,33,62,0.8) 100%)',
    accentColor: '#10b981',
    emoji: '💥',
  },
]

// ─── Steps ────────────────────────────────────────────────────────────────────

const steps = [
  {
    badge: '01',
    icon: '🔑',
    title: 'Login with Discord',
    description: 'Authorize with your Discord account to see all your servers and tournaments',
  },
  {
    badge: '02',
    icon: '🏰',
    title: 'Select Your Server',
    description: 'Pick the server you want to run tournaments on. Use /server setup to configure channels and roles',
  },
  {
    badge: '03',
    icon: '🏆',
    title: 'Run Tournaments',
    description: 'Create, publish, and manage full tournament brackets directly from Discord or the web dashboard',
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <Navigation />

      {/* ── Section 1: Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* 3D Background */}
        <div className="absolute inset-0 z-0">
          <HeroSceneWrapper />
        </div>

        {/* Gradient overlay */}
        <div
          className="absolute inset-0 z-10"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(10,10,15,0.3) 0%, rgba(10,10,15,0.75) 60%, rgba(10,10,15,0.98) 100%)',
          }}
          aria-hidden="true"
        />

        {/* Hero content */}
        <motion.div
          className="relative z-20 text-center px-4 max-w-4xl mx-auto"
          variants={staggerChildren}
          initial="hidden"
          animate="visible"
        >
          <motion.p
            variants={fadeIn}
            className="text-xs font-mono uppercase tracking-widest text-[#22d3ee] mb-4"
            style={{ fontFamily: 'var(--font-jetbrains, monospace)' }}
          >
            Multi-Server Esports Platform
          </motion.p>

          <motion.h1
            variants={fadeUp}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-6 leading-none"
            style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)' }}
          >
            LEGENDARY{' '}
            <span className="text-[#7c3aed]">ESPORTS</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-lg sm:text-xl text-[#94a3b8] mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Discord-native tournament management built for competitive communities. Run BGMI, Free Fire, and COD Mobile tournaments without ever leaving Discord.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row gap-4 items-center justify-center"
          >
            <GlowButton variant="primary" size="lg" asChild>
              <Link href="/api/auth/login" className="no-underline text-white">
                Login with Discord
              </Link>
            </GlowButton>
            <GlowButton variant="ghost" size="lg" asChild>
              <Link href="/docs" className="no-underline text-white">
                View Docs
              </Link>
            </GlowButton>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Section 2: Features ── */}
      <section className="py-24 px-4" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            <h2
              className="text-3xl sm:text-4xl font-black text-white mb-4"
              style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)' }}
            >
              BUILT DIFFERENT
            </h2>
            <p className="text-[#94a3b8] max-w-xl mx-auto">
              Every feature designed around how esports communities actually work.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={staggerChildren}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={fadeUp}>
                <GlassCard className="p-8 h-full">
                  <div className="text-4xl mb-4" aria-hidden="true">
                    {feature.icon}
                  </div>
                  <h3
                    className="text-xl font-bold text-white mb-3"
                    style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)' }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-[#94a3b8] leading-relaxed">{feature.description}</p>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Section 3: Games ── */}
      <section className="py-24 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            <h2
              className="text-3xl sm:text-4xl font-black text-white mb-4"
              style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)' }}
            >
              SUPPORTED GAMES
            </h2>
            <p className="text-[#94a3b8] max-w-xl mx-auto">
              Tailored tournament formats and scoring for each game.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={staggerChildren}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            {games.map((game) => (
              <motion.div key={game.name} variants={fadeUp}>
                <GlassCard
                  className="p-8 h-full"
                  style={{ background: game.gradient }}
                >
                  <div className="text-5xl mb-4" aria-hidden="true">
                    {game.emoji}
                  </div>
                  <h3
                    className="text-2xl font-black mb-3"
                    style={{
                      fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)',
                      color: game.accentColor,
                    }}
                  >
                    {game.name}
                  </h3>
                  <p className="text-[#94a3b8] text-sm">{game.modes}</p>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Section 4: How It Works ── */}
      <section className="py-24 px-4" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            <h2
              className="text-3xl sm:text-4xl font-black text-white mb-4"
              style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)' }}
            >
              HOW IT WORKS
            </h2>
            <p className="text-[#94a3b8] max-w-xl mx-auto">
              Three simple steps to run your first tournament.
            </p>
          </motion.div>

          <motion.div
            className="relative grid grid-cols-1 md:grid-cols-3 gap-8"
            variants={staggerChildren}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            {/* Horizontal connecting line (desktop only) */}
            <div
              className="hidden md:block absolute top-10 left-[calc(16.67%)] right-[calc(16.67%)] h-px"
              style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.5), rgba(124,58,237,0.2), rgba(124,58,237,0.5))' }}
              aria-hidden="true"
            />

            {steps.map((step) => (
              <motion.div key={step.badge} variants={fadeUp} className="flex flex-col items-center text-center">
                {/* Numbered badge */}
                <div
                  className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center mb-6 border-2 border-[#7c3aed]/40"
                  style={{ background: 'rgba(124,58,237,0.15)' }}
                >
                  <span
                    className="text-2xl font-black text-[#7c3aed]"
                    style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)' }}
                  >
                    {step.badge}
                  </span>
                </div>

                <div className="text-3xl mb-3" aria-hidden="true">
                  {step.icon}
                </div>

                <h3
                  className="text-lg font-bold text-white mb-3"
                  style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)' }}
                >
                  {step.title}
                </h3>
                <p className="text-[#94a3b8] text-sm leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Section 5: Footer ── */}
      <footer
        className="py-16 px-4 border-t border-white/5"
        style={{ backgroundColor: '#050508' }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center gap-6">
            {/* Brand */}
            <span
              className="text-2xl font-black tracking-widest text-white"
              style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)' }}
            >
              LEGENDARY <span className="text-[#7c3aed]">ESPORTS</span>
            </span>

            <p className="text-[#64748b] text-sm">
              Built for competitive gaming communities
            </p>

            {/* Footer links */}
            <nav aria-label="Footer navigation" className="flex flex-wrap gap-6 justify-center">
              {[
                { href: '/privacy', label: 'Privacy' },
                { href: '/terms', label: 'Terms' },
                { href: '/docs', label: 'Docs' },
                { href: 'https://discord.gg', label: 'Discord' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-[#64748b] hover:text-[#94a3b8] transition-colors"
                  {...(link.href.startsWith('https') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <p className="text-xs text-[#475569]">
              © {new Date().getFullYear()} Legendary Esports. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  )
}
