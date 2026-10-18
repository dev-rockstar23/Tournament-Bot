'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <head>
        <title>System Failure — Legendary Esports</title>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=JetBrains+Mono:wght@400;500&display=swap');

          * { box-sizing: border-box; margin: 0; padding: 0; }

          body {
            background: #050508;
            color: #f8fafc;
            font-family: 'JetBrains Mono', monospace;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 2rem;
            overflow: hidden;
          }

          /* HUD grid */
          body::before {
            content: '';
            position: fixed;
            inset: 0;
            background-image:
              linear-gradient(rgba(239,68,68,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(239,68,68,0.03) 1px, transparent 1px);
            background-size: 32px 32px;
            pointer-events: none;
            z-index: 0;
          }

          .container {
            position: relative;
            z-index: 1;
            max-width: 640px;
            width: 100%;
          }

          .heading {
            font-family: 'Orbitron', sans-serif;
            font-size: clamp(32px, 8vw, 72px);
            font-weight: 900;
            letter-spacing: 0.05em;
            color: #ef4444;
            text-shadow:
              0 0 20px rgba(239,68,68,0.9),
              0 0 60px rgba(239,68,68,0.5),
              0 0 100px rgba(239,68,68,0.2);
            line-height: 1.1;
            margin-bottom: 12px;
            animation: glitch-red 4s step-end infinite;
          }

          @keyframes glitch-red {
            0%, 90%, 100% { text-shadow: 0 0 20px rgba(239,68,68,0.9), 0 0 60px rgba(239,68,68,0.5); transform: none; }
            92% { transform: translate(-2px, 0); text-shadow: 2px 0 rgba(6,182,212,0.8), -2px 0 rgba(239,68,68,0.8); }
            94% { transform: translate(2px, 0); text-shadow: -2px 0 rgba(6,182,212,0.8), 2px 0 rgba(239,68,68,0.8); }
            96% { transform: translate(-1px, 0); }
          }

          .subtitle {
            font-family: 'JetBrains Mono', monospace;
            font-size: clamp(12px, 2.5vw, 18px);
            font-weight: 700;
            letter-spacing: 0.35em;
            color: #f59e0b;
            text-shadow: 0 0 10px rgba(245,158,11,0.8);
            text-transform: uppercase;
            margin-bottom: 32px;
            animation: flicker 3s step-end infinite;
          }

          @keyframes flicker {
            0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
            20%, 22%, 24%, 55% { opacity: 0.4; }
          }

          .terminal {
            background: rgba(10,10,20,0.90);
            border: 1px solid rgba(239,68,68,0.30);
            border-radius: 12px;
            padding: 20px 24px;
            text-align: left;
            margin: 0 auto 32px;
            box-shadow:
              0 0 24px rgba(239,68,68,0.1),
              inset 0 1px 0 rgba(255,255,255,0.03);
          }

          .terminal-titlebar {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 14px;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(239,68,68,0.15);
          }

          .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
          .dot-red    { background: #ef4444; }
          .dot-amber  { background: #f59e0b; }
          .dot-green  { background: #22c55e; }

          .terminal-title {
            margin-left: 8px;
            font-size: 11px;
            color: #64748b;
            letter-spacing: 0.1em;
          }

          .terminal-line {
            font-size: 13px;
            line-height: 1.9;
            font-family: 'JetBrains Mono', monospace;
          }

          .c-red    { color: #ef4444; }
          .c-amber  { color: #f59e0b; }
          .c-cyan   { color: #06b6d4; }
          .c-muted  { color: #64748b; }
          .c-violet { color: #9f5bff; }

          .error-block {
            margin-top: 12px;
            padding: 10px 14px;
            background: rgba(239,68,68,0.06);
            border-left: 3px solid rgba(239,68,68,0.5);
            border-radius: 4px;
            font-size: 12px;
            color: #fca5a5;
            word-break: break-all;
            white-space: pre-wrap;
          }

          .reset-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 28px;
            border-radius: 10px;
            background: linear-gradient(90deg, #ef4444, #dc2626);
            color: #f8fafc;
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            border: none;
            cursor: pointer;
            box-shadow:
              0 0 20px rgba(239,68,68,0.5),
              0 0 40px rgba(239,68,68,0.2);
            transition: all 0.2s ease;
          }

          .reset-btn:hover {
            background: linear-gradient(90deg, #dc2626, #b91c1c);
            box-shadow:
              0 0 28px rgba(239,68,68,0.7),
              0 0 60px rgba(239,68,68,0.3);
          }

          .bg-deco {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-family: 'Orbitron', sans-serif;
            font-size: clamp(120px, 25vw, 300px);
            font-weight: 900;
            color: rgba(239,68,68,0.04);
            letter-spacing: -0.05em;
            white-space: nowrap;
            pointer-events: none;
            user-select: none;
            z-index: 0;
          }
        `}</style>
      </head>
      <body>
        <p className="bg-deco" aria-hidden="true">DEAD</p>

        <div className="container">
          <h1 className="heading">SYSTEM FAILURE</h1>
          <p className="subtitle">CRITICAL EXCEPTION</p>

          {/* Terminal error block */}
          <div className="terminal">
            <div className="terminal-titlebar">
              <span className="dot dot-red" />
              <span className="dot dot-amber" />
              <span className="dot dot-green" />
              <span className="terminal-title">runtime — exception log</span>
            </div>

            <div className="terminal-line c-muted">
              $ <span className="c-cyan">node</span>{' '}
              <span className="c-red">--abort-on-uncaught-exception</span>
            </div>
            <div className="terminal-line">
              <span className="c-red">✖ UNCAUGHT EXCEPTION</span>
            </div>
            <div className="terminal-line c-muted">
              › <span className="c-amber">process</span>.exit code:{' '}
              <span className="c-red">1</span>
            </div>
            {error?.digest && (
              <div className="terminal-line c-muted">
                › <span className="c-violet">digest</span>:{' '}
                <span style={{ color: '#94a3b8' }}>{error.digest}</span>
              </div>
            )}

            {/* Error message block */}
            <div className="error-block">
              {error?.message
                ? `Error: ${error.message}`
                : 'An unexpected runtime error occurred. The application state could not be recovered.'}
            </div>
          </div>

          {/* Reset button */}
          <button className="reset-btn" onClick={() => reset()}>
            ⟳ REBOOT SYSTEM
          </button>
        </div>
      </body>
    </html>
  )
}
