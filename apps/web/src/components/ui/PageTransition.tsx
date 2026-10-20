'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { ReactNode } from 'react'
import { pageTransition, liquidReveal } from '@/lib/motion'

interface PageTransitionProps {
  children: ReactNode
  /** Transition variant */
  variant?: 'liquid' | 'fade' | 'slide' | 'scale'
  /** Duration in seconds */
  duration?: number
  /** Exit before enter (true) or simultaneous (false) */
  mode?: 'wait' | 'sync'
}

export function PageTransition({
  children,
  variant = 'liquid',
  duration = 0.5,
  mode = 'wait',
}: PageTransitionProps) {
  const variants = {
    liquid: pageTransition,
    fade: {
      initial: { opacity: 0 },
      enter: { opacity: 1, transition: { duration } },
      exit: { opacity: 0, transition: { duration: duration * 0.5 } },
    },
    slide: {
      initial: { opacity: 0, x: 20 },
      enter: { opacity: 1, x: 0, transition: { duration, ease: [0.23, 1, 0.32, 1] } },
      exit: { opacity: 0, x: -20, transition: { duration: duration * 0.5 } },
    },
    scale: {
      initial: { opacity: 0, scale: 0.95 },
      enter: { opacity: 1, scale: 1, transition: { duration, ease: [0.23, 1, 0.32, 1] } },
      exit: { opacity: 0, scale: 0.95, transition: { duration: duration * 0.5 } },
    },
  }[variant]

  return (
    <AnimatePresence mode={mode}>
      <motion.div
        key={typeof children === 'object' && children !== null && 'key' in children ? (children as any).key : 'default'}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={variants}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/** Liquid page wrapper with entering animation */
export function LiquidPage({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={liquidReveal}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  )
}

/** Staggered children container */
export function StaggerContainer({ children, delay = 0.1 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: delay },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

/** Liquid section wrapper */
export function LiquidSection({ children, className = '', ...props }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLElement>) {
  // Filter out motion-incompatible props - keep only safe props
  const {
    onDrag, onDragStart, onDragEnd, onDragEnter, onDragLeave, onDragOver, onDrop,
    onAnimationStart, onAnimationEnd, onAnimationIteration,
    onTransitionStart, onTransitionEnd, onTransitionCancel,
    ...motionProps
  } = props

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
      className={className}
      {...motionProps}
    >
      {children}
    </motion.section>
  )
}