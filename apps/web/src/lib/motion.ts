import type { Variants } from 'framer-motion'

// ─── Core Animations ──────────────────────────────────────────────────────────

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
  animate: {
    boxShadow: [
      '0 0 10px rgba(124,58,237,0.3)',
      '0 0 30px rgba(124,58,237,0.8)',
      '0 0 10px rgba(124,58,237,0.3)',
    ],
  },
  transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
}

export const podiumEntry: Variants = {
  hidden: { opacity: 0, y: 60 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: 'easeOut' },
  }),
}

export const cardTilt: Variants = {
  rest: { rotateX: 0, rotateY: 0, scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.15 } },
}

export const rankChange: Variants = {
  initial: { scale: 1.2, color: '#22c55e' },
  animate: { scale: 1, color: 'inherit', transition: { duration: 0.4 } },
}

// ─── Liquid Animations ────────────────────────────────────────────────────────

/** Liquid morph: organic shape shifting */
export const liquidMorph: Variants = {
  hidden: {
    borderRadius: '50% 50% 50% 50% / 50% 50% 50% 50%',
    scale: 0.95,
  },
  visible: {
    borderRadius: [
      '50% 50% 50% 50% / 50% 50% 50% 50%',
      '60% 40% 30% 70% / 60% 30% 70% 40%',
      '40% 60% 70% 30% / 30% 70% 40% 60%',
      '70% 30% 40% 60% / 70% 60% 30% 40%',
      '50% 50% 50% 50% / 50% 50% 50% 50%',
    ],
    scale: [0.95, 1.02, 1.01, 1.02, 0.95],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

/** Liquid reveal: fluid mask expansion */
export const liquidReveal: Variants = {
  hidden: {
    clipPath: 'inset(100% 0 0 0)',
    opacity: 0,
  },
  visible: {
    clipPath: 'inset(0 0 0 0)',
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
}

/** Magnetic pull: element follows cursor */
export const magneticPull = (strength = 1) => ({
  rest: { x: 0, y: 0, rotateX: 0, rotateY: 0 },
  hover: (mouseX: number, mouseY: number) => ({
    x: mouseX * 10 * strength,
    y: mouseY * 10 * strength,
    rotateX: -mouseY * 5 * strength,
    rotateY: mouseX * 5 * strength,
    transition: { type: 'spring', stiffness: 400, damping: 30 },
  }),
})

/** Ripple burst on click */
export const rippleBurst = {
  initial: { scale: 0, opacity: 0.6 },
  animate: { scale: 4, opacity: 0 },
  exit: { scale: 4, opacity: 0 },
  transition: { duration: 0.5, ease: 'easeOut' },
}

/** Page transition: liquid page wipe */
export const pageTransition: Variants = {
  initial: {
    clipPath: 'polygon(0 0, 0 0, 0 100%, 0% 100%)',
    opacity: 0,
  },
  enter: {
    clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)',
    opacity: 1,
    transition: {
      duration: 0.7,
      ease: [0.76, 0, 0.24, 1],
    },
  },
  exit: {
    clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)',
    opacity: 0,
    transition: {
      duration: 0.5,
      ease: [0.76, 0, 0.24, 1],
    },
  },
}

/** Staggered list with liquid delay */
export const liquidStagger: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      staggerDirection: 1,
    },
  },
}

