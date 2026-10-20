import type { PrismaClient } from '@esports/database/src/generated/client'
import type { Prisma } from '@esports/database/src/generated/client'

/**
 * Generates a unique 4-digit tournament code (1000-9999) for a guild.
 * Uses Fisher-Yates shuffle to randomize the code pool per guild.
 * 
 * @param guildId - Discord server ID
 * @param prisma - Prisma client (can be transaction client)
 * @returns A unique 4-digit code
 * @throws Error if all 9000 codes are exhausted for this guild
 */
export async function generateTournamentCode(
  guildId: string,
  prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
): Promise<number> {
  // Get all existing codes for this guild
  const existingTournaments = await prisma.tournament.findMany({
    where: {
      guildId,
      tournamentCode: { not: null },
    },
    select: { tournamentCode: true },
  })

  const usedCodes = new Set(
    existingTournaments.map((t: any) => t.tournamentCode).filter(Boolean),
  )

  // If all codes are exhausted (highly unlikely)
  if (usedCodes.size >= 9000) {
    throw new Error(
      `All 9000 tournament codes (1000-9999) have been exhausted for guild ${guildId}. ` +
      `Consider archiving old tournaments.`,
    )
  }

  // Generate shuffled pool of codes
  const codePool: number[] = []
  for (let i = 1000; i <= 9999; i++) {
    codePool.push(i)
  }

  // Fisher-Yates shuffle
  for (let i = codePool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[codePool[i], codePool[j]] = [codePool[j], codePool[i]]
  }

  // Find first unused code from shuffled pool
  for (const code of codePool) {
    if (!usedCodes.has(code)) {
      return code
    }
  }

  // Fallback (should never reach here due to exhaustion check above)
  throw new Error('Failed to generate tournament code')
}

/**
 * Validates a tournament code input.
 * 
 * @param input - String or number to validate
 * @returns Validation result with parsed code or error message
 */
export function validateTournamentCode(input: string | number): {
  valid: boolean
  code?: number
  error?: string
} {
  const num = typeof input === 'string' ? parseInt(input, 10) : input

  if (isNaN(num)) {
    return {
      valid: false,
      error: 'Tournament code must be a number',
    }
  }

  if (num < 1000 || num > 9999) {
    return {
      valid: false,
      error: 'Tournament code must be a 4-digit number (1000-9999)',
    }
  }

  return {
    valid: true,
    code: num,
  }
}
