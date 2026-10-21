import type { PrismaClient } from '@esports/database/src/generated/client'

/**
 * Generates a unique tournament code in the format Letter+2Digits (A00–Z99).
 * Total pool: 26 × 100 = 2,600 codes per guild.
 * Uses Fisher-Yates shuffle to randomise selection.
 *
 * @param guildId - Discord server ID
 * @param prisma  - Prisma client (can be a transaction client)
 * @returns A unique code string, e.g. "A42"
 * @throws Error if all 2,600 codes are exhausted for this guild
 */
export async function generateTournamentCode(
  guildId: string,
  prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
): Promise<string> {
  // Fetch all codes currently in use by this guild
  const existing = await prisma.tournament.findMany({
    where: { guildId, tournamentCode: { not: null } },
    select: { tournamentCode: true },
  })

  const usedCodes = new Set<string>(
    existing
      .map((t: { tournamentCode: string | null }) => t.tournamentCode)
      .filter((c): c is string => c !== null),
  )

  if (usedCodes.size >= 2600) {
    throw new Error(
      `All tournament codes exhausted for this server. Consider archiving old tournaments.`,
    )
  }

  // Build the full pool: A00, A01, … A99, B00, … Z99
  const pool: string[] = []
  for (let letterIdx = 0; letterIdx < 26; letterIdx++) {
    const letter = String.fromCharCode(65 + letterIdx) // 'A' = 65
    for (let num = 0; num <= 99; num++) {
      pool.push(`${letter}${String(num).padStart(2, '0')}`)
    }
  }

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
  }

  // Return first unused code from shuffled pool
  for (const code of pool) {
    if (!usedCodes.has(code)) {
      return code
    }
  }

  // Should never reach here due to the exhaustion check above
  throw new Error('Failed to generate tournament code')
}

/**
 * Validates that a string is a valid tournament code (Letter + 2 digits).
 *
 * @param code - Value to test
 * @returns true if the code matches /^[A-Z]\d{2}$/
 */
export function validateTournamentCode(code: string): boolean {
  return /^[A-Z]\d{2}$/.test(code)
}
