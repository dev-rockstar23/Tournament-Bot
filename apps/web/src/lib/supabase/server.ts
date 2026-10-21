import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase server client.
 * Safe to call from any Server Component or API route.
 * Returns a no-op client if env vars are missing or cookies() throws.
 */
export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    'https://placeholder.supabase.co'

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    'placeholder-anon-key'

  // In production, cookies() should always be available in Server Components during requests
  // But we defensively handle edge cases where it might not be
  let cookieStore: ReturnType<typeof cookies> | null = null
  try {
    cookieStore = cookies()
  } catch {
    // cookies() unavailable - likely during build or outside request context
    cookieStore = null
  }

  // Ensure cookieStore has the expected methods
  const safeGet = (name: string): string | undefined => {
    if (!cookieStore) return undefined
    try {
      const cookie = cookieStore.get(name)
      return cookie?.value
    } catch {
      return undefined
    }
  }

  const safeSet = (name: string, value: string, options: CookieOptions): void => {
    if (!cookieStore) return
    try {
      cookieStore.set({ name, value, ...options })
    } catch {
      // read-only or not available
    }
  }

  const safeRemove = (name: string, options: CookieOptions): void => {
    if (!cookieStore) return
    try {
      cookieStore.set({ name, value: '', ...options })
    } catch {
      // read-only or not available
    }
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: safeGet,
      set: safeSet,
      remove: safeRemove,
    },
  })
}