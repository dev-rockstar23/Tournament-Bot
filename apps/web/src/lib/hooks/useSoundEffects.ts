'use client'

/**
 * useSoundEffects
 *
 * Provides three lightweight UI sounds for the landing page:
 *   - playHover:      soft high-frequency click on element hover
 *   - playClick:      clean confirm chime on primary CTA click
 *   - playTransition: short low whoosh on secondary link click
 *
 * Sounds are generated on first call via the ElevenLabs sound-generation
 * API and cached in-memory for the session (no repeated network calls).
 *
 * Falls back silently (no error, no crash) if:
 *   - NEXT_PUBLIC_ELEVENLABS_API_KEY is not set
 *   - The user's browser has autoplay blocked
 *   - prefers-reduced-motion is set
 */

import { useRef, useCallback, useEffect, useState } from 'react'

const ELEVEN_ENDPOINT = 'https://api.elevenlabs.io/v1/sound-generation'

interface SoundCache {
  hover:      AudioBuffer | null
  click:      AudioBuffer | null
  transition: AudioBuffer | null
}

const soundPrompts: Record<keyof SoundCache, string> = {
  hover:      'A very short soft high-pitched UI hover tick, 0.08 seconds, clean digital glass texture, minimal reverb',
  click:      'A short crisp confirm chime, 0.25 seconds, futuristic glass texture, modern esports UI, slight reverb tail',
  transition: 'A brief low-frequency whoosh sweep, 0.3 seconds, cinematic, slight bass rumble, no music',
}

const soundDurations: Record<keyof SoundCache, number> = {
  hover: 0.1, click: 0.3, transition: 0.35,
}

let globalCtx: AudioContext | null = null
const globalCache: SoundCache = { hover: null, click: null, transition: null }
let fetchInFlight = false

async function fetchSound(key: keyof SoundCache, apiKey: string): Promise<AudioBuffer | null> {
  if (!globalCtx) return null
  try {
    const res = await fetch(ELEVEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: soundPrompts[key],
        duration_seconds: soundDurations[key],
        prompt_influence: 0.8,
      }),
    })
    if (!res.ok) return null
    const arrayBuf = await res.arrayBuffer()
    return await globalCtx.decodeAudioData(arrayBuf)
  } catch {
    return null
  }
}

async function prefetchAll(apiKey: string): Promise<void> {
  if (fetchInFlight) return
  fetchInFlight = true
  const keys: (keyof SoundCache)[] = ['hover', 'click', 'transition']
  await Promise.all(
    keys.map(async (k) => {
      if (!globalCache[k]) {
        globalCache[k] = await fetchSound(k, apiKey)
      }
    })
  )
  fetchInFlight = false
}

function playBuffer(buffer: AudioBuffer | null, volume = 0.4): void {
  if (!buffer || !globalCtx) return
  const src = globalCtx.createBufferSource()
  const gain = globalCtx.createGain()
  gain.gain.value = volume
  src.buffer = buffer
  src.connect(gain)
  gain.connect(globalCtx.destination)
  src.start()
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useSoundEffects() {
  const [ready, setReady] = useState(false)
  const prefetchedRef = useRef(false)

  // Resume / create AudioContext on first user interaction
  const ensureCtx = useCallback(() => {
    if (globalCtx) {
      if (globalCtx.state === 'suspended') void globalCtx.resume()
      return
    }
    try {
      globalCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    } catch {
      // AudioContext not available
    }
  }, [])

  // Kick off prefetch on first interaction (lazy, not on mount)
  const kickPrefetch = useCallback(() => {
    const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
    if (!apiKey || prefetchedRef.current) return
    prefetchedRef.current = true
    ensureCtx()
    void prefetchAll(apiKey).then(() => setReady(true))
  }, [ensureCtx])

  // Reduced-motion check
  const reducedMotion = useRef(false)
  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const playHover = useCallback(() => {
    if (reducedMotion.current) return
    kickPrefetch()
    ensureCtx()
    playBuffer(globalCache.hover, 0.25)
  }, [kickPrefetch, ensureCtx])

  const playClick = useCallback(() => {
    if (reducedMotion.current) return
    kickPrefetch()
    ensureCtx()
    playBuffer(globalCache.click, 0.45)
  }, [kickPrefetch, ensureCtx])

  const playTransition = useCallback(() => {
    if (reducedMotion.current) return
    kickPrefetch()
    ensureCtx()
    playBuffer(globalCache.transition, 0.35)
  }, [kickPrefetch, ensureCtx])

  return { playHover, playClick, playTransition, ready }
}
