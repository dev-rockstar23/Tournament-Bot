'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useSoundEffects } from '@/lib/hooks/useSoundEffects'

// ── 3D Hero (no SSR) ──────────────────────────────────────────────────────
const HeroSceneWrapper = dynamic(() => import('@/components/three/HeroSceneWrapper'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-24 h-24 rounded-full border border-[rgba(124,58,237,0.35)] animate-pulse" />
    </div>
  ),
})

// ── Variants ──────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
}
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
}
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

// ── Data ──────────────────────────────────────────────────────────────────
const features = [
  {
    icon: '/figma/network.svg',
    title: 'Multi-Server',
    desc: 'Every server gets its own arena. Separate teams, tournaments, roles and records.',
  },
  {
    icon: '/figma/radio.svg',
    title: 'Live Tournaments',
    desc: 'Schedules, approved standings and check-ins in one clear match-day hub.',
  },
  {
    icon: '/figma/messages-square.svg',
    title: 'Discord-Native',
    desc: 'One identity. Familiar commands. Announcements that keep your community in the loop.',
  },
]

const games = [
  { title: 'BGMI',      sub: 'Battle Royale · Squad',         img: '/figma/game-bgmi.png' },
  { title: 'FREE FIRE', sub: 'Battle Royale / Clash Squad',   img: '/figma/game-freefire.png' },
  { title: 'COD MOBILE',sub: 'Multiplayer / Battle Royale',   img: '/figma/game-codm.png' },
]

const steps = [
  { n: '01', title: 'Login',         desc: 'Connect with Discord. Your identity comes with you.' },
  { n: '02', title: 'Select Server', desc: 'Choose your community and discover its next event.' },
  { n: '03', title: 'Compete',       desc: 'Register your squad, check in, and chase the podium.' },
]

const liveMatches = [
  {
    img: '/figma/tournament-live.png', game: 'BGMI',     status: 'Live',               statusColor: 'red' as const,
    name: 'NIGHTFALL SERIES', mode: 'Battle Royale · Squad', date: '17 Oct 2026 · 15:00 IST', teams: '16 / 16 teams', entry: 'Free entry →',
  },
  {
    img: '/figma/tournament-next.png', game: 'FREE FIRE', status: 'Registration Open', statusColor: 'cyan' as const,
    name: 'NEXUS OPEN',       mode: 'Clash Squad · Duo',       date: '22 Oct 2026 · 18:00 IST', teams: '8 / 32 teams',  entry: 'Free entry →',
  },
  {
    img: '/figma/tournament-third.png',game: 'COD MOBILE',status: 'Upcoming',          statusColor: 'cyan' as const,
    name: 'ARENA CLASSIC',    mode: 'Multiplayer · Squad',     date: '28 Oct 2026 · 20:00 IST', teams: '0 / 16 teams',  entry: 'Free entry →',
  },
]

// ── Sub-components ────────────────────────────────────────────────────────

function StatusPill({ color, text }: { color: 'cyan' | 'purple'; text: string }) {
  const c = color === 'cyan'
    ? { bg: 'rgba(34,211,238,0.09)',  dot: '#22d3ee', txt: '#22d3ee' }
    : { bg: 'rgba(159,91,255,0.09)', dot: '#9f5bff', txt: '#9f5bff' }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] text-[11px] font-semibold whitespace-nowrap"
      style={{ background: c.bg, color: c.txt }}>
      <span className="size-[5px] rounded-full shrink-0 animate-pulse" style={{ background: c.dot }} aria-hidden />
      {text}
    </span>
  )
}

function SectionLabel({ code, title, sub }: { code: string; title: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] text-[#22d3ee] tracking-widest" style={{ fontFamily: 'var(--font-jetbrains)' }}>{code}</span>
      <h2 className="font-black text-[28px] text-[#f8fafc] leading-tight" style={{ fontFamily: 'var(--font-orbitron)' }}>{title}</h2>
      {sub && <p className="text-[14px] text-[#94a3b8] leading-relaxed">{sub}</p>}
    </div>
  )
}

function GlassPanel({ children, className = '', accent = false, style }: { children: React.ReactNode; className?: string; accent?: boolean; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-[16px] ${className}`}
      style={{
        background: 'rgba(22,33,62,0.55)',
        border: `1px solid ${accent ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(12px)',
        ...style,
      }}>
      {children}
    </div>
  )
}

