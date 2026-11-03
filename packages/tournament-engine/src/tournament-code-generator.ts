import type { PrismaClient } from '@esports/database/src/generated/client'

/**
 * Generates the next sequential tournament ID for a guild in the format T0001–T9999.
 * IDs are per-guild: Guild A's T0001 and Guild B's T0001 are independent.
 *
 * @param guildId - Discord server ID
 * @param prisma  - Prisma client (can be a transaction client)
 * @returns A unique code string, e.g. "T0001"
 * @throws Error if all 9,999 IDs are exhausted for this guild
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

  if (usedCodes.size >= 9999) {
    throw new Error(
      `All tournament IDs exhausted for this server (T0001–T9999). Archive old tournaments to free up IDs.`,
    )
  }

  // Find the next unused sequential number, starting from 1
  for (let n = 1; n <= 9999; n++) {
    const code = `T${String(n).padStart(4, '0')}`
    if (!usedCodes.has(code)) {
      return code
    }
  }

  // Should never reach here due to the exhaustion check above
  throw new Error('Failed to generate tournament ID')
}

/**
 * Validates that a string is a valid tournament short ID (T + 4 digits).
 *
 * @param code - Value to test
 * @returns true if the code matches /^T\d{4}$/
 */
export function validateTournamentCode(code: string): boolean {
  return /^T\d{4}$/.test(code)
}
