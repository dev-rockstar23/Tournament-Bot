'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, ChevronDown, Server, Cpu, Zap, Trophy, Shield, Zap as ZapIcon } from 'lucide-react'
import { LiquidCard } from '@/components/ui/LiquidCard'
import { LiquidButton } from '@/components/ui/LiquidButton'
import { NeonText } from '@/components/ui/NeonText'
import { StatusPulse } from '@/components/ui/StatusPulse'
import Navigation from '@/components/ui/Navigation'
import { LiquidBackground } from '@/components/ui/LiquidBackground'
import { fadeUp, fadeIn, staggerChildren, liquidReveal, counterPop, orbitalFloat, gradientShift, cardStack } from '@/lib/motion'

// ─── Feature cards ────────────────────────────────────────────────────────

const featureCards = [
  {
    icon: Server,
    title: 'One Server. One Truth.',
    description: 'Single source of truth for all guild state. Every match, roster, and bracket is cryptographically anchored.',
    code: '#F001',
    color: 'violet' as const,
  },
  {
    icon: Cpu,
    title: 'Hardware Integrity',
    description: 'Room credentials are ephemeral and zero-knowledge. Credentials never touch a third-party relay.',
    code: '#F002',
    color: 'cyan' as const,
  },
  {
    icon: ZapIcon,
    title: 'Escrow Guaranteed',
    description: 'Prize escrow is non-custodial. Funds are released only after on-chain attestation of match results.',
    code: '#F003',
    color: 'liquid' as const,
  },
]

// ─── Stats row ────────────────────────────────────────────────────────────

const stats = [
  { value: '0.08ms', label: 'AUTH LATENCY' },
  { value: '3,420+', label: 'SYNCED GUILDS' },
  { value: '100%', label: 'NON-CUSTODIAL' },
]

// ─── Bottom badges ────────────────────────────────────────────────────────

const systemBadges = [
  'Discord Developer Verified Bot v3.4.2',
  'Supabase PostgreSQL Encrypted',
  'Upstash Redis BullMQ Worker Ready',
]

