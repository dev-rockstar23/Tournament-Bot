'use client'
import Link from 'next/link'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Lock, ChevronDown, Server, Cpu, Zap } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlowButton } from '@/components/ui/GlowButton'
import { NeonText } from '@/components/ui/NeonText'
import { StatusPulse } from '@/components/ui/StatusPulse'
import Navigation from '@/components/ui/Navigation'
import { fadeUp, fadeIn, staggerChildren } from '@/lib/motion'

// ─── Feature cards ────────────────────────────────────────────────────────────

const featureCards = [
  {
    icon: Server,
    title: 'One Server. One Truth.',
    description:
      'Single source of truth for all guild state. Every match, roster, and bracket is cryptographically anchored.',
    code: '#F001',
    color: 'violet' as const,
  },
  {
    icon: Cpu,
    title: 'Hardware Integrity',
    description:
      'Room credentials are ephemeral and zero-knowledge. Credentials never touch a third-party relay.',
    code: '#F002',
    color: 'cyan' as const,
  },
  {
    icon: Zap,
    title: 'Escrow Guaranteed',
    description:
      'Prize escrow is non-custodial. Funds are released only after on-chain attestation of match results.',
    code: '#F003',
    color: 'violet' as const,
  },
]

// ─── Stats row ────────────────────────────────────────────────────────────────

const stats = [
  { value: '0.08ms', label: 'AUTH LATENCY' },
  { value: '3,420+', label: 'SYNCED GUILDS' },
  { value: '100%', label: 'NON-CUSTODIAL' },
]

// ─── Bottom badges ────────────────────────────────────────────────────────────

