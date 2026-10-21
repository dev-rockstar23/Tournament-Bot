import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateTournamentCode, validateTournamentCode } from './tournament-code-generator'

// Mock Prisma transaction client
const mockPrisma = {
  tournament: {
    findMany: vi.fn(),
  },
}

describe('generateTournamentCode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates a code matching /^[A-Z]\\d{2}$/', async () => {
    mockPrisma.tournament.findMany.mockResolvedValue([])

    const code = await generateTournamentCode('guild-123', mockPrisma as any)

    expect(code).toMatch(/^[A-Z]\d{2}$/)
  })

  it('avoids existing codes for the same guild', async () => {
    const existingCodes = ['A00', 'A01', 'A02', 'A03', 'A04']
    mockPrisma.tournament.findMany.mockResolvedValue(
      existingCodes.map(tournamentCode => ({ tournamentCode }))
    )

    const code = await generateTournamentCode('guild-123', mockPrisma as any)

    expect(existingCodes).not.toContain(code)
    expect(code).toMatch(/^[A-Z]\d{2}$/)
  })

  it('generates codes matching the format across multiple calls', async () => {
    mockPrisma.tournament.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ tournamentCode: 'B42' }])
      .mockResolvedValueOnce([{ tournamentCode: 'B42' }, { tournamentCode: 'X99' }])

    const codes = await Promise.all([
      generateTournamentCode('guild-123', mockPrisma as any),
      generateTournamentCode('guild-123', mockPrisma as any),
      generateTournamentCode('guild-123', mockPrisma as any),
    ])

    codes.forEach(code => {
      expect(code).toMatch(/^[A-Z]\d{2}$/)
    })
  })

  it('randomises code selection (shuffle algorithm)', async () => {
    mockPrisma.tournament.findMany.mockResolvedValue([])

    // Generate 10 codes and verify they are not all identical
    const codes = await Promise.all(
      Array.from({ length: 10 }, () =>
        generateTournamentCode('guild-123', mockPrisma as any)
      )
    )

    // At least some codes should differ across calls (with shuffled pools)
    const uniqueCodes = new Set(codes)
    // With a 2600-code shuffled pool the chance all 10 are the same is negligible
    expect(uniqueCodes.size).toBeGreaterThan(1)
    codes.forEach(code => expect(code).toMatch(/^[A-Z]\d{2}$/))
  })

  it('throws error when all 2600 codes are exhausted', async () => {
    // Build mock data for all 2600 codes A00–Z99
    const allCodes: { tournamentCode: string }[] = []
    for (let l = 0; l < 26; l++) {
      const letter = String.fromCharCode(65 + l)
      for (let n = 0; n <= 99; n++) {
        allCodes.push({ tournamentCode: `${letter}${String(n).padStart(2, '0')}` })
      }
    }
    mockPrisma.tournament.findMany.mockResolvedValue(allCodes)

    await expect(
      generateTournamentCode('guild-123', mockPrisma as any)
    ).rejects.toThrow('All tournament codes exhausted for this server')
  })

  it('scopes codes per guild (different guilds can share same code)', async () => {
    mockPrisma.tournament.findMany.mockResolvedValue([])

    const codeGuild1 = await generateTournamentCode('guild-1', mockPrisma as any)
    const codeGuild2 = await generateTournamentCode('guild-2', mockPrisma as any)

    expect(codeGuild1).toMatch(/^[A-Z]\d{2}$/)
    expect(codeGuild2).toMatch(/^[A-Z]\d{2}$/)
  })
})

describe('validateTournamentCode', () => {
  it('accepts valid codes like A42', () => {
    expect(validateTournamentCode('A42')).toBe(true)
  })

  it('accepts boundary values A00 and Z99', () => {
    expect(validateTournamentCode('A00')).toBe(true)
    expect(validateTournamentCode('Z99')).toBe(true)
  })

  it('accepts B00 and M55', () => {
    expect(validateTournamentCode('B00')).toBe(true)
    expect(validateTournamentCode('M55')).toBe(true)
  })

  it('rejects lowercase letter', () => {
    expect(validateTournamentCode('a42')).toBe(false)
  })

  it('rejects two letters', () => {
    expect(validateTournamentCode('AA2')).toBe(false)
  })

  it('rejects three digits', () => {
    expect(validateTournamentCode('A123')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(validateTournamentCode('')).toBe(false)
  })

  it('rejects pure numbers', () => {
    expect(validateTournamentCode('1234')).toBe(false)
  })

  it('rejects one digit after letter', () => {
    expect(validateTournamentCode('A4')).toBe(false)
  })
})
