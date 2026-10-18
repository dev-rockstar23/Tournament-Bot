'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Sidebar nav items ────────────────────────────────────────────────────────

const navItems = [
  { label: 'Overview',              href: '/docs',                        icon: '◈' },
  { label: 'Getting Started',       href: '/docs/getting-started',        icon: '⚡' },
  { label: 'Create Tournament',     href: '/docs/tournaments/create',     icon: '🏆' },
  { label: 'Registration Formats',  href: '/docs/tournaments/formats',    icon: '📋' },
  { label: 'Discord Commands',      href: '/docs/discord-commands',       icon: '🤖' },
]

// ─── Sidebar component ────────────────────────────────────────────────────────

function DocsSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Docs navigation">
      {/* Section label */}
      <p
        className="text-xs font-mono uppercase tracking-widest mb-4"
        style={{
          color: 'var(--color-neon-cyan)',
          textShadow: '0 0 8px rgba(6,182,212,0.6)',
          letterSpacing: '0.25em',
        }}
      >
        // DOCUMENTATION
      </p>

      <ul className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className="group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150"
                style={{
                  color: isActive ? '#f8fafc' : 'var(--color-text-secondary)',
                  background: isActive
                    ? 'linear-gradient(90deg, rgba(124,58,237,0.25) 0%, rgba(124,58,237,0.08) 100%)'
                    : 'transparent',
                  borderLeft: isActive
                    ? '2px solid var(--color-neon-violet)'
                    : '2px solid transparent',
                  boxShadow: isActive ? 'inset 0 0 12px rgba(124,58,237,0.1)' : 'none',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    fontSize: '13px',
                    color: isActive ? 'var(--color-neon-violet)' : 'var(--color-text-muted)',
                    filter: isActive ? 'drop-shadow(0 0 4px rgba(124,58,237,0.8))' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {item.icon}
                </span>
                <span className="font-mono" style={{ letterSpacing: '0.03em' }}>
                  {item.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Divider */}
      <div
        className="my-5"
        style={{ height: '1px', background: 'linear-gradient(90deg, rgba(124,58,237,0.3) 0%, transparent 100%)' }}
      />

      {/* Version badge */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{
          background: 'rgba(6,182,212,0.06)',
          border: '1px solid rgba(6,182,212,0.2)',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--color-neon-green)',
            boxShadow: '0 0 6px rgba(34,197,94,0.8)',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <span className="text-xs font-mono" style={{ color: 'var(--color-neon-cyan)', letterSpacing: '0.15em' }}>
          v2.0 · STABLE
        </span>
      </div>
    </nav>
  )
}

// ─── Search bar ───────────────────────────────────────────────────────────────

function DocsSearch() {
  const [query, setQuery] = useState('')

  return (
    <div className="relative" style={{ maxWidth: '420px', width: '100%' }}>
      {/* Cyber prefix */}
      <span
        className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs select-none pointer-events-none"
        style={{ color: 'var(--color-neon-cyan)' }}
        aria-hidden="true"
      >
        &gt;_
      </span>
      <input
        type="search"
        placeholder="SEARCH DOCS..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full pl-10 pr-4 py-2 text-xs rounded-lg outline-none"
        style={{
          background: 'rgba(10,10,20,0.80)',
          border: '1px solid rgba(6,182,212,0.25)',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.1em',
          boxShadow: query ? '0 0 12px rgba(6,182,212,0.15)' : 'none',
          transition: 'box-shadow 0.2s',
        }}
        aria-label="Search documentation"
      />
    </div>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
    >
      {/* HUD grid bg on the whole page */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          backgroundImage:
            'linear-gradient(rgba(6,182,212,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.025) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.8,
        }}
      />

      {/* ── Top header ── */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(5,5,8,0.88)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(6,182,212,0.20)',
          boxShadow: '0 0 24px rgba(6,182,212,0.07)',
        }}
      >
        <div
          className="max-w-7xl mx-auto flex items-center justify-between px-4 h-14 gap-4"
        >
          {/* Brand */}
          <Link
            href="/"
            className="text-sm font-black tracking-widest flex-shrink-0"
            style={{
              fontFamily: 'var(--font-display)',
              color: '#f8fafc',
            }}
          >
            LEGENDARY{' '}
            <span
              className="neon-text-violet"
            >
              ESPORTS
            </span>
          </Link>

          {/* Search */}
          <div className="hidden sm:flex flex-1 justify-center">
            <DocsSearch />
          </div>

          {/* Right: nav link + mobile toggle */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/docs"
              className="hidden sm:block text-xs font-mono uppercase tracking-widest transition-colors"
              style={{ color: 'var(--color-neon-cyan)' }}
            >
              Docs
            </Link>
            <Link
              href="/servers"
              className="hidden sm:block text-xs font-mono uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: 'linear-gradient(90deg, #7c3aed, #9f5bff)',
                color: '#f8fafc',
                boxShadow: '0 0 12px rgba(124,58,237,0.4)',
              }}
            >
              Dashboard
            </Link>

            {/* Mobile toggle */}
            <button
              className="flex items-center justify-center w-8 h-8 rounded-lg lg:hidden"
              style={{
                background: 'rgba(124,58,237,0.15)',
                border: '1px solid rgba(124,58,237,0.3)',
                color: '#f8fafc',
              }}
              onClick={() => setDrawerOpen((v) => !v)}
              aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={drawerOpen}
            >
              <span aria-hidden="true" className="text-sm">{drawerOpen ? '✕' : '☰'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            key="drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer panel */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.aside
            key="drawer-panel"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="fixed top-14 left-0 bottom-0 z-50 w-64 overflow-y-auto p-6 lg:hidden"
            style={{
              background: 'rgba(13,13,24,0.97)',
              backdropFilter: 'blur(20px)',
              borderRight: '1px solid rgba(6,182,212,0.20)',
              boxShadow: '4px 0 24px rgba(6,182,212,0.08)',
            }}
            aria-label="Mobile docs navigation"
          >
            <DocsSidebar onClose={() => setDrawerOpen(false)} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main layout grid ── */}
      <div className="relative z-10 max-w-7xl mx-auto flex px-4 py-8 gap-8">

        {/* Desktop sidebar */}
        <aside
          className="hidden lg:block w-56 flex-shrink-0"
          aria-label="Docs sidebar"
        >
          <div
            className="sticky top-24 p-5 rounded-xl"
            style={{
              background: 'rgba(13,13,24,0.80)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(6,182,212,0.15)',
              boxShadow: '0 0 24px rgba(124,58,237,0.06)',
            }}
          >
            <DocsSidebar />
          </div>
        </aside>

        {/* Content area */}
        <main className="flex-1 min-w-0">
          {/* Content wrapper: cyberpunk doc styling */}
          <div
            className="p-6 sm:p-8 rounded-xl"
            style={{
              background: 'rgba(13,13,24,0.70)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 0 32px rgba(0,0,0,0.4)',
            }}
          >
            {children}
          </div>
        </main>

        {/* On this page — right rail */}
        <aside
          className="hidden xl:block w-48 flex-shrink-0"
          aria-label="On this page"
        >
          <div className="sticky top-24">
            <p
              className="text-xs font-mono uppercase tracking-widest mb-4"
              style={{
                color: 'var(--color-neon-violet)',
                textShadow: '0 0 6px rgba(124,58,237,0.6)',
                letterSpacing: '0.2em',
              }}
            >
              // ON THIS PAGE
            </p>
            <ul className="space-y-2">
              {[
                { href: '#overview',     label: 'Overview' },
                { href: '#quick-start',  label: 'Quick Start' },
                { href: '#features',     label: 'Features' },
              ].map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-xs font-mono transition-colors block py-1"
                    style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.05em' }}
                    onFocus={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-neon-cyan)' }}
                    onBlur={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-secondary)' }}
                  >
                    › {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
