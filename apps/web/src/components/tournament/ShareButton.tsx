'use client'
import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

export function ShareButton() {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available in insecure context — fail silently
    }
  }

  return (
    <button
      onClick={handleShare}
      aria-label="Copy tournament link to clipboard"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:text-white bg-white/5 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] transition-all shrink-0"
    >
      {copied ? <Check size={14} className="text-green-400" /> : <Share2 size={14} />}
      {copied ? 'Copied!' : 'Share'}
    </button>
  )
}
