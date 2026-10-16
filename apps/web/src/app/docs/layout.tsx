'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

// ─── Sidebar nav items ────────────────────────────────────────────────────────

const navItems = [
  { label: 'Getting Started', href: '/docs/getting-started' },
  { label: 'Server Setup', href: '/docs/server-setup' },
  { label: 'Create Tournament', href: '/docs/tournaments/create' },
  { label: 'Registration Formats', href: '/docs/tournaments/formats' },
  { label: 'Discord Commands', href: '/docs/discord-commands' },
  { label: 'Scoring Guide', href: '/docs/scoring-guide' },
  { label: 'FAQ', href: '/docs/faq' },
]

// ─── Sidebar component ────────────────────────────────────────────────────────

function DocsSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Docs navigation">
      <p
        className="text-xs font-mono uppercase tracking-widest mb-4"
        style={{ color: 'var(--color-accent-2)', fontFamily: 'var(--font-jetbrains, monospace)' }}
      >
        Documentation
      </p>
      <ul className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className="block px-3 py-2 rounded-lg text-sm transition-colors"
                style={{
                  color: isActive ? '#f8fafc' : 'var(--color-text-secondary)',
                  background: isActive ? 'rgba(124,58,237,0.20)' : 'transparent',
                  borderLeft: isActive ? '2px solid #7c3aed' : '2px solid transparent',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
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
      {/* Top bar */}
      <header
        className="sticky top-0 z-50 border-b px-4 h-14 flex items-center justify-between"
        style={{
          background: 'rgba(10,10,15,0.85)',
          backdropFilter: 'blur(12px)',
          borderColor: 'var(--color-border)',
        }}
      >
        <Link
          href="/"
          className="text-lg font-black tracking-widest"
          style={{ fontFamily: 'var(--font-orbitron, Orbitron, sans-serif)', color: '#f8fafc' }}
        >
          LEGENDARY <span style={{ color: 'var(--color-accent)' }}>ESPORTS</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/docs"
            className="hidden sm:block text-sm transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Docs
          </Link>
          {/* Mobile menu toggle */}
          <button
            className="flex items-center justify-center w-8 h-8 rounded-lg lg:hidden"
            style={{ background: 'rgba(124,58,237,0.15)', color: '#f8fafc' }}
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={drawerOpen}
          >
            <span aria-hidden="true">{drawerOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer panel */}
      <aside
        className="fixed top-14 left-0 bottom-0 z-50 w-64 overflow-y-auto p-6 lg:hidden transition-transform"
        style={{
          background: 'var(--color-bg-secondary)',
          borderRight: '1px solid var(--color-border)',
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
        }}
        aria-label="Mobile docs navigation"
      >
        <DocsSidebar onClose={() => setDrawerOpen(false)} />
      </aside>

      {/* Main 3-column grid */}
      <div className="max-w-7xl mx-auto flex px-4 py-10 gap-8">
        {/* Desktop sidebar */}
        <aside
          className="hidden lg:block w-56 flex-shrink-0"
          aria-label="Docs sidebar"
        >
          <div className="sticky top-24">
            <DocsSidebar />
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>

        {/* On this page — static placeholder anchors */}
        <aside
          className="hidden xl:block w-48 flex-shrink-0"
          aria-label="On this page"
        >
          <div className="sticky top-24">
            <p
              className="text-xs font-mono uppercase tracking-widest mb-4"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-jetbrains, monospace)' }}
            >
              On this page
            </p>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <li>
                <a href="#overview" className="hover:text-white transition-colors">Overview</a>
              </li>
              <li>
                <a href="#quick-start" className="hover:text-white transition-colors">Quick Start</a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">Features</a>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
