'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useSoundEffects } from '@/lib/hooks/useSoundEffects'

/* ── 3D scene ── */
const HeroSceneWrapper = dynamic(() => import('@/components/three/HeroSceneWrapper'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="relative size-32">
        <div className="absolute inset-0 rounded-full border border-[rgba(124,58,237,0.3)] animate-[breathe_2s_ease-in-out_infinite]" />
        <div className="absolute inset-4 rounded-full border border-[rgba(6,182,212,0.2)] animate-[breathe_2.5s_ease-in-out_infinite_0.5s]" />
        <div className="absolute inset-8 rounded-full border border-[rgba(159,91,255,0.15)] animate-[breathe_3s_ease-in-out_infinite_1s]" />
      </div>
    </div>
  ),
})

/* ── Variants ── */
const fadeUp   = { hidden: { opacity: 0, y: 32 },   visible: { opacity: 1, y: 0,   transition: { duration: 0.7, ease: [0.22,1,0.36,1] } } }
const fadeLeft = { hidden: { opacity: 0, x: -24 },  visible: { opacity: 1, x: 0,   transition: { duration: 0.65, ease: [0.22,1,0.36,1] } } }
const fadeIn   = { hidden: { opacity: 0 },            visible: { opacity: 1,         transition: { duration: 0.5 } } }
const stagger  = { visible: { transition: { staggerChildren: 0.09 } } }
const staggerSlow = { visible: { transition: { staggerChildren: 0.15 } } }

/* ── Data ── */
const navLinks = ['Platform', 'Games', 'How it works', 'Docs']

const features = [
  { icon: '/figma/network.svg',       title: 'Multi-Server',      accent: '#7c3aed',
    desc: 'Every Discord server gets its own isolated arena — separate teams, tournaments, roles, and records.' },
  { icon: '/figma/radio.svg',         title: 'Live Tournaments',  accent: '#22d3ee',
    desc: 'Schedules, approved standings, and check-ins in one cinematic match-day hub.' },
  { icon: '/figma/messages-square.svg', title: 'Discord-Native',  accent: '#9f5bff',
    desc: 'One identity. Slash commands. Announcements that keep your community locked in, in real time.' },
]

const games = [
  { title: 'BGMI',        sub: 'Battle Royale · Squad',       img: '/figma/game-bgmi.png',     color: '#22d3ee' },
  { title: 'FREE FIRE',   sub: 'Battle Royale / Clash Squad', img: '/figma/game-freefire.png', color: '#9f5bff' },
  { title: 'COD MOBILE',  sub: 'Multiplayer / Battle Royale', img: '/figma/game-codm.png',     color: '#7c3aed' },
]

const steps = [
  { n: '01', title: 'Login',          desc: 'Connect with Discord. Your identity comes with you — no new account.' },
  { n: '02', title: 'Select Server',  desc: 'Pick your community. See everything that\'s live or coming up next.' },
  { n: '03', title: 'Compete',        desc: 'Register your squad, check in on match day, and chase the podium.' },
]

const liveMatches = [
  { img: '/figma/tournament-live.png',  game: 'BGMI',      status: 'LIVE',              statusColor: 'red'  as const,
    name: 'NIGHTFALL SERIES',  mode: 'Battle Royale · Squad', date: '17 Nov 2026 · 15:00 IST', teams: '16 / 16', entry: 'Free' },
  { img: '/figma/tournament-next.png',  game: 'FREE FIRE', status: 'REG OPEN',          statusColor: 'cyan' as const,
    name: 'NEXUS OPEN',        mode: 'Clash Squad · Duo',     date: '22 Nov 2026 · 18:00 IST', teams: '8 / 32',  entry: 'Free' },
  { img: '/figma/tournament-third.png', game: 'COD MOBILE',status: 'UPCOMING',          statusColor: 'cyan' as const,
    name: 'ARENA CLASSIC',     mode: 'Multiplayer · Squad',   date: '28 Nov 2026 · 20:00 IST', teams: '0 / 16',  entry: 'Free' },
]

const stats = [
  { val: '3,400+', label: 'ACTIVE PLAYERS' },
  { val: '128',    label: 'TOURNAMENTS RUN' },
  { val: '99.9%',  label: 'UPTIME SLA' },
  { val: '∞',      label: 'FREE FOREVER' },
]

/* ════════════════════════════════════════════════════════════════════
   SHARED SUB-COMPONENTS
════════════════════════════════════════════════════════════════════ */

function HudCorners({ color = 'rgba(124,58,237,0.55)' }: { color?: string }) {
  const corners = [
    { top: 8, left: 8 },
    { top: 8, right: 8 },
    { bottom: 8, left: 8 },
    { bottom: 8, right: 8 },
  ] as const
  return (
    <>
      {corners.map((pos, i) => {
        const isTop = 'top' in pos
        const isLeft = 'left' in pos
        return (
          <span key={i} className="absolute size-4 pointer-events-none" style={{
            ...pos,
            borderTop:    isTop    ? `2px solid ${color}` : 'none',
            borderBottom: !isTop   ? `2px solid ${color}` : 'none',
            borderLeft:   isLeft   ? `2px solid ${color}` : 'none',
            borderRight:  !isLeft  ? `2px solid ${color}` : 'none',
          }} aria-hidden />
        )
      })}
    </>
  )
}