function TournamentCard({
  img, game, status, statusColor, name, mode, date, teams, entry,
}: typeof liveMatches[0]) {
  const dotColor  = statusColor === 'red' ? '#ef4444' : '#22d3ee'
  const dotBg     = statusColor === 'red' ? 'rgba(239,68,68,0.09)' : 'rgba(34,211,238,0.09)'
  return (
    <GlassPanel className="flex flex-col flex-1 min-w-0 overflow-hidden group transition-transform duration-300 hover:-translate-y-1">
      <div className="relative h-[190px] overflow-hidden">
        <Image src={img} alt={name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent 55%,rgba(10,10,15,0.9) 100%)' }} aria-hidden />
      </div>
      <div className="flex flex-col gap-3.5 p-[22px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#94a3b8]" style={{ fontFamily: 'var(--font-jetbrains)' }}>{game}</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[5px] text-[11px] font-semibold"
            style={{ background: dotBg, color: dotColor }}>
            <span className="size-[5px] rounded-full animate-pulse" style={{ background: dotColor }} aria-hidden />
            {status}
          </span>
        </div>
        <p className="font-bold text-[20px] text-[#f8fafc] leading-tight" style={{ fontFamily: 'var(--font-orbitron)' }}>{name}</p>
        <p className="text-[12px] text-[#94a3b8]">{mode}</p>
        <p className="text-[12px] text-[#94a3b8]">{date}</p>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#f8fafc]" style={{ fontFamily: 'var(--font-jetbrains)' }}>{teams}</span>
          <span className="text-[#22d3ee] cursor-pointer hover:underline">{entry}</span>
        </div>
      </div>
    </GlassPanel>
  )
}

