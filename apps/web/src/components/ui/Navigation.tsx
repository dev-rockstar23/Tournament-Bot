'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { GlowButton } from './GlowButton'
import { cn } from '@/lib/utils'

interface UserProfile {
  id: string
  username: string
  avatar: string | null
  discriminator: string
}

export default function Navigation() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    // Check session via API route to avoid importing Supabase SSR client in client component
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { user: UserProfile } | null) => {
        if (data?.user) setUser(data.user)
      })
      .catch(() => null)
  }, [])

  const navLinks = [
    { href: '/docs', label: 'Docs' },
  ]

  return (
    <nav
      className="sticky top-0 z-50 w-full backdrop-blur-md bg-black/20 border-b border-white/5"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed] rounded-md"
          >
            <span
              className="text-lg font-black tracking-widest text-white"
              style={{ fontFamily: 'var(--font-display, Orbitron, sans-serif)' }}
            >
              LEGENDARY{' '}
              <span className="text-[#7c3aed]">ESPORTS</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm transition-colors duration-150',
                  pathname === link.href
                    ? 'text-white font-semibold'
                    : 'text-[#94a3b8] hover:text-white'
                )}
              >
                {link.label}
              </Link>
            ))}

            {user ? (
              <div className="relative">
                <button
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
                      className="w-8 h-8 rounded-full border border-white/10"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#7c3aed]/40 border border-[#7c3aed]/30 flex items-center justify-center text-xs font-bold text-white">
                      {user.username[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-white">{user.username}</span>
                  <svg
                    className={cn('w-4 h-4 text-[#94a3b8] transition-transform', dropdownOpen && 'rotate-180')}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-40 glass-card py-1 rounded-xl overflow-hidden shadow-xl">
                    <Link
                      href="/servers"
                      className="block px-4 py-2 text-sm text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      My Servers
                    </Link>
                    <div className="border-t border-white/5 my-1" />
                    <Link
                      href="/api/auth/logout"
                      className="block px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Log Out
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <GlowButton variant="primary" size="sm" asChild>
                <Link href="/api/auth/login" className="no-underline text-white">
                  Login with Discord
                </Link>
              </GlowButton>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md text-[#94a3b8] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed]"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-white/5 flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm px-2 py-1 transition-colors',
                  pathname === link.href ? 'text-white font-semibold' : 'text-[#94a3b8] hover:text-white'
                )}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <Link
                href="/api/auth/logout"
                className="text-sm px-2 py-1 text-red-400 hover:text-red-300"
                onClick={() => setMobileOpen(false)}
              >
                Log Out
              </Link>
            ) : (
              <GlowButton variant="primary" size="sm" asChild>
                <Link href="/api/auth/login" className="no-underline text-white" onClick={() => setMobileOpen(false)}>
                  Login with Discord
                </Link>
              </GlowButton>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