function NeonPill({ color, text }: { color: 'cyan' | 'purple' | 'red'; text: string }) {
  const cfg = {
    cyan:   { bg: 'rgba(34,211,238,0.08)',  dot: '#22d3ee', txt: '#22d3ee', ring: 'rgba(34,211,238,0.2)' },
    purple: { bg: 'rgba(159,91,255,0.08)', dot: '#9f5bff', txt: '#9f5bff', ring: 'rgba(159,91,255,0.2)' },
    red:    { bg: 'rgba(239,68,68,0.08)',   dot: '#ef4444', txt: '#ef4444', ring: 'rgba(239,68,68,0.2)' },
  }[color]
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.txt, border: `1px solid ${cfg.ring}` }}>
      <span className="size-[5px] rounded-full shrink-0 animate-pulse" style={{ background: cfg.dot }} aria-hidden />
      {text}
    </span>
  )
}

function SectionHeader({ eyebrow, title, sub, align = 'left' }:
  { eyebrow: string; title: string; sub?: string; align?: 'left' | 'center' }) {
  return (
    <div className={`flex flex-col gap-2 ${align === 'center' ? 'items-center text-center' : ''}`}>
      <span className="text-[10px] font-medium tracking-[0.25em] text-[#22d3ee] uppercase"
        style={{ fontFamily: 'var(--font-jetbrains)' }}>{eyebrow}</span>
      <h2 className="font-black leading-tight text-[#f1f5f9]"
        style={{ fontFamily: 'var(--font-orbitron)', fontSize: 'clamp(1.5rem,3vw,2.1rem)' }}>{title}</h2>
      {sub && <p className="text-[14px] text-[#64748b] leading-relaxed max-w-lg">{sub}</p>}
    </div>
  )
}

