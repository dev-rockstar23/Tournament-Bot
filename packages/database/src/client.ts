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

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
export * from './generated/client'
