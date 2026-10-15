'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const HeroScene = dynamic(() => import('./HeroScene'), { ssr: false })

export default function HeroSceneWrapper() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
  }, [])

  if (reducedMotion) return null

  return (
    <div className="w-full h-full">
      <HeroScene />
    </div>
  )
}
