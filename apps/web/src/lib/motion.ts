import type { Variants } from 'framer-motion'

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
}

export const staggerChildren: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
}

export const glowPulse = {
  animate: { boxShadow: ['0 0 10px rgba(124,58,237,0.3)', '0 0 30px rgba(124,58,237,0.8)', '0 0 10px rgba(124,58,237,0.3)'] },
  transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
}

export const podiumEntry: Variants = {
  hidden: { opacity: 0, y: 60 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: 'easeOut' }
  })
}

export const cardTilt: Variants = {
  rest: { rotateX: 0, rotateY: 0, scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.15 } }
}

export const rankChange: Variants = {
  initial: { scale: 1.2, color: '#22c55e' },
  animate: { scale: 1, color: 'inherit', transition: { duration: 0.4 } }
}

// ── Cyberpunk additions ───────────────────────────────────────────────────────

/** Glitch reveal: opacity fade + brief horizontal jitter with skew */
export const glitchReveal: Variants = {
  hidden:  { opacity: 0, x: -4, skewX: 2 },
  visible: { opacity: 1, x: 0, skewX: 0, transition: { duration: 0.4 } },
}

/** Scan-in: clip-path reveal sweeping from top to bottom */
export const scanIn: Variants = {
  hidden:  { clipPath: 'inset(0 0 100% 0)' },
  visible: {
    clipPath: 'inset(0 0 0% 0)',
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
}

/** Counter pop: scale bounce on reveal */
export const counterPop: Variants = {
  hidden:  { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
}