// ─── Component ────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [cliOpen, setCliOpen] = useState(false)

  return (
    <>
      {/* ── Liquid animated background ── */}
      <LiquidBackground variant="tournament" particleCount={40} />

      {/* ── Top status bar ── */}
      <div
        className="w-full px-4 py-1.5 text-center relative z-10"
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

      {/* ── Main content ── */}
      <main className="relative z-10 min-h-screen flex flex-col">
        {/* ── Hero section ── */}
        <section className="relative z-10 flex-1 flex items-center justify-center px-4 py-24">
          <motion.div
            className="w-full max-w-lg mx-auto text-center"
            variants={staggerChildren}
            initial="hidden"
            animate="visible"
          >
            {/* Logo icon with liquid glow */}
            <motion.div variants={fadeIn} className="flex justify-center mb-6">
              <div className="relative flex items-center justify-center">
                {/* Outer liquid glow rings */}
                <motion.div
                  className="absolute inset-0 rounded-full border border-[rgba(124,58,237,0.3)]"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.1, 0.4] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ boxShadow: '0 0 60px rgba(124,58,237,0.3)' }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border border-[rgba(6,182,212,0.2)]"
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.05, 0.3] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  style={{ boxShadow: '0 0 40px rgba(6,182,212,0.2)' }}
                />
                
                {/* Main logo container */}
                <div
                  className="relative flex items-center justify-center w-24 h-24 rounded-full border border-[rgba(124,58,237,0.5)] z-10"
                  style={{
                    background: 'radial-gradient(circle at 50% 50%, rgba(124,58,237,0.2) 0%, rgba(5,5,8,0) 70%)',
                    boxShadow: '0 0 50px rgba(124,58,237,0.25), inset 0 0 30px rgba(124,58,237,0.1)',
                  }}
                >
                  <Image
                    src="/shadow-logo.png"
                    alt="SHADØW TOURNAMENTS"
                    width={96}
                    height={96}
                    unoptimized
                    className="drop-shadow-[0_0_20px_rgba(124,58,237,0.5)]"
                  />
                  {/* Inner pulse */}
                  <span
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-[#7c3aed] via-[#06b6d4] to-[#22c55e] opacity-20 blur-xl animate-pulse"
                    style={{ animationDuration: '2s' }}
                    aria-hidden="true"
                  />
                </div>
                
                {/* Floating particles around logo */}
                <motion.div
                  className="absolute inset-0"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                >
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        left: '50%',
                        top: '50%',
                        marginLeft: -4,
                        marginTop: -4,
                        background: i % 2 === 0 ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'linear-gradient(135deg, #06b6d4, #22d3ee)',
                        boxShadow: '0 0 10px currentColor',
                        transformOrigin: '0 0',
                      }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: [0, 1, 0] }}
                      transition={{
                        duration: 2,
                        delay: i * 0.2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </motion.div>
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

            {/* Main title with liquid gradient */}
            <motion.div variants={fadeUp} className="mb-4">
              <NeonText
                as="h1"
                color="violet"
                glitch
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-none tracking-[0.05em] liquid-text"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 35%, #22c55e 70%, #f97316 100%)',
                  backgroundSize: '300% 300%',
                }}
              >
                SHADØW TOURNAMENTS
              </NeonText>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              variants={fadeIn}
              className="text-sm text-[#64748b] mb-10 leading-relaxed px-2 font-mono max-w-xl mx-auto"
            >
              Command Control Gateway. Zero-trust tournament execution, roster attestation, and match engine.
            </motion.p>

            {/* Primary CTA */}
            <motion.div variants={fadeUp} className="flex flex-col items-center gap-4 mb-6">
              <LiquidButton variant="liquid" size="xl" magnetic ripple morphIntensity={0.2} asChild>
                <Link
                  href="/api/auth/login"
                  className="no-underline text-white font-bold w-full max-w-sm"
                >
                  CONTINUE WITH DISCORD →
                </Link>
              </LiquidButton>

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
              <LiquidCard liquid magnetic neonColor="violet" className="overflow-hidden">
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
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
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
                          className="liquid-input w-full text-xs font-mono"
                          autoComplete="off"
                        />
                        <LiquidButton variant="ghost" size="sm" className="mt-3 w-full text-xs" magnetic>
                          Authenticate via Token
                        </LiquidButton>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </LiquidCard>
            </motion.div>

            {/* Stats row */}
            <motion.div
              variants={staggerChildren}
              className="grid grid-cols-3 gap-3 mt-8"
            >
              {stats.map((s, i) => (
                <motion.div key={s.label} variants={counterPop}>
                  <LiquidCard hud neonColor={i === 0 ? 'violet' : i === 1 ? 'cyan' : 'green'} className="p-3 text-center">
                    <p className="text-base font-black neon-text-cyan font-mono">
                      {s.value}
                    </p>
                    <p className="text-[8px] font-mono tracking-[0.15em] uppercase text-[#475569] mt-0.5">
                      {s.label}
                    </p>
                  </LiquidCard>
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
              {featureCards.map((card, index) => {
                const Icon = card.icon
                return (
                  <motion.div key={card.title} variants={cardStack}>
                    <LiquidCard
                      liquid
                      magnetic
                      neonColor={card.color}
                      scanline
                      className="p-6 h-full relative"
                    >
                      <span
                        className="absolute top-3 right-3 text-[9px] font-mono text-white/20"
                        aria-hidden="true"
                      >
                        {card.code}
                      </span>
                      <div className="relative z-10">
                        <Icon
                          size={24}
                          className="mb-4 drop-shadow-[0_0_12px_currentColor]"
                          style={{
                            color: card.color === 'violet' ? '#7c3aed' : card.color === 'cyan' ? '#06b6d4' : '#22c55e',
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
                      </div>
                    </LiquidCard>
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
              © {new Date().getFullYear()} SHADØW TOURNAMENTS — ALL RIGHTS RESERVED
            </p>
          </div>
        </footer>
      </main>
    </>
  )
}