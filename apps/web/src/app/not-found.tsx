import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* HUD grid background */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage:
            'linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Scanline effect */}
      <div className="scanline-overlay" aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 1 }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* Glitch 404 */}
        <h1
          className="glitch-text"
          data-text="404"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(96px, 20vw, 200px)',
            fontWeight: 900,
            lineHeight: 1,
            color: 'var(--color-neon-violet)',
            textShadow:
              '0 0 20px rgba(124,58,237,0.9), 0 0 60px rgba(124,58,237,0.5), 0 0 100px rgba(124,58,237,0.2)',
            marginBottom: '0',
            letterSpacing: '-0.02em',
          }}
        >
          404
        </h1>

        {/* SIGNAL LOST subtitle */}
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'clamp(18px, 4vw, 28px)',
            fontWeight: 700,
            letterSpacing: '0.4em',
            color: 'var(--color-neon-cyan)',
            textShadow: '0 0 12px rgba(6,182,212,0.9), 0 0 30px rgba(6,182,212,0.5)',
            marginBottom: '24px',
            textTransform: 'uppercase',
          }}
        >
          SIGNAL LOST
        </p>

        {/* Terminal block */}
        <div
          style={{
            margin: '0 auto 40px',
            padding: '20px 28px',
            borderRadius: '12px',
            background: 'rgba(10,10,20,0.85)',
            border: '1px solid rgba(6,182,212,0.20)',
            backdropFilter: 'blur(16px)',
            maxWidth: '480px',
            textAlign: 'left',
            boxShadow: '0 0 24px rgba(6,182,212,0.08)',
          }}
        >
          {/* Terminal title bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            <span style={{ marginLeft: '8px', fontSize: '11px', color: '#64748b', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
              terminal — node error
            </span>
          </div>

          {/* Terminal lines */}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: '1.8' }}>
            <div style={{ color: '#64748b' }}>
              $ <span style={{ color: '#94a3b8' }}>resolve</span>{' '}
              <span style={{ color: '#ef4444' }}>--node=current</span>
            </div>
            <div style={{ color: '#ef4444' }}>
              ERROR: NODE_NOT_FOUND
            </div>
            <div style={{ color: '#64748b' }}>
              › <span style={{ color: '#f59e0b' }}>HTTP 404</span> — requested path does not exist in the routing table
            </div>
            <div style={{ color: '#64748b' }}>
              › <span style={{ color: '#22c55e' }}>SUGGESTION</span> — navigate to <span style={{ color: '#06b6d4' }}>/</span> to reestablish connection
            </div>
            <div style={{ color: '#7c3aed' }}>
              ▋
            </div>
          </div>
        </div>

        {/* CTA back to home */}
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 28px',
            borderRadius: '10px',
            background: 'linear-gradient(90deg, #06b6d4, #22d3ee)',
            color: '#050508',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            boxShadow: '0 0 20px rgba(6,182,212,0.5), 0 0 40px rgba(6,182,212,0.2)',
            transition: 'all 0.2s ease',
          }}
        >
          ← RETURN TO BASE
        </Link>

        {/* Faint background text decoration */}
        <p
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 'clamp(180px, 35vw, 360px)',
            fontWeight: 900,
            fontFamily: 'var(--font-display)',
            color: 'rgba(124,58,237,0.04)',
            letterSpacing: '-0.05em',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: -1,
          }}
        >
          LOST
        </p>
      </div>
    </div>
  )
}
