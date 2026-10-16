'use client'

import { motion } from 'framer-motion'
import { podiumEntry } from '@/lib/motion'

interface PodiumWrapperProps {
  children: React.ReactNode
  showConfetti?: boolean
}

// 20 confetti pieces with deterministic-but-varied positions
const CONFETTI_PIECES = [
  { left: '5%',  top: '-12px', delay: '0s',    color: '#7c3aed', rotate: 15  },
  { left: '12%', top: '-20px', delay: '0.2s',  color: '#06b6d4', rotate: -30 },
  { left: '20%', top: '-8px',  delay: '0.4s',  color: '#9f5bff', rotate: 45  },
  { left: '28%', top: '-16px', delay: '0.1s',  color: '#f59e0b', rotate: -10 },
  { left: '35%', top: '-22px', delay: '0.5s',  color: '#7c3aed', rotate: 60  },
  { left: '42%', top: '-10px', delay: '0.3s',  color: '#06b6d4', rotate: -45 },
  { left: '50%', top: '-18px', delay: '0.0s',  color: '#22c55e', rotate: 20  },
  { left: '57%', top: '-14px', delay: '0.6s',  color: '#9f5bff', rotate: -25 },
  { left: '65%', top: '-22px', delay: '0.2s',  color: '#ef4444', rotate: 35  },
  { left: '72%', top: '-8px',  delay: '0.4s',  color: '#7c3aed', rotate: -55 },
  { left: '80%', top: '-16px', delay: '0.1s',  color: '#06b6d4', rotate: 10  },
  { left: '88%', top: '-20px', delay: '0.3s',  color: '#f59e0b', rotate: -40 },
  { left: '95%', top: '-10px', delay: '0.5s',  color: '#9f5bff', rotate: 50  },
  { left: '8%',  top: '-24px', delay: '0.7s',  color: '#22c55e', rotate: -15 },
  { left: '17%', top: '-14px', delay: '0.6s',  color: '#ef4444', rotate: 70  },
  { left: '31%', top: '-22px', delay: '0.8s',  color: '#7c3aed', rotate: -60 },
  { left: '46%', top: '-12px', delay: '0.9s',  color: '#06b6d4', rotate: 25  },
  { left: '60%', top: '-20px', delay: '0.7s',  color: '#9f5bff', rotate: -35 },
  { left: '75%', top: '-16px', delay: '0.8s',  color: '#f59e0b', rotate: 40  },
  { left: '90%', top: '-10px', delay: '0.9s',  color: '#ef4444', rotate: -20 },
]

export function PodiumWrapper({ children, showConfetti = false }: PodiumWrapperProps) {
  return (
    <motion.div
      variants={podiumEntry}
      initial="hidden"
      animate="visible"
      custom={0}
      style={{ position: 'relative' }}
    >
      {/* CSS confetti — only when tournament is completed */}
      {showConfetti && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          {CONFETTI_PIECES.map((piece, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: piece.left,
                top: piece.top,
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor: piece.color,
                // @ts-expect-error -- CSS custom property for animation delay
                '--confetti-delay': piece.delay,
                '--confetti-rotate': `${piece.rotate}deg`,
                animation: `confetti-fall 3s ease-in forwards`,
                animationDelay: piece.delay,
                transform: `rotate(${piece.rotate}deg)`,
              }}
            />
          ))}
        </div>
      )}

      {/* Inject confetti keyframes + reduced-motion override */}
      {showConfetti && (
        <style>{`
          @keyframes confetti-fall {
            0%   { transform: translateY(0) rotate(var(--confetti-rotate, 0deg)); opacity: 1; }
            80%  { opacity: 0.6; }
            100% { transform: translateY(340px) rotate(calc(var(--confetti-rotate, 0deg) + 360deg)); opacity: 0; }
          }
          @media (prefers-reduced-motion: reduce) {
            [style*="confetti-fall"] {
              animation: none !important;
              opacity: 0 !important;
            }
          }
        `}</style>
      )}

      {/* Podium children with podium-first/second/third CSS classes applied */}
      <PodiumClassInjector>
        {children}
      </PodiumClassInjector>
    </motion.div>
  )
}

/**
 * Wraps children and provides a data attribute so WinnerDetailPodium slot
 * divs can receive the floating animation classes.
 * The actual `.podium-first`, `.podium-second`, `.podium-third` classes are
 * applied via a CSS override targeting the nth podium column.
 */
function PodiumClassInjector({ children }: { children: React.ReactNode }) {
  return (
    <div data-podium-wrapper>
      <style>{`
        [data-podium-wrapper] [data-podium-slot="1"] {
          animation: float 3s ease-in-out infinite;
        }
        [data-podium-wrapper] [data-podium-slot="2"] {
          animation: float 3s ease-in-out infinite 0.5s;
        }
        [data-podium-wrapper] [data-podium-slot="3"] {
          animation: float 3s ease-in-out infinite 1s;
        }
        @media (prefers-reduced-motion: reduce) {
          [data-podium-wrapper] [data-podium-slot] {
            animation: none !important;
          }
        }
      `}</style>
      {children}
    </div>
  )
}