const systemBadges = [
  'Discord Developer Verified Bot v3.4.2',
  'Supabase PostgreSQL Encrypted',
  'Upstash Redis BullMQ Worker Ready',
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [cliOpen, setCliOpen] = useState(false)

  return (
    <>
      {/* ── Top status bar ── */}
      <div
        className="w-full px-4 py-1.5 text-center"
        style={{
          backgroundColor: 'rgba(124,58,237,0.08)',
          borderBottom: '1px solid rgba(124,58,237,0.2)',
        }}
        role="status"
        aria-label="System status"
      >
        <p
          className="text-[9px] font-mono tracking-[0.18em] uppercase"
          style={{ color: '#7c3aed' }}
        >
          SHARD AP-SOUTH-1&nbsp;•&nbsp;TICK 60Hz P2P&nbsp;•&nbsp;OAUTH2 SCOPES: ID, GUILDS, EMAIL
        </p>
      </div>

      <Navigation />

      {/* ── Background ── */}
      <div
        className="relative min-h-screen flex flex-col"
        style={{ backgroundColor: '#050508' }}
      >
        {/* Subtle grid lines overlay */}
        <div
          className="fixed inset-0 pointer-events-none hud-grid-bg opacity-[0.07]"
          aria-hidden="true"
        />

        {/* ── Hero section ── */}
        <section className="relative z-10 flex-1 flex items-center justify-center px-4 py-24">
          <motion.div
            className="w-full max-w-lg mx-auto text-center"
            variants={staggerChildren}
            initial="hidden"
            animate="visible"
          >
            {/* Shield icon */}
            <motion.div variants={fadeIn} className="flex justify-center mb-6">
              <div
                className="relative flex items-center justify-center w-20 h-20 rounded-full border border-[rgba(124,58,237,0.5)]"
                style={{
                  background:
                    'radial-gradient(circle at 50% 50%, rgba(124,58,237,0.15) 0%, rgba(5,5,8,0) 70%)',
                  boxShadow:
                    '0 0 40px rgba(124,58,237,0.2), inset 0 0 20px rgba(124,58,237,0.05)',
                }}
              >
                <Shield
                  size={36}
                  className="text-[#7c3aed]"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(124,58,237,0.9))' }}
                  aria-hidden="true"
                />
                {/* Pulse ring */}
                <span
                  className="absolute inset-0 rounded-full border border-[rgba(124,58,237,0.3)] animate-ping"
                  style={{ animationDuration: '2.5s' }}
                  aria-hidden="true"
                />
              </div>
            </motion.div>

            {/* System node label */}
            <motion.p
              variants={fadeIn}
              className="text-[10px] font-mono tracking-[0.22em] uppercase mb-3"
              style={{ color: 'rgba(6,182,212,0.8)' }}
            >
              SYS.NODE.7 / MULTI-TENANT TOURNAMENT PROTOCOL
            </motion.p>

            {/* Main title */}
            <motion.div variants={fadeUp} className="mb-4">
              <NeonText
                as="h1"
                color="violet"
                glitch
                className="text-4xl sm:text-5xl md:text-6xl font-black leading-none tracking-[0.08em]"
              >
                LEGENDARY ESPORTS
              </NeonText>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              variants={fadeIn}
              className="text-sm text-[#64748b] mb-10 leading-relaxed px-2 font-mono"
            >
              Command Control Gateway. Zero-trust tournament execution, roster attestation, and match engine.
            </motion.p>

            {/* Primary CTA */}
            <motion.div variants={fadeUp} className="flex flex-col items-center gap-4 mb-6">
              <GlowButton variant="cyber" size="lg" asChild>
                <Link
                  href="/api/auth/login"
                  className="no-underline text-[#050508] font-bold w-full max-w-sm"
                >
                  CONTINUE WITH DISCORD →
                </Link>
              </GlowButton>

              {/* Lock + hint */}
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#475569]">
                <Lock size={10} aria-hidden="true" />
                <span>Cryptographic handshake detects owned guilds automatically</span>
              </div>
            </motion.div>

            {/* Divider */}
            <motion.div variants={fadeIn} className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
              <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-[#334155]">
                ALTERNATE TERMINAL ROUTE
              </span>
              <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
            </motion.div>

            {/* CLI Token collapsible */}
            <motion.div variants={fadeUp}>
              <GlassCard className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCliOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                  aria-expanded={cliOpen}
                >
                  <span className="text-[11px] font-mono tracking-[0.15em] uppercase text-[#64748b]">
                    System Administrator CLI Token
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-[#334155] transition-transform ${cliOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                <AnimatePresence>
                  {cliOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="px-4 pb-4 pt-1 border-t"
                        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                      >
                        <p className="text-[11px] font-mono text-[#475569] mb-3">
                          Paste your administrator JWT token to bypass OAuth flow.
                        </p>
                        <input
                          type="password"
                          placeholder="sk_admin_••••••••••••"
                          className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-2 text-xs font-mono text-[#94a3b8] placeholder:text-[#334155] focus:outline-none focus:border-[rgba(124,58,237,0.5)] focus:ring-1 focus:ring-[rgba(124,58,237,0.3)] transition-colors"
                          autoComplete="off"
                        />
                        <GlowButton variant="ghost" size="sm" className="mt-3 w-full text-xs">
                          Authenticate via Token
                        </GlowButton>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </motion.div>

            {/* Stats row */}
            <motion.div
              variants={staggerChildren}
              className="grid grid-cols-3 gap-3 mt-8"
            >
              {stats.map((s) => (
                <motion.div key={s.label} variants={fadeUp}>
                  <GlassCard hud className="p-3 text-center">
                    <p
                      className="text-base font-black neon-text-cyan font-mono"
                    >
                      {s.value}
                    </p>
                    <p className="text-[8px] font-mono tracking-[0.15em] uppercase text-[#475569] mt-0.5">
                      {s.label}
                    </p>
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* ── Feature cards section ── */}
        <section className="relative z-10 px-4 pb-24">
          <div className="max-w-4xl mx-auto">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
              variants={staggerChildren}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
            >
              {featureCards.map((card) => {
                const Icon = card.icon
                return (
                  <motion.div key={card.title} variants={fadeUp}>
                    <GlassCard neonColor={card.color} scanline className="p-6 h-full relative">
                      <span
                        className="absolute top-3 right-3 text-[9px] font-mono text-white/20"
                        aria-hidden="true"
                      >
                        {card.code}
                      </span>
                      <Icon
                        size={20}
                        className="mb-4"
                        style={{
                          color: card.color === 'violet' ? '#7c3aed' : '#06b6d4',
                          filter: `drop-shadow(0 0 6px ${card.color === 'violet' ? 'rgba(124,58,237,0.8)' : 'rgba(6,182,212,0.8)'})`,
                        }}
                        aria-hidden="true"
                      />
                      <h3
                        className="text-sm font-bold text-white mb-2"
                        style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)' }}
                      >
                        {card.title}
                      </h3>
                      <p className="text-xs text-[#64748b] leading-relaxed">
                        {card.description}
                      </p>
                    </GlassCard>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>
        </section>

        {/* ── Bottom system badges ── */}
        <footer
          className="relative z-10 py-8 px-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
            <div className="flex flex-wrap justify-center gap-3">
              {systemBadges.map((badge) => (
                <div
                  key={badge}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)]"
                >
                  <StatusPulse variant="synced" className="w-1.5 h-1.5" />
                  <span className="text-[10px] font-mono tracking-wide text-[#475569]">
                    {badge}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-mono tracking-[0.15em] uppercase text-[#2d3748]">
              © {new Date().getFullYear()} LEGENDARY ESPORTS — ALL RIGHTS RESERVED
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}