/* Hover magnetic tilt card */
function MagneticCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rx = useSpring(useTransform(y, [-0.5, 0.5], ['-6deg', '6deg']), { stiffness: 200, damping: 20 })
  const ry = useSpring(useTransform(x, [-0.5, 0.5], ['-6deg', '6deg']), { stiffness: 200, damping: 20 })

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = ref.current!.getBoundingClientRect()
    x.set((e.clientX - r.left) / r.width - 0.5)
    y.set((e.clientY - r.top) / r.height - 0.5)
  }
  function onLeave() { x.set(0); y.set(0) }

  return (
    <motion.div ref={ref} className={`cursor-default ${className}`}
      style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
      onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   NAVIGATION
════════════════════════════════════════════════════════════════════ */
function Nav({ play, click }: { play: () => void; click: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(4,4,8,0.90)' : 'transparent',
        backdropFilter: scrolled ? 'blur(24px) saturate(180%)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        boxShadow: scrolled ? '0 4px 32px rgba(0,0,0,0.4)' : 'none',
      }}>
      <div className="max-w-[1400px] mx-auto flex items-center gap-8 h-[76px] px-8">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group" onMouseEnter={play}>
          <div className="flex items-center justify-center rounded-[8px] size-9 transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(124,58,237,0.5)]"
            style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.35)' }}>
            <Image src="/figma/hexagon.svg" alt="" width={20} height={20} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-black text-[14px] text-[#f1f5f9] tracking-wider transition-colors group-hover:neon-text-violet"
              style={{ fontFamily: 'var(--font-orbitron)' }}>SHADØW</span>
            <span className="text-[7px] text-[#475569] tracking-[0.2em]"
              style={{ fontFamily: 'var(--font-jetbrains)' }}>TOURNAMENTS</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex flex-1 items-center justify-center gap-8">
          {navLinks.map((l) => (
            <a key={l}
              href={`#${l.toLowerCase().replace(/ /g, '-')}`}
              className="relative text-[12px] text-[#64748b] hover:text-[#f1f5f9] transition-colors duration-200 group"
              onMouseEnter={play}>
              {l}
              <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-gradient-to-r from-[#7c3aed] to-[#22d3ee] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/servers"
            className="px-4 py-2 rounded-[8px] text-[12px] font-semibold text-[#94a3b8] hover:text-[#f1f5f9] transition-colors border border-transparent hover:border-[rgba(255,255,255,0.1)]"
            onMouseEnter={play}>
            Browse Servers
          </Link>
          <Link href="/api/auth/login"
            className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-[13px] font-semibold text-white transition-all hover:opacity-90 hover:shadow-[0_0_28px_rgba(124,58,237,0.55)] liquid-button"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#9f5bff)', border: '1px solid rgba(124,58,237,0.4)' }}
            onMouseEnter={play} onClick={click}>
            <Image src="/figma/gamepad.svg" alt="" width={15} height={15} />
            Login with Discord
          </Link>
        </div>

        {/* Mobile toggle */}
        <button type="button" className="md:hidden ml-auto p-2 text-[#94a3b8]"
          onClick={() => setMobileOpen(v => !v)} aria-label="Toggle menu">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {mobileOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="md:hidden overflow-hidden"
            style={{ background: 'rgba(4,4,8,0.97)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex flex-col gap-1 p-4">
              {navLinks.map((l) => (
                <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`}
                  className="py-3 px-4 rounded-lg text-[13px] text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/5 transition-colors"
                  onClick={() => setMobileOpen(false)}>
                  {l}
                </a>
              ))}
              <div className="pt-3 border-t border-white/5">
                <Link href="/api/auth/login"
                  className="flex items-center justify-center gap-2 py-3 rounded-[8px] text-[13px] font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#9f5bff)' }}
                  onClick={() => setMobileOpen(false)}>
                  <Image src="/figma/gamepad.svg" alt="" width={15} height={15} />
                  Login with Discord
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}

/* ════════════════════════════════════════════════════════════════════
   HERO
════════════════════════════════════════════════════════════════════ */
function Hero({ play, click, trans }: { play: () => void; click: () => void; trans: () => void }) {
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const opacity = useTransform(scrollYProgress, [0, 0.65], [1, 0])
  const y       = useTransform(scrollYProgress, [0, 0.65], [0, -60])

  return (
    <motion.section ref={heroRef} style={{ opacity, y }}
      className="relative z-10 min-h-screen flex flex-col justify-center pt-[76px] overflow-hidden">

      {/* Cinematic grid background */}
      <div className="absolute inset-0 hero-grid-bg pointer-events-none opacity-60" aria-hidden />

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden style={{
        background:
          'radial-gradient(ellipse 80% 60% at 65% 30%, rgba(124,58,237,0.14) 0%,transparent 65%),' +
          'radial-gradient(ellipse 50% 40% at 20% 70%, rgba(6,182,212,0.08) 0%,transparent 55%)',
      }} />

      <div className="relative max-w-[1400px] mx-auto w-full px-8 py-16 flex items-center gap-12 lg:gap-20">

        {/* ── Left: Copy ── */}
        <motion.div className="flex flex-col gap-7 flex-1 min-w-0 max-w-[620px]"
          variants={stagger} initial="hidden" animate="visible">

          <motion.div variants={fadeLeft}>
            <NeonPill color="cyan" text="DISCORD-NATIVE · COMPETITION-READY · MOBILE ESPORTS" />
          </motion.div>

          <motion.h1 variants={fadeUp}
            className="font-black text-[#f1f5f9] leading-[1.08] tracking-tight"
            style={{ fontFamily: 'var(--font-orbitron)', fontSize: 'clamp(2.4rem,5.5vw,4.2rem)' }}>
            YOUR SERVER.{' '}
            <span className="relative inline-block">
              <span style={{
                background: 'linear-gradient(135deg,#c084fc 0%,#7c3aed 35%,#22d3ee 75%,#67e8f9 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                filter: 'drop-shadow(0 0 22px rgba(124,58,237,0.5))',
              }}>
                YOUR ARENA.
              </span>
            </span>
            {' '}YOUR LEGACY.
          </motion.h1>

          <motion.p variants={fadeIn} className="text-[17px] text-[#64748b] leading-[1.7] max-w-[520px]">
            Turn your Discord community into a competitive arena. Run mobile esports tournaments,
            rally your squad, and make every match matter — all from inside Discord.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap gap-3 items-center">
            <Link href="/api/auth/login"
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-[10px] text-[13px] font-bold text-white transition-all hover:shadow-[0_0_36px_rgba(124,58,237,0.6)] hover:-translate-y-0.5 liquid-button"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#9f5bff)', border: '1px solid rgba(124,58,237,0.45)' }}
              onMouseEnter={play} onClick={click}>
              <Image src="/figma/gamepad.svg" alt="" width={16} height={16} />
              Login with Discord — Free
            </Link>
            <Link href="#platform"
              className="px-6 py-3.5 rounded-[10px] text-[13px] font-semibold text-[#94a3b8] hover:text-[#f1f5f9] hover:border-[rgba(124,58,237,0.35)] transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              onMouseEnter={play} onClick={trans}>
              Explore the platform →
            </Link>
          </motion.div>

          <motion.div variants={fadeIn} className="flex flex-col gap-2">
            <p className="text-[11px] text-[#334155] tracking-[0.2em]" style={{ fontFamily: 'var(--font-jetbrains)' }}>
              BGMI / FREE FIRE / COD MOBILE
            </p>
            <div className="flex gap-5 text-[12px] text-[#475569]">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[#22c55e]" aria-hidden />
                Free tournaments
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[#7c3aed]" aria-hidden />
                One Discord identity
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[#22d3ee]" aria-hidden />
                Discord bot included
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* ── Right: 3D scene ── */}
        <motion.div className="hidden lg:flex flex-col gap-4 flex-1 min-w-0"
          initial={{ opacity: 0, scale: 0.92, x: 40 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}>

          <div className="relative w-full rounded-[20px] overflow-hidden"
            style={{
              height: 500,
              background: 'rgba(8,8,18,0.6)',
              border: '1px solid rgba(124,58,237,0.2)',
              boxShadow: '0 0 100px rgba(124,58,237,0.12), 0 0 40px rgba(6,182,212,0.06), inset 0 0 60px rgba(0,0,0,0.5)',
            }}>
            <HudCorners />
            <HeroSceneWrapper />
            {/* Bottom vignette */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(180deg,transparent 55%,rgba(4,4,8,0.85) 100%)' }} aria-hidden />
            {/* HUD labels */}
            <div className="absolute bottom-5 left-5 right-5 flex justify-between text-[9px] text-[#334155] pointer-events-none"
              style={{ fontFamily: 'var(--font-jetbrains)' }}>
              <span>SHADØW / ARENA CORE v2.4</span>
              <span className="text-[#22d3ee]">01 — BUILT TO COMPETE</span>
            </div>
          </div>

          {/* Floating stat chips */}
          <div className="flex gap-3">
            {stats.slice(0, 3).map((s, i) => (
              <motion.div key={s.label} className="flex-1 flex flex-col items-center gap-1 py-4 rounded-[12px]"
                style={{ background: 'rgba(8,8,18,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}>
                <span className="font-black text-[22px]"
                  style={{ fontFamily: 'var(--font-orbitron)', color: i === 0 ? '#9f5bff' : i === 1 ? '#22d3ee' : '#22c55e',
                    textShadow: `0 0 16px ${i === 0 ? 'rgba(159,91,255,.4)' : i === 1 ? 'rgba(34,211,238,.4)' : 'rgba(34,197,94,.4)'}` }}>
                  {s.val}
                </span>
                <span className="text-[8px] text-[#334155] tracking-widest" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                  {s.label}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
        <span className="text-[9px] text-[#334155] tracking-[0.25em]" style={{ fontFamily: 'var(--font-jetbrains)' }}>SCROLL</span>
        <div className="w-px h-8 bg-gradient-to-b from-[rgba(124,58,237,0.5)] to-transparent" />
      </motion.div>
    </motion.section>
  )
}

/* ════════════════════════════════════════════════════════════════════
   MARQUEE STRIP
════════════════════════════════════════════════════════════════════ */
function GameStrip({ play }: { play: () => void }) {
  const items = ['BGMI', 'FREE FIRE', 'COD MOBILE', 'BGMI', 'FREE FIRE', 'COD MOBILE', 'BGMI', 'FREE FIRE', 'COD MOBILE', 'BGMI', 'FREE FIRE', 'COD MOBILE']
  return (
    <div className="relative z-10 w-full overflow-hidden py-5"
      style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(4,4,8,0.8)' }}>
      {/* Left/right fade masks */}
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#040408] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#040408] to-transparent z-10 pointer-events-none" />
      <div className="flex marquee-track" onMouseEnter={play}>
        {items.map((item, i) => (
          <span key={i} className="shrink-0 flex items-center gap-4 px-8 font-black text-[13px] tracking-widest cursor-default"
            style={{ fontFamily: 'var(--font-orbitron)', color: i % 3 === 0 ? '#22d3ee' : i % 3 === 1 ? '#9f5bff' : '#7c3aed' }}>
            {item}
            <span className="text-[#1e293b]" aria-hidden>✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   FEATURES
════════════════════════════════════════════════════════════════════ */
function Features() {
  return (
    <section id="platform" className="relative z-10 py-28 px-8 max-w-[1400px] mx-auto w-full">
      <motion.div className="flex flex-col gap-14"
        variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>

        <motion.div variants={fadeUp} className="flex items-end justify-between gap-8">
          <SectionHeader
            eyebrow="01 / THE COMPETITIVE ADVANTAGE"
            title="LESS CHAOS. MORE GAME."
            sub="Everything your community needs, from the first registration to the final GG." />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div key={f.title} variants={fadeUp} custom={i}>
              <MagneticCard className="h-full">
                <div className="relative h-full rounded-[18px] p-7 flex flex-col gap-5 group overflow-hidden"
                  style={{
                    background: 'rgba(13,13,26,0.7)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 4px 32px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(16px)',
                  }}>
                  {/* Glow on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-[18px]"
                    style={{ background: `radial-gradient(ellipse 80% 80% at 50% 0%, ${f.accent}18 0%, transparent 70%)` }} aria-hidden />
                  {/* Top accent line */}
                  <div className="absolute top-0 left-6 right-6 h-px transition-all duration-300"
                    style={{ background: `linear-gradient(90deg, transparent, ${f.accent}, transparent)`, opacity: 0.4 }} aria-hidden />

                  <div className="size-11 flex items-center justify-center rounded-[10px] shrink-0"
                    style={{ background: `${f.accent}14`, border: `1px solid ${f.accent}30` }}>
                    <Image src={f.icon} alt="" width={22} height={22} />
                  </div>
                  <p className="font-bold text-[18px] text-[#f1f5f9]" style={{ fontFamily: 'var(--font-orbitron)' }}>{f.title}</p>
                  <p className="text-[13px] text-[#64748b] leading-relaxed flex-1">{f.desc}</p>
                  <span className="text-[12px] font-medium transition-colors duration-200" style={{ color: f.accent }}>
                    Built for your community →
                  </span>

                  {/* HUD corners */}
                  <HudCorners color={`${f.accent}50`} />
                </div>
              </MagneticCard>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════════
   GAMES
════════════════════════════════════════════════════════════════════ */
function Games({ play }: { play: () => void }) {
  return (
    <section id="games" className="relative z-10 py-28 px-8 max-w-[1400px] mx-auto w-full">
      <motion.div className="flex flex-col gap-14"
        variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>

        <motion.div variants={fadeUp}>
          <SectionHeader eyebrow="02 / PICK YOUR BATTLEGROUND" title="THREE GAMES. LIMITLESS LEGENDS." />
        </motion.div>

        <div className="grid grid-cols-3 gap-6">
          {games.map((g, i) => (
            <motion.div key={g.title} variants={fadeUp}
              className="group relative flex flex-col gap-5" onMouseEnter={play}>
              <div className="relative overflow-hidden rounded-[20px]" style={{ height: 340 }}>
                <Image src={g.img} alt={g.title} fill
                  className="object-cover transition-transform duration-700 group-hover:scale-108" sizes="400px" />
                {/* Dark gradient */}
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(180deg, transparent 35%, rgba(4,4,8,0.95) 100%)' }} aria-hidden />
                {/* Neon border on hover */}
                <motion.div className="absolute inset-0 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                  style={{ boxShadow: `inset 0 0 0 1.5px ${g.color}99` }} aria-hidden />
                {/* Game name overlaid */}
                <div className="absolute bottom-5 left-5 right-5">
                  <p className="font-black text-[22px] text-[#f1f5f9]" style={{ fontFamily: 'var(--font-orbitron)' }}>{g.title}</p>
                  <p className="text-[12px] text-[#64748b] mt-0.5">{g.sub}</p>
                </div>
                {/* Color chip */}
                <div className="absolute top-5 right-5 size-2 rounded-full animate-pulse"
                  style={{ background: g.color, boxShadow: `0 0 10px ${g.color}` }} aria-hidden />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════════
   HOW IT WORKS
════════════════════════════════════════════════════════════════════ */
function HowItWorks() {
  return (
    <section id="how-it-works" className="relative z-10 py-28 px-8 max-w-[1400px] mx-auto w-full">
      {/* Background pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-30" aria-hidden
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(124,58,237,0.15) 1px, transparent 0)',
          backgroundSize: '36px 36px',
        }} />

      <motion.div className="relative flex flex-col gap-14"
        variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>

        <motion.div variants={fadeUp}>
          <SectionHeader eyebrow="03 / FROM COMMUNITY TO COMPETITION" title="THREE STEPS. YOU'RE IN." />
        </motion.div>

        <div className="grid grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <motion.div key={s.n} variants={fadeUp}
              className="relative flex flex-col gap-5 p-7 rounded-[18px]"
              style={{
                background: 'rgba(13,13,26,0.6)',
                border: '1px solid rgba(124,58,237,0.15)',
                backdropFilter: 'blur(12px)',
              }}>
              {/* Step connector line */}
              {i < 2 && (
                <div className="absolute top-12 right-0 translate-x-full w-8 h-px z-10 hidden lg:block"
                  style={{ background: 'linear-gradient(90deg,rgba(124,58,237,0.4),rgba(6,182,212,0.4))' }} aria-hidden />
              )}
              {/* Number */}
              <div className="flex items-center gap-3">
                <span className="font-black text-[13px] text-[#9f5bff]" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                  {s.n}
                </span>
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.5), transparent)' }} />
              </div>
              <p className="font-bold text-[22px] text-[#f1f5f9]" style={{ fontFamily: 'var(--font-orbitron)' }}>{s.title}</p>
              <p className="text-[13px] text-[#64748b] leading-relaxed">{s.desc}</p>
              {/* Ghost big number */}
              <span className="absolute top-4 right-6 font-black text-[64px] text-[#f1f5f9]/[0.03] select-none pointer-events-none"
                aria-hidden style={{ fontFamily: 'var(--font-orbitron)' }}>{i + 1}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════════
   DISCORD INTEGRATION
════════════════════════════════════════════════════════════════════ */
function DiscordStory({ play }: { play: () => void }) {
  return (
    <section className="relative z-10 py-16 px-8">
      {/* Full-bleed background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden
        style={{
          background: 'linear-gradient(180deg, rgba(124,58,237,0.04) 0%, rgba(6,182,212,0.03) 100%)',
          borderTop: '1px solid rgba(124,58,237,0.12)',
          borderBottom: '1px solid rgba(124,58,237,0.12)',
        }} />

      <div className="relative max-w-[1400px] mx-auto">
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
          <div className="relative rounded-[24px] p-10 lg:p-14 flex flex-col lg:flex-row items-start lg:items-center gap-12"
            style={{
              background: 'rgba(8,8,18,0.8)',
              border: '1px solid rgba(124,58,237,0.25)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 0 80px rgba(124,58,237,0.06), 0 0 40px rgba(0,0,0,0.5)',
            }}>
            <HudCorners />

            {/* Left */}
            <div className="flex flex-col gap-6 flex-1 min-w-0">
              <NeonPill color="purple" text="ONE SERVER. ONE SOURCE OF TRUTH." />
              <h2 className="font-bold leading-tight text-[#f1f5f9]"
                style={{ fontFamily: 'var(--font-orbitron)', fontSize: 'clamp(1.5rem,3.5vw,2.4rem)' }}>
                YOUR COMMUNITY.{' '}
                <span style={{ color: '#9f5bff', textShadow: '0 0 20px rgba(159,91,255,0.4)' }}>
                  NOT ANOTHER LOGIN.
                </span>
              </h2>
              <p className="text-[14px] text-[#64748b] leading-relaxed max-w-[480px]">
                Create on the web. Manage from Discord. Keep announcements, reminders, and approved results
                aligned — without spreadsheets or channel-hopping.
              </p>
              <ul className="flex flex-col gap-2.5">
                {['Role-based access — player, referee, admin',
                  'Live match announcements sent to your server',
                  'Room credentials delivered instantly by the bot',
                  'Bracket updates and standings pushed automatically'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[13px] text-[#94a3b8]">
                    <span className="size-1.5 rounded-full shrink-0" style={{ background: '#9f5bff', boxShadow: '0 0 8px rgba(159,91,255,0.6)' }} aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <a href="/docs" className="inline-flex items-center gap-2 w-fit px-5 py-3 rounded-[10px] text-[13px] font-semibold text-[#94a3b8] hover:text-[#f1f5f9] transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                onMouseEnter={play}>
                Read the Discord guide →
              </a>
            </div>

            {/* Right: Bot embed mockup */}
            <div className="shrink-0 w-full lg:w-[460px] rounded-[16px] p-6 flex flex-col gap-4"
              style={{ background: '#07070f', border: '1px solid rgba(255,255,255,0.06)' }}>
              {/* Bot identity row */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center rounded-[8px] size-9"
                  style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}>
                  <Image src="/figma/bot.svg" alt="" width={18} height={18} />
                </div>
                <div>
                  <p className="font-semibold text-[13px] text-[#f1f5f9]" style={{ fontFamily: 'var(--font-orbitron)' }}>SHADØW</p>
                  <p className="text-[10px] text-[#22d3ee]" style={{ fontFamily: 'var(--font-jetbrains)' }}>BOT · Today at 14:58</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] text-[#22c55e]"
                  style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <span className="size-1.5 rounded-full bg-[#22c55e] animate-pulse" aria-hidden />
                  ONLINE
                </div>
              </div>
              {/* Embed */}
              <div className="rounded-[10px] p-5 flex flex-col gap-3"
                style={{ background: 'rgba(18,18,37,0.8)', borderLeft: '3px solid #7c3aed' }}>
                <p className="font-bold text-[14px] text-[#f1f5f9]">🏆 Nightfall Series — Match #4</p>
                <div className="flex flex-col gap-1.5 text-[12px] text-[#64748b]">
                  <p>Room ID: <span className="text-[#f1f5f9] font-mono">NFSR-4429</span></p>
                  <p>Password: <span className="text-[#f1f5f9] font-mono">shadow88</span></p>
                  <p>Check-in closes in <span className="text-[#22d3ee] font-semibold">5 minutes</span></p>
                </div>
                <div className="flex gap-2 mt-1">
                  {['✓ Check In', 'View Bracket', 'Dispute Result'].map((b, i) => (
                    <button key={b} type="button" className="px-3 py-1.5 rounded-[6px] text-[11px] font-semibold text-white cursor-default"
                      style={{ background: i === 0 ? '#7c3aed' : 'rgba(255,255,255,0.05)', border: `1px solid ${i === 0 ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)'}` }}>
                      {b}
                    </button>
                  ))}
                </div>
              </div>
              {/* Reaction row */}
              <div className="flex items-center gap-2 text-[11px] text-[#475569]">
                {['⚡ 12', '🎮 8', '🏆 5'].map((r) => (
                  <span key={r} className="px-2 py-0.5 rounded-full cursor-default hover:bg-white/5 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════════
   LIVE MATCHES
════════════════════════════════════════════════════════════════════ */
function LiveMatches({ play, click }: { play: () => void; click: () => void }) {
  return (
    <section className="relative z-10 py-28 px-8 max-w-[1400px] mx-auto w-full">
      <motion.div className="flex flex-col gap-10"
        variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>

        <motion.div variants={fadeUp} className="flex items-end justify-between gap-4 flex-wrap">
          <SectionHeader
            eyebrow="ON THE BATTLEGROUND"
            title="LIVE &amp; NEXT UP"
            sub="Catch the action, or make sure your squad is ready for the next drop." />
          <Link href="/api/auth/login"
            className="shrink-0 px-5 py-2.5 rounded-[10px] text-[12px] font-semibold text-[#94a3b8] hover:text-[#f1f5f9] transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            onMouseEnter={play} onClick={click}>
            All tournaments →
          </Link>
        </motion.div>

        <div className="grid grid-cols-3 gap-6">
          {liveMatches.map((m, i) => {
            const dotColor  = m.statusColor === 'red' ? '#ef4444' : '#22d3ee'
            const dotBg     = m.statusColor === 'red' ? 'rgba(239,68,68,0.1)' : 'rgba(34,211,238,0.1)'
            const dotRing   = m.statusColor === 'red' ? 'rgba(239,68,68,0.2)' : 'rgba(34,211,238,0.2)'
            return (
              <motion.div key={m.name} variants={fadeUp} custom={i}>
                <div className="relative flex flex-col rounded-[20px] overflow-hidden group transition-transform duration-300 hover:-translate-y-1.5 tournament-card-glow"
                  style={{
                    background: 'rgba(13,13,26,0.8)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(12px)',
                  }}>
                  {/* Banner */}
                  <div className="relative h-[200px] overflow-hidden">
                    <Image src={m.img} alt={m.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="400px" />
                    <div className="absolute inset-0"
                      style={{ background: 'linear-gradient(180deg,rgba(0,0,0,0.1) 0%,rgba(13,13,26,0.95) 100%)' }} aria-hidden />
                  </div>
                  {/* Content */}
                  <div className="flex flex-col gap-3.5 p-6">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] tracking-widest text-[#475569]" style={{ fontFamily: 'var(--font-jetbrains)' }}>{m.game}</span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                        style={{ background: dotBg, color: dotColor, border: `1px solid ${dotRing}` }}>
                        <span className="size-[5px] rounded-full animate-pulse" style={{ background: dotColor }} aria-hidden />
                        {m.status}
                      </span>
                    </div>
                    <p className="font-bold text-[19px] text-[#f1f5f9] leading-tight" style={{ fontFamily: 'var(--font-orbitron)' }}>{m.name}</p>
                    <p className="text-[12px] text-[#475569]">{m.mode}</p>
                    <p className="text-[12px] text-[#475569]">{m.date}</p>
                    <div className="flex items-center justify-between mt-1 pt-3 text-[11px]"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="text-[#64748b]" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                        {m.teams} teams
                      </span>
                      <span className="text-[#22d3ee] font-medium">{m.entry} entry</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════════
   STATS BAR
════════════════════════════════════════════════════════════════════ */
function StatsBar() {
  return (
    <section className="relative z-10 py-6 px-8">
      <div className="max-w-[1400px] mx-auto">
        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-[20px]"
          style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.15)' }}
          variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}>
          {stats.map(({ val, label }, i) => (
            <motion.div key={label} variants={fadeUp}
              className="flex flex-col items-center gap-2 py-10"
              style={{ background: 'rgba(8,8,18,0.95)' }}>
              <span className="font-black text-[36px] leading-none"
                style={{
                  fontFamily: 'var(--font-orbitron)',
                  color: [  '#9f5bff','#22d3ee','#22c55e','#f1f5f9'][i],
                  textShadow: `0 0 24px ${['rgba(159,91,255,.35)','rgba(34,211,238,.35)','rgba(34,197,94,.35)','rgba(241,245,249,.1)'][i]}`,
                }}>
                {val}
              </span>
              <span className="text-[9px] text-[#334155] tracking-[0.22em]" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                {label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════════
   FINAL CTA
════════════════════════════════════════════════════════════════════ */
function FinalCTA({ play, click }: { play: () => void; click: () => void }) {
  return (
    <section className="relative z-10 py-28 px-8">
      <div className="max-w-[1400px] mx-auto">
        <motion.div className="relative overflow-hidden rounded-[28px] py-28 px-12 flex flex-col items-center gap-8 text-center"
          style={{
            background: 'radial-gradient(ellipse 100% 120% at 50% 0%, rgba(124,58,237,0.18) 0%, rgba(8,8,18,0.95) 65%)',
            border: '1px solid rgba(124,58,237,0.2)',
          }}
          initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.8, ease: [0.22,1,0.36,1] }}>

          {/* Grid bg */}
          <div className="absolute inset-0 pointer-events-none hero-grid-bg opacity-30" aria-hidden />
          {/* Glow orb */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle,rgba(124,58,237,0.25),transparent)', filter: 'blur(60px)' }} aria-hidden />

          <HudCorners color="rgba(124,58,237,0.4)" />

          <NeonPill color="purple" text="YOUR NEXT LEGEND STARTS HERE." />

          <h2 className="font-black text-[#f1f5f9] leading-tight relative z-10"
            style={{ fontFamily: 'var(--font-orbitron)', fontSize: 'clamp(2rem,6vw,4rem)' }}>
            READY TO{' '}
            <span style={{
              background: 'linear-gradient(135deg,#c084fc,#7c3aed 40%,#22d3ee 80%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              filter: 'drop-shadow(0 0 20px rgba(124,58,237,0.4))',
            }}>COMPETE?</span>
          </h2>

          <p className="text-[16px] text-[#475569] max-w-xl relative z-10 leading-relaxed">
            Thousands of players are already running tournaments on their Discord servers.
            Join them — it's completely free, forever.
          </p>

          <div className="flex flex-wrap items-center gap-4 relative z-10">
            <Link href="/api/auth/login"
              className="flex items-center gap-2.5 px-8 py-4 rounded-[12px] text-[14px] font-bold text-white transition-all hover:shadow-[0_0_50px_rgba(124,58,237,0.65)] hover:-translate-y-0.5 liquid-button"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#9f5bff)', border: '1px solid rgba(124,58,237,0.45)' }}
              onMouseEnter={play} onClick={click}>
              <Image src="/figma/gamepad.svg" alt="" width={18} height={18} />
              Login with Discord — It's Free
            </Link>
            <Link href="/servers"
              className="px-8 py-4 rounded-[12px] text-[14px] font-semibold text-[#94a3b8] hover:text-[#f1f5f9] transition-all hover:border-[rgba(255,255,255,0.15)]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              onMouseEnter={play}>
              Browse Servers
            </Link>
          </div>

          <p className="text-[10px] text-[#1e293b] tracking-[0.2em] relative z-10"
            style={{ fontFamily: 'var(--font-jetbrains)' }}>
            NO CREDIT CARD · NO ADS · NO BULLSHIT
          </p>
        </motion.div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════════
   FOOTER
════════════════════════════════════════════════════════════════════ */
function Footer({ play }: { play: () => void }) {
  return (
    <footer className="relative z-10 py-12 px-8"
      style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <Image src="/figma/hexagon.svg" alt="" width={18} height={18} className="opacity-50" />
          <span className="text-[12px] text-[#334155]">© {new Date().getFullYear()} SHADØW TOURNAMENTS</span>
        </div>
        {/* Links */}
        <div className="flex flex-wrap justify-center gap-6 text-[12px] text-[#334155]">
          {['Privacy', 'Terms', 'Docs', 'Discord', 'GitHub'].map((l) => (
            <a key={l} href="#" className="hover:text-[#64748b] transition-colors" onMouseEnter={play}>{l}</a>
          ))}
        </div>
        {/* Games */}
        <span className="text-[9px] text-[#1e293b] tracking-[0.22em]" style={{ fontFamily: 'var(--font-jetbrains)' }}>
          BGMI / FREE FIRE / COD MOBILE
        </span>
      </div>
    </footer>
  )
}

/* ════════════════════════════════════════════════════════════════════
   ROOT
════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { playHover, playClick, playTransition } = useSoundEffects()

  return (
    <div className="bg-[#040408] min-h-screen flex flex-col overflow-x-hidden">
      {/* Global atmosphere */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden style={{
        background:
          'radial-gradient(ellipse 90% 60% at 70% -5%, rgba(124,58,237,0.10) 0%,transparent 60%),' +
          'radial-gradient(ellipse 60% 50% at -5% 90%, rgba(6,182,212,0.06) 0%,transparent 55%),' +
          'radial-gradient(ellipse 40% 30% at 50% 50%, rgba(159,91,255,0.03) 0%,transparent 50%)',
      }} />

      <Nav play={playHover} click={playClick} />
      <Hero play={playHover} click={playClick} trans={playTransition} />
      <GameStrip play={playHover} />
      <Features />
      <Games play={playHover} />
      <HowItWorks />
      <DiscordStory play={playHover} />
      <LiveMatches play={playHover} click={playClick} />
      <StatsBar />
      <FinalCTA play={playHover} click={playClick} />
      <Footer play={playHover} />
    </div>
  )
}