// ── Navigation ────────────────────────────────────────────────────────────
function Nav({ playHover, playClick }: { playHover: () => void; playClick: () => void }) {
  return (
    <header className="sticky top-0 z-50 flex items-center gap-8 h-[86px] px-12 w-full"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(10,10,15,0.80)', backdropFilter: 'blur(24px) saturate(160%)' }}>
      {/* Brand */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex items-center justify-center rounded-[8px] size-[38px]"
          style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)' }}>
          <Image src="/figma/hexagon.svg" alt="" width={22} height={22} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-black text-[15px] text-[#f8fafc]" style={{ fontFamily: 'var(--font-orbitron)' }}>SHADØW</span>
          <span className="text-[8px] text-[#94a3b8]" style={{ fontFamily: 'var(--font-jetbrains)' }}>TOURNAMENTS / PLAY BEYOND</span>
        </div>
      </div>
      {/* Links */}
      <nav className="flex flex-1 items-center justify-center gap-6 text-[12px] text-[#94a3b8]">
        {['Platform', 'Games', 'How it works', 'Docs'].map((l) => (
          <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`}
            className="hover:text-[#f8fafc] transition-colors duration-200"
            onMouseEnter={playHover}>
            {l}
          </a>
        ))}
      </nav>
      {/* CTA */}
      <Link href="/api/auth/login"
        className="flex items-center gap-2 px-[18px] py-[11px] rounded-[8px] text-[13px] font-semibold text-[#f8fafc] shrink-0 transition-all hover:opacity-90 hover:shadow-[0_0_24px_rgba(124,58,237,0.5)]"
        style={{ background: '#7c3aed', border: '1px solid rgba(124,58,237,0.3)' }}
        onMouseEnter={playHover} onClick={playClick}>
        <Image src="/figma/gamepad.svg" alt="" width={16} height={16} />
        Login with Discord
      </Link>
    </header>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { playHover, playClick, playTransition } = useSoundEffects()

  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])
  const heroY       = useTransform(scrollYProgress, [0, 0.6], [0, -50])

  return (
    <div className="bg-[#0a0a0f] min-h-screen flex flex-col overflow-x-hidden">

      {/* Global radial glows */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 65% 0%, rgba(124,58,237,0.12) 0%,transparent 70%),' +
            'radial-gradient(ellipse 50% 40% at 5%  90%, rgba(6,182,212,0.07) 0%,transparent 60%)',
        }} />

      <Nav playHover={playHover} playClick={playClick} />

      {/* ═══════════════════════ HERO ═══════════════════════════════════ */}
      <motion.section ref={heroRef} style={{ opacity: heroOpacity, y: heroY }}
        className="relative z-10 flex items-center gap-12 px-16 pt-16 pb-20 w-full min-h-[680px]">

        {/* Copy */}
        <motion.div className="flex flex-col gap-6 shrink-0 w-[600px] max-w-[50vw]"
          variants={stagger} initial="hidden" animate="visible">

          <motion.div variants={fadeIn}>
            <StatusPill color="cyan" text="DISCORD-NATIVE. COMPETITION-READY." />
          </motion.div>

          <motion.h1 variants={fadeUp}
            className="font-black text-[#f8fafc] leading-[1.12]"
            style={{ fontFamily: 'var(--font-orbitron)', fontSize: 'clamp(2.2rem,4.8vw,3.75rem)' }}>
            YOUR SERVER.{' '}
            <span style={{
              background: 'linear-gradient(135deg,#c084fc 0%,#7c3aed 45%,#22d3ee 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              filter: 'drop-shadow(0 0 18px rgba(124,58,237,0.45))',
            }}>
              YOUR ARENA.
            </span>{' '}
            YOUR LEGACY.
          </motion.h1>

          <motion.p variants={fadeIn} className="text-[17px] text-[#94a3b8] leading-[1.65]">
            Turn your Discord community into a competitive arena. Run mobile esports tournaments,
            rally your squad, and make every match matter.
          </motion.p>

          <motion.div variants={fadeUp} className="flex gap-3.5 items-center flex-wrap">
            <Link href="/api/auth/login"
              className="flex items-center gap-2 px-5 py-3 rounded-[8px] text-[13px] font-semibold text-[#f8fafc] transition-all hover:opacity-90 hover:shadow-[0_0_32px_rgba(124,58,237,0.55)]"
              style={{ background: '#7c3aed', border: '1px solid rgba(124,58,237,0.3)' }}
              onMouseEnter={playHover} onClick={playClick}>
              <Image src="/figma/gamepad.svg" alt="" width={16} height={16} />
              Login with Discord
            </Link>
            <Link href="#platform"
              className="px-5 py-3 rounded-[8px] text-[13px] font-semibold text-[#f8fafc] transition-colors hover:text-[#22d3ee] hover:border-[rgba(34,211,238,0.3)]"
              style={{ background: '#111320', border: '1px solid rgba(255,255,255,0.08)' }}
              onMouseEnter={playHover} onClick={playTransition}>
              Explore the platform →
            </Link>
          </motion.div>

          <motion.p variants={fadeIn} className="text-[11px] text-[#64748b] tracking-widest"
            style={{ fontFamily: 'var(--font-jetbrains)' }}>
            BGMI / FREE FIRE / COD MOBILE
          </motion.p>

          <motion.div variants={fadeIn} className="flex gap-6 text-[12px] text-[#94a3b8]">
            <span>✓ Free tournaments</span>
            <span>✓ One Discord identity</span>
          </motion.div>
        </motion.div>

        {/* 3D scene */}
        <motion.div className="flex-1 min-w-0 flex flex-col gap-4"
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}>
          <div className="w-full rounded-[16px] overflow-hidden relative"
            style={{
              height: 460,
              background: 'rgba(10,10,20,0.5)',
              border: '1px solid rgba(124,58,237,0.18)',
              boxShadow: '0 0 80px rgba(124,58,237,0.12), inset 0 0 40px rgba(0,0,0,0.4)',
            }}>
            {/* HUD corner accents */}
            {['top-left','top-right','bottom-left','bottom-right'].map((pos) => {
              const [v, h] = pos.split('-')
              return (
                <span key={pos} className="absolute size-4 pointer-events-none"
                  style={{
                    [v]: 8, [h]: 8,
                    borderTop:    v === 'top'    ? '2px solid rgba(124,58,237,0.6)' : 'none',
                    borderBottom: v === 'bottom' ? '2px solid rgba(124,58,237,0.6)' : 'none',
                    borderLeft:   h === 'left'   ? '2px solid rgba(124,58,237,0.6)' : 'none',
                    borderRight:  h === 'right'  ? '2px solid rgba(124,58,237,0.6)' : 'none',
                  }} aria-hidden />
              )
            })}
            <HeroSceneWrapper />
            <div className="absolute inset-0 pointer-events-none rounded-[16px]"
              style={{ background: 'linear-gradient(180deg,transparent 60%,rgba(10,10,15,0.75) 100%)' }} aria-hidden />
          </div>
          <div className="flex items-center justify-between text-[9px] text-[#64748b]"
            style={{ fontFamily: 'var(--font-jetbrains)' }}>
            <span>SHADØW / ARENA CORE</span>
            <span className="text-[#22d3ee]">01 — BUILT TO COMPETE</span>
          </div>
        </motion.div>
      </motion.section>

      {/* Game strip */}
      <div className="relative z-10 flex items-center justify-between px-16 py-6 w-full"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span className="font-bold text-[10px] text-[#64748b] tracking-[0.18em] whitespace-nowrap">
          ONE COMMUNITY. EVERY COMPETITION.
        </span>
        {games.map((g) => (
          <span key={g.title}
            className="font-bold text-[15px] text-[#94a3b8] hover:text-[#f8fafc] cursor-default transition-colors"
            style={{ fontFamily: 'var(--font-orbitron)' }}
            onMouseEnter={playHover}>
            {g.title} →
          </span>
        ))}
      </div>

      {/* ═══════════════════ PLATFORM STORY ════════════════════════════ */}
      <section id="platform" className="relative z-10 flex flex-col gap-24 px-16 py-24 w-full">

        {/* ── Features ── */}
        <motion.div className="flex flex-col gap-8"
          variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
          <motion.div variants={fadeUp}>
            <SectionLabel
              code="01 / THE COMPETITIVE ADVANTAGE"
              title="LESS CHAOS. MORE GAME."
              sub="Everything your community needs, from the first registration to the final GG." />
          </motion.div>
          <div className="grid grid-cols-3 gap-5">
            {features.map((f) => (
              <motion.div key={f.title} variants={fadeUp}>
                <GlassPanel className="flex flex-col gap-[18px] p-6 h-full group cursor-default transition-transform duration-300 hover:-translate-y-1">
                  <div className="size-10 flex items-center justify-center rounded-[8px]"
                    style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
                    <Image src={f.icon} alt="" width={22} height={22} />
                  </div>
                  <p className="font-bold text-[19px] text-[#f8fafc]" style={{ fontFamily: 'var(--font-orbitron)' }}>{f.title}</p>
                  <p className="text-[14px] text-[#94a3b8] leading-relaxed">{f.desc}</p>
                  <p className="text-[12px] text-[#22d3ee] group-hover:text-[#67e8f9] transition-colors">Built for your community →</p>
                </GlassPanel>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Games ── */}
        <motion.div id="games" className="flex flex-col gap-8"
          variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
          <motion.div variants={fadeUp}>
            <SectionLabel code="02 / PICK YOUR BATTLEGROUND" title="THREE GAMES. LIMITLESS LEGENDS." />
          </motion.div>
          <div className="grid grid-cols-3 gap-5">
            {games.map((g) => (
              <motion.div key={g.title} variants={fadeUp}
                className="flex flex-col gap-4 group cursor-default"
                onMouseEnter={playHover}>
                <div className="relative h-[300px] rounded-[16px] overflow-hidden">
                  <Image src={g.img} alt={g.title} fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 rounded-[16px] transition-opacity duration-300"
                    style={{ background: 'linear-gradient(180deg,transparent 40%,rgba(10,10,15,0.85) 100%)' }} aria-hidden />
                  {/* Neon outline on hover */}
                  <div className="absolute inset-0 rounded-[16px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ boxShadow: 'inset 0 0 0 1.5px rgba(124,58,237,0.6)' }} aria-hidden />
                </div>
                <p className="font-black text-[21px] text-[#f8fafc]" style={{ fontFamily: 'var(--font-orbitron)' }}>{g.title}</p>
                <p className="text-[12px] text-[#94a3b8]">{g.sub}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── How it works ── */}
        <motion.div id="how-it-works" className="flex flex-col gap-8"
          variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
          <motion.div variants={fadeUp}>
            <SectionLabel code="03 / FROM COMMUNITY TO COMPETITION" title="THREE STEPS. YOU'RE IN." />
          </motion.div>
          <div className="grid grid-cols-3 gap-10">
            {steps.map((s, i) => (
              <motion.div key={s.n} variants={fadeUp}
                className="flex flex-col gap-4 pt-6"
                style={{ borderTop: '2px solid rgba(124,58,237,0.3)' }}>
                <span className="text-[13px] text-[#9f5bff]" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                  {s.n} ─────────
                </span>
                <p className="font-bold text-[22px] text-[#f8fafc]" style={{ fontFamily: 'var(--font-orbitron)' }}>{s.title}</p>
                <p className="text-[14px] text-[#94a3b8] leading-relaxed">{s.desc}</p>
                {/* Tiny step number floating */}
                <span className="text-[48px] font-black text-[#f8fafc] opacity-[0.04] absolute -right-2 -bottom-4 select-none pointer-events-none"
                  aria-hidden style={{ fontFamily: 'var(--font-orbitron)' }}>{i + 1}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Discord integration story ── */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
          <GlassPanel accent className="flex items-center gap-12 p-9">
            {/* Left */}
            <div className="flex flex-col gap-5 flex-1 min-w-0">
              <StatusPill color="purple" text="ONE SERVER. ONE SOURCE OF TRUTH." />
              <h2 className="font-bold text-[29px] text-[#f8fafc] leading-tight" style={{ fontFamily: 'var(--font-orbitron)' }}>
                YOUR COMMUNITY.<br />
                <span style={{ color: '#9f5bff' }}>NOT ANOTHER LOGIN.</span>
              </h2>
              <p className="text-[14px] text-[#94a3b8] leading-relaxed">
                Create on the web. Manage from Discord. Keep announcements, reminders and approved results
                aligned — without spreadsheets or channel-hopping.
              </p>
              <ul className="flex flex-col gap-2">
                {['Role-based access — player, referee, admin',
                  'Live match announcements in your server',
                  'Room credentials delivered by the bot'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[13px] text-[#94a3b8]">
                    <span className="size-1.5 rounded-full bg-[#9f5bff] shrink-0" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <a href="#" className="inline-block w-fit px-[18px] py-3 rounded-[8px] text-[13px] font-semibold text-[#f8fafc] transition-colors hover:text-[#22d3ee]"
                style={{ background: '#111320', border: '1px solid rgba(255,255,255,0.08)' }}
                onMouseEnter={playHover}>
                Read the Discord guide →
              </a>
            </div>

            {/* Right: bot preview */}
            <div className="rounded-[12px] p-6 shrink-0 w-[460px] flex flex-col gap-4"
              style={{ background: '#070710', border: '1px solid rgba(255,255,255,0.06)' }}>
              {/* Bot identity */}
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center rounded-[8px] size-9"
                  style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}>
                  <Image src="/figma/bot.svg" alt="" width={18} height={18} />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="font-semibold text-[13px] text-[#f8fafc]" style={{ fontFamily: 'var(--font-orbitron)' }}>SHADØW</span>
                  <span className="text-[10px] text-[#22d3ee]" style={{ fontFamily: 'var(--font-jetbrains)' }}>BOT · TODAY</span>
                </div>
              </div>
              {/* Embed */}
              <div className="rounded-[10px] p-4 flex flex-col gap-2"
                style={{ background: 'rgba(22,33,62,0.7)', borderLeft: '3px solid #7c3aed' }}>
                <p className="font-bold text-[13px] text-[#f8fafc]">🏆 Nightfall Series — Match #4</p>
                <p className="text-[12px] text-[#94a3b8]">Room ID and password have been distributed to all checked-in squads.</p>
                <p className="text-[12px] text-[#94a3b8]">Check-in closes in <span className="text-[#22d3ee] font-semibold">5 minutes</span>.</p>
              </div>
              {/* Buttons */}
              <div className="flex gap-2">
                {['Check In', 'View Bracket', 'Dispute'].map((b, i) => (
                  <button key={b} type="button" className="px-3 py-1.5 rounded-[6px] text-[11px] font-semibold text-[#f8fafc] cursor-default"
                    style={{
                      background: i === 0 ? '#7c3aed' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${i === 0 ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    }}>
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </GlassPanel>
        </motion.div>

        {/* ── Live & next up ── */}
        <motion.div id="platform-live" className="flex flex-col gap-8"
          variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
          <motion.div variants={fadeUp} className="flex items-end justify-between">
            <SectionLabel
              code="ON THE BATTLEGROUND"
              title="LIVE & NEXT UP"
              sub="Catch the action, or make sure your squad is in the next drop." />
            <Link href="/api/auth/login"
              className="shrink-0 px-[18px] py-3 rounded-[8px] text-[13px] font-semibold text-[#f8fafc] transition-colors hover:text-[#22d3ee]"
              style={{ background: '#111320', border: '1px solid rgba(255,255,255,0.08)' }}
              onMouseEnter={playHover} onClick={playTransition}>
              All tournaments →
            </Link>
          </motion.div>
          <motion.div variants={fadeUp} className="flex gap-6 items-stretch">
            {liveMatches.map((m) => (
              <TournamentCard key={m.name} {...m} />
            ))}
          </motion.div>
        </motion.div>

        {/* ── Stats strip ── */}
        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
          <GlassPanel className="grid grid-cols-4 divide-x" style={{ borderColor: 'rgba(255,255,255,0.08)' } as React.CSSProperties}>
            {[
              { val: '3,400+', label: 'ACTIVE PLAYERS' },
              { val: '128',    label: 'TOURNAMENTS RUN' },
              { val: '99.9%',  label: 'UPTIME' },
              { val: 'Free',   label: 'ENTRY FOREVER' },
            ].map(({ val, label }) => (
              <motion.div key={label} variants={fadeUp} className="flex flex-col items-center gap-2 py-8">
                <span className="font-black text-[32px] text-[#f8fafc]"
                  style={{ fontFamily: 'var(--font-orbitron)', color: '#9f5bff', textShadow: '0 0 20px rgba(159,91,255,0.4)' }}>
                  {val}
                </span>
                <span className="text-[10px] text-[#64748b] tracking-widest" style={{ fontFamily: 'var(--font-jetbrains)' }}>{label}</span>
              </motion.div>
            ))}
          </GlassPanel>
        </motion.div>

        {/* ── Final CTA ── */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
          className="relative overflow-hidden flex flex-col items-center gap-7 rounded-[20px] py-24 px-16 text-center"
          style={{
            background: 'linear-gradient(135deg,rgba(124,58,237,0.15) 0%,rgba(22,33,62,0.4) 50%,rgba(6,182,212,0.10) 100%)',
            border: '1px solid rgba(124,58,237,0.25)',
          }}>
          {/* Grid BG */}
          <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden
            style={{
              backgroundImage:
                'linear-gradient(rgba(6,182,212,0.08) 1px,transparent 1px),' +
                'linear-gradient(90deg,rgba(6,182,212,0.08) 1px,transparent 1px)',
              backgroundSize: '40px 40px',
            }} />
          {/* Glow orb */}
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[400px] rounded-full opacity-20 blur-[80px]"
            style={{ background: 'radial-gradient(circle,#7c3aed,transparent)' }} aria-hidden />

          <StatusPill color="purple" text="YOUR NEXT LEGEND STARTS HERE." />
          <h2 className="font-black text-[52px] text-[#f8fafc] leading-tight relative z-10"
            style={{ fontFamily: 'var(--font-orbitron)' }}>
            READY TO{' '}
            <span style={{
              background: 'linear-gradient(90deg,#c084fc,#7c3aed,#22d3ee)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>COMPETE?</span>
          </h2>
          <p className="text-[16px] text-[#94a3b8] max-w-xl relative z-10 leading-relaxed">
            Join thousands of players already running tournaments on their Discord servers.
            Free. Forever.
          </p>
          <Link href="/api/auth/login"
            className="relative z-10 flex items-center gap-2.5 px-8 py-4 rounded-[10px] text-[15px] font-bold text-[#f8fafc] transition-all hover:opacity-90 hover:shadow-[0_0_48px_rgba(124,58,237,0.6)] hover:-translate-y-0.5"
            style={{ background: '#7c3aed', border: '1px solid rgba(124,58,237,0.35)' }}
            onMouseEnter={playHover} onClick={playClick}>
            <Image src="/figma/gamepad.svg" alt="" width={18} height={18} />
            Login with Discord — It's Free
          </Link>
        </motion.div>
      </section>

      {/* ═══════════════════════ FOOTER ══════════════════════════════════ */}
      <footer className="relative z-10 flex items-center justify-between px-16 py-6 w-full"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2.5">
          <Image src="/figma/hexagon.svg" alt="" width={18} height={18} className="opacity-60" />
          <span className="text-[12px] text-[#64748b]">© {new Date().getFullYear()} SHADØW TOURNAMENTS</span>
        </div>
        <div className="flex gap-6 text-[12px] text-[#64748b]">
          {['Privacy', 'Terms', 'Docs', 'Discord'].map((l) => (
            <a key={l} href="#" className="hover:text-[#94a3b8] transition-colors">{l}</a>
          ))}
        </div>
        <span className="text-[10px] text-[#475569] tracking-widest" style={{ fontFamily: 'var(--font-jetbrains)' }}>
          BGMI / FREE FIRE / COD MOBILE
        </span>
      </footer>
    </div>
  )
}
