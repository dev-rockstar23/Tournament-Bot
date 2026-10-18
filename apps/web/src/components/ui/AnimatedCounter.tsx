'use client'
import { useEffect, useRef } from 'react'
import { useMotionValue, useTransform, animate, motion, useInView } from 'framer-motion'
import { cn } from '@/lib/utils'
import { scaleIn } from '@/lib/motion'

interface AnimatedCounterProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
  /** Render the number in font-mono */
  monospace?: boolean
}

export function AnimatedCounter({
  value,
  duration = 2,
  prefix = '',
  suffix = '',
  className,
  monospace = false,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, (latest) => Math.round(latest))
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  useEffect(() => {
    if (isInView) {
      const controls = animate(motionValue, value, { duration })
      return () => controls.stop()
    }
  }, [isInView, value, duration, motionValue])

  return (
    <span ref={ref} className={cn(monospace && 'font-mono', className)}>
      {prefix}
      <motion.span
        variants={scaleIn}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
      >
        {rounded}
      </motion.span>
      {suffix}
    </span>
  )
}
