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

export default prisma
export * from './generated/client'
