import { PrismaClient } from './generated/client'

function normalizeConnectionUrl(name: 'DATABASE_URL' | 'DIRECT_URL') {
  const value = process.env[name]?.trim()
  if (!value) return

  const first = value[0]
  const last = value[value.length - 1]
  const normalized =
    (first === '"' && last === '"') || (first === "'" && last === "'")
      ? value.slice(1, -1).trim()
      : value

  if (normalized !== value) {
    console.warn(`[database] Removed surrounding quotes from ${name}; set it as a raw URL.`)
  }

  let parsed: URL
  try {
    parsed = new URL(normalized)
  } catch {
    throw new Error(`[database] ${name} must be a valid PostgreSQL connection URL.`)
  }

  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error(`[database] ${name} must use the postgres:// or postgresql:// protocol.`)
  }

  process.env[name] = normalized
}

normalizeConnectionUrl('DATABASE_URL')
normalizeConnectionUrl('DIRECT_URL')

// Track if database is available
let dbAvailable = false

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  (() => {
    try {
      const client = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      })
      dbAvailable = true
      return client
    } catch (e) {
      console.error('[database] Failed to initialize PrismaClient:', e)
      // Return a proxy that throws helpful errors when database is not configured
      return new Proxy({} as PrismaClient, {
        get() {
          throw new Error('[database] PrismaClient not initialized — DATABASE_URL is missing or invalid. Check your environment variables.')
        },
      })
    }
  })()

export const isDatabaseAvailable = () => dbAvailable

if (process.env.NODE_ENV !== 'production' && dbAvailable) globalForPrisma.prisma = prisma

// ---------------------------------------------------------------------------
// Live database probe
// ---------------------------------------------------------------------------

let _liveCheckResult: boolean | null = null
let _liveCheckTs = 0
const LIVE_CHECK_TTL_MS = 5000

/**
 * Performs a lightweight `SELECT 1` probe against the database.
 * Result is cached for 5 seconds to avoid hammering the connection pool.
 * Unlike `isDatabaseAvailable()` (which only reflects init-time state),
 * this returns a real signal even if the underlying pool broke after startup.
 */
export async function checkDatabaseLive(): Promise<boolean> {
  const now = Date.now()
  if (_liveCheckResult !== null && now - _liveCheckTs < LIVE_CHECK_TTL_MS) {
    return _liveCheckResult
  }
  try {
    await (prisma as PrismaClient).$queryRaw`SELECT 1`
    _liveCheckResult = true
  } catch {
    _liveCheckResult = false
  }
  _liveCheckTs = Date.now()
  return _liveCheckResult
}

export default prisma
export * from './generated/client'