/** Floating orbital motion */
export const orbitalFloat = (radius = 20, duration = 6) => ({
  animate: {
    x: [0, radius, -radius, radius, 0],
    y: [0, -radius, -radius, radius, 0],
    rotate: [0, 2, -2, 2, 0],
    transition: {
      duration,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
})

/** Breathing scale */
export const breathe = (scale = 1.02, duration = 3) => ({
  animate: {
    scale: [1, scale, 1],
    transition: {
      duration,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
})

/** Glitch reveal: digital corruption effect */
export const glitchReveal: Variants = {
  hidden: { opacity: 0, x: -4, skewX: 2 },
  visible: { opacity: 1, x: 0, skewX: 0, transition: { duration: 0.4 } },
}

/** Scan-in: clip-path reveal sweeping from top to bottom */
export const scanIn: Variants = {
  hidden: { clipPath: 'inset(0 0 100% 0)' },
  visible: {
    clipPath: 'inset(0 0 0% 0)',
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
}

/** Counter pop: scale bounce on reveal */
export const counterPop: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
}

/** Liquid button press */
export const liquidPress: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.96 },
}

/** Morphing blob background */
export const morphingBlob: Variants = {
  animate: {
    borderRadius: [
      '60% 40% 30% 70% / 60% 30% 70% 40%',
      '40% 60% 70% 30% / 30% 70% 40% 60%',
      '70% 30% 40% 60% / 70% 60% 30% 40%',
      '60% 40% 30% 70% / 60% 30% 70% 40%',
    ],
    x: [0, 20, -10, 15, 0],
    y: [0, -15, 20, -10, 0],
    transition: {
      duration: 20,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

/** Gradient shift animation */
export const gradientShift = {
  animate: {
    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
    transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
  },
}

/** Text reveal by words/lines */
export const textReveal: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.5, ease: 'easeOut' },
  }),
}

/** Card stack entrance */
export const cardStack: Variants = {
  hidden: { opacity: 0, y: 40, rotateX: -10, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    scale: 1,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.23, 1, 0.32, 1] },
  }),
}

/** Liquid line draw */
export const liquidLineDraw: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.5, ease: 'easeInOut' },
  },
}

/** Particle burst */
export const particleBurst = (count = 12) => ({
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.02,
    },
  },
  exit: {
    transition: { staggerChildren: 0.01, staggerDirection: -1 },
  },
})

export const particle = (count = 12): Variants => ({
  initial: { scale: 0, opacity: 1, x: 0, y: 0 },
  animate: (i: number) => {
    const angle = (i / count) * Math.PI * 2
    const distance = 50 + Math.random() * 50
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      scale: 1,
      opacity: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    }
  },
})

/** Hologram flicker */
export const hologramFlicker: Variants = {
  animate: {
    opacity: [1, 0.95, 1, 0.98, 1],
    filter: ['brightness(1)', 'brightness(1.1)', 'brightness(1)', 'brightness(1.05)', 'brightness(1)'],
    transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
  },
}

/** Loading shimmer */
export const loadingShimmer: Variants = {
  animate: {
    backgroundPosition: ['-200% 0', '200% 0'],
    transition: { duration: 1.5, repeat: Infinity, ease: 'linear' },
  },
}

/** Modal/Dialog liquid entrance */
export const liquidModal: Variants = {
  hidden: { scale: 0.8, opacity: 0, borderRadius: '50%' },
  visible: {
    scale: 1,
    opacity: 1,
    borderRadius: '1rem',
    transition: { type: 'spring', stiffness: 300, damping: 25, duration: 0.5 },
  },
  exit: { scale: 0.8, opacity: 0, borderRadius: '50%', transition: { duration: 0.3 } },
}

/** Toast notification liquid slide */
export const liquidToast: Variants = {
  hidden: { x: 400, opacity: 0, rotate: 5 },
  visible: {
    x: 0,
    opacity: 1,
    rotate: 0,
    transition: { type: 'spring', stiffness: 400, damping: 30 },
  },
  exit: { x: 400, opacity: 0, rotate: -5, transition: { duration: 0.2 } },
}

/** Navigation link liquid underline */
export const liquidUnderline: Variants = {
  hidden: { width: 0, left: '50%' },
  visible: { width: '100%', left: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { width: 0, left: '50%', transition: { duration: 0.2, ease: 'easeIn' } },
}

/** Scroll reveal with parallax */
export const scrollReveal = (offset = 100) => ({
  hidden: { opacity: 0, y: offset },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.23, 1, 0.32, 1] },
  },
})

/** Liquid tab indicator */
export const liquidTabIndicator: Variants = {
  hidden: { width: 0, opacity: 0 },
  visible: { width: 'auto', opacity: 1, transition: { type: 'spring', stiffness: 500, damping: 30 } },
  exit: { width: 0, opacity: 0, transition: { duration: 0.2 } },
}