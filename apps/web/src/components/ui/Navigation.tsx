'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Menu, X, ChevronDown } from 'lucide-react'
import { GlowButton } from './GlowButton'
import { NeonText } from './NeonText'
import { GlassCard } from './GlassCard'
import { StatusPulse } from './StatusPulse'
import { cn } from '@/lib/utils'

interface UserProfile {
  id: string
  username: string
  avatar: string | null
  discriminator: string
  globalRole?: string
}

interface NavLink {
  href: string
  label: string
}

const navLinks: NavLink[] = [
  { href: '/servers', label: 'Servers' },
  { href: '/docs', label: 'Documentation' },
]

export default function Navigation() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [scanDone, setScanDone] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { user: UserProfile } | null) => {
        if (data?.user) setUser(data.user)
      })
      .catch(() => null)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setScanDone(true), 600)
    return () => clearTimeout(timer)
  }, [])

  // Close drawers on route change
  useEffect(() => {
    setMobileOpen(false)
    setDropdownOpen(false)
    setNotifOpen(false)
  }, [pathname])

  return (
    <>
      <nav
        className="sticky top-0 z-50 w-full"
        style={{
          backdropFilter: 'blur(16px)',
          backgroundColor: 'rgba(5,5,8,0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Animated scan line — plays once on mount */}
        {!scanDone && (
          <div
            className="absolute bottom-0 left-0 h-px w-full pointer-events-none"
            style={{
              background: 'rgba(6,182,212,0.6)',
              animation: 'hud-slide-in 0.5s ease-out forwards',
            }}
            aria-hidden="true"
          />
        )}

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">

            {/* ── LEFT: Logo ── */}
            <Link
              href="/"
              className="flex items-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed] rounded-md"
              aria-label="SHADØW TOURNAMENTS home"
            >
              <Image
                src="/shadow-logo.png"
                alt="SHADØW TOURNAMENTS"
                width={32}
                height={32}
                unoptimized
                className="rounded"
              />
              <span
                className="font-bold text-white"
                style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)' }}
              >
                SHADØW
              </span>
              <span
                className="text-violet-400"
                style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)' }}
              >
                TOURNAMENTS
              </span>
              {/* SYNCED badge */}
              <span className="hidden sm:flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded text-[9px] font-mono tracking-widest uppercase border border-[rgba(34,197,94,0.4)] bg-[rgba(34,197,94,0.08)] text-[#22c55e]">
                <StatusPulse variant="synced" className="w-1.5 h-1.5" />
                SYNCED
              </span>
            </Link>

            {/* ── CENTER: Desktop nav links ── */}
            <div className="hidden lg:flex items-center gap-1" role="list">
              {navLinks.map((link) => {
              const isActive = pathname?.startsWith(link.href) ?? false
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    role="listitem"
                    className={cn(
                      'relative px-3 py-1.5 text-xs font-mono tracking-widest uppercase transition-colors duration-150 rounded-sm',
                      isActive
                        ? 'text-[#7c3aed]'
                        : 'text-[#64748b] hover:text-white'
                    )}
                    style={
                      isActive
                        ? { textShadow: '0 0 10px rgba(124,58,237,0.9)' }
                        : undefined
                    }
                  >
                    {link.label}
                    {isActive && (
                      <span
                        className="absolute -bottom-0.5 left-0 right-0 h-px rounded-full"
                        style={{
                          background: '#7c3aed',
                          boxShadow: '0 0 8px rgba(124,58,237,0.9)',
                        }}
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                )
              })}
            </div>

            {/* ── RIGHT: Bell + Avatar ── */}
            <div className="flex items-center gap-3">
              {/* Notification bell */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotifOpen((v) => !v)}
                  className="relative p-2 rounded-md text-[#64748b] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed]"
                  aria-label="Notifications"
                  aria-expanded={notifOpen}
                >
                  <Bell size={16} aria-hidden="true" />
                  {/* Unread dot */}
                  <span
                    className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#7c3aed] animate-pulse"
                    aria-hidden="true"
                  />
                </button>

                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-64"
                    >
                      <GlassCard neonColor="violet" className="py-3 rounded-xl overflow-hidden shadow-xl">
                        <p className="px-4 py-1 text-[10px] font-mono tracking-widest uppercase text-[#7c3aed]">
                          Notifications
                        </p>
                        <div className="border-t border-white/5 my-1" />
                        <p className="px-4 py-2 text-xs text-[#64748b]">No new notifications</p>
                      </GlassCard>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User avatar / login */}
              {user ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed] rounded-full"
                    aria-haspopup="true"
                    aria-expanded={dropdownOpen}
                  >
                    {user.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=32`}
                        alt={user.username}
                        className="w-8 h-8 rounded-full border border-[rgba(124,58,237,0.5)] ring-1 ring-[rgba(124,58,237,0.3)]"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[rgba(124,58,237,0.3)] border border-[rgba(124,58,237,0.5)] flex items-center justify-center text-xs font-bold text-white">
                        {user.username[0].toUpperCase()}
                      </div>
                    )}
                    {/* Role badge */}
                    {user.globalRole && (
                      <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-mono tracking-wider uppercase border border-[rgba(6,182,212,0.4)] bg-[rgba(6,182,212,0.08)] text-[#06b6d4]">
                        {user.globalRole}
                      </span>
                    )}
                    <ChevronDown
                      size={12}
                      className={cn('text-[#64748b] transition-transform hidden sm:block', dropdownOpen && 'rotate-180')}
                      aria-hidden="true"
                    />
                  </button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-44"
                      >
                        <GlassCard neonColor="violet" className="py-1 rounded-xl overflow-hidden shadow-xl">
                          <div className="px-4 py-2 border-b border-white/5">
                            <p className="text-xs font-semibold text-white truncate">{user.username}</p>
                            <p className="text-[10px] text-[#64748b] font-mono">#{user.discriminator}</p>
                          </div>
                          <Link
                            href="/servers"
                            className="block px-4 py-2 text-xs text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors font-mono tracking-wide"
                            onClick={() => setDropdownOpen(false)}
                          >
                            My Servers
                          </Link>
                          <div className="border-t border-white/5 my-1" />
                          <Link
                            href="/api/auth/logout"
                            className="block px-4 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors font-mono tracking-wide"
                            onClick={() => setDropdownOpen(false)}
                          >
                            Log Out
                          </Link>
                        </GlassCard>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <GlowButton variant="primary" size="sm" asChild>
                  <Link href="/api/auth/login" className="no-underline text-white text-xs">
                    Login with Discord
                  </Link>
                </GlowButton>
              )}

              {/* Mobile hamburger */}
              <button
                type="button"
                className="lg:hidden p-2 rounded-md text-[#64748b] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed]"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile slide-drawer ── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              key="mobile-drawer"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="lg:hidden overflow-hidden"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div
                className="py-4 px-4 flex flex-col gap-1"
                style={{ backgroundColor: 'rgba(5,5,8,0.98)' }}
              >
                {navLinks.map((link) => {
                  const isActive = pathname === link.href
                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      className={cn(
                        'text-xs font-mono tracking-widest uppercase px-3 py-2.5 rounded-sm transition-colors border-l-2',
                        isActive
                          ? 'text-[#7c3aed] border-[#7c3aed] bg-[rgba(124,58,237,0.08)]'
                          : 'text-[#64748b] hover:text-white border-transparent hover:bg-white/5'
                      )}
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </Link>
                  )
                })}
                <div className="mt-3 pt-3 border-t border-white/5">
                  {user ? (
                    <Link
                      href="/api/auth/logout"
                      className="text-xs font-mono tracking-widest uppercase px-3 py-2.5 text-red-400 hover:text-red-300"
                      onClick={() => setMobileOpen(false)}
                    >
                      Log Out
                    </Link>
                  ) : (
                    <GlowButton variant="primary" size="sm" asChild>
                      <Link href="/api/auth/login" className="no-underline text-white text-xs" onClick={() => setMobileOpen(false)}>
                        Login with Discord
                      </Link>
                    </GlowButton>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  )
}
