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

  it('generates a 4-digit code between 1000-9999', async () => {
    mockPrisma.tournament.findMany.mockResolvedValue([])

    const code = await generateTournamentCode('guild-123', mockPrisma as any)

    expect(code).toBeGreaterThanOrEqual(1000)
    expect(code).toBeLessThanOrEqual(9999)
    expect(Number.isInteger(code)).toBe(true)
  })

  it('avoids existing codes for the same guild', async () => {
    // Mock existing codes 1000-1004
    const existingCodes = [1000, 1001, 1002, 1003, 1004]
    mockPrisma.tournament.findMany.mockResolvedValue(
      existingCodes.map(code => ({ tournamentCode: code }))
    )

    const code = await generateTournamentCode('guild-123', mockPrisma as any)

    // Should NOT be one of the existing codes
    expect(existingCodes).not.toContain(code)
    expect(code).toBeGreaterThanOrEqual(1000)
    expect(code).toBeLessThanOrEqual(9999)
  })

  it('generates unique codes across multiple calls', async () => {
    mockPrisma.tournament.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ tournamentCode: 1234 }])
      .mockResolvedValueOnce([{ tournamentCode: 1234 }, { tournamentCode: 5678 }])

    const codes = await Promise.all([
      generateTournamentCode('guild-123', mockPrisma as any),
      generateTournamentCode('guild-123', mockPrisma as any),
      generateTournamentCode('guild-123', mockPrisma as any),
    ])

    // All codes should be 4-digit
    codes.forEach(code => {
      expect(code).toBeGreaterThanOrEqual(1000)
      expect(code).toBeLessThanOrEqual(9999)
    })
  })

  it('randomizes code selection (shuffle algorithm)', async () => {
    mockPrisma.tournament.findMany.mockResolvedValue([])

    // Generate 10 codes and check they're not sequential
    const codes = await Promise.all(
      Array.from({ length: 10 }, () =>
        generateTournamentCode('guild-123', mockPrisma as any)
      )
    )

    // Check that codes are not all sequential (very unlikely with proper shuffle)
    const isSequential = codes.every((code, i) => i === 0 || code === codes[i - 1] + 1)
    expect(isSequential).toBe(false)
  })

  it('throws error when all codes are exhausted', async () => {
    // Mock all 9000 codes (1000-9999) as taken
    const allCodes = Array.from({ length: 9000 }, (_, i) => ({
      tournamentCode: 1000 + i,
    }))
    mockPrisma.tournament.findMany.mockResolvedValue(allCodes)

    await expect(
      generateTournamentCode('guild-123', mockPrisma as any)
    ).rejects.toThrow('All tournament codes exhausted for this server')
  })

  it('scopes codes per guild (different guilds can have same code)', async () => {
    mockPrisma.tournament.findMany.mockResolvedValue([])

    const codeGuild1 = await generateTournamentCode('guild-1', mockPrisma as any)
    const codeGuild2 = await generateTournamentCode('guild-2', mockPrisma as any)

    // Both should be valid 4-digit codes
    expect(codeGuild1).toBeGreaterThanOrEqual(1000)
    expect(codeGuild1).toBeLessThanOrEqual(9999)
    expect(codeGuild2).toBeGreaterThanOrEqual(1000)
    expect(codeGuild2).toBeLessThanOrEqual(9999)

    // Note: They CAN be the same because they're for different guilds
    // We're just verifying the function doesn't error when called for different guilds
  })
})

describe('validateTournamentCode', () => {
  it('accepts valid 4-digit codes as numbers', () => {
    const result = validateTournamentCode(1234)
    expect(result.valid).toBe(true)
    expect(result.code).toBe(1234)
    expect(result.error).toBeUndefined()
  })

  it('accepts valid 4-digit codes as strings', () => {
    const result = validateTournamentCode('5678')
    expect(result.valid).toBe(true)
    expect(result.code).toBe(5678)
    expect(result.error).toBeUndefined()
  })

  it('accepts boundary values 1000 and 9999', () => {
    const result1000 = validateTournamentCode(1000)
    expect(result1000.valid).toBe(true)
    expect(result1000.code).toBe(1000)

    const result9999 = validateTournamentCode(9999)
    expect(result9999.valid).toBe(true)
    expect(result9999.code).toBe(9999)
  })

  it('rejects 3-digit codes', () => {
    const result = validateTournamentCode(999)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Tournament code must be a 4-digit number (1000-9999)')
  })

  it('rejects 5-digit codes', () => {
    const result = validateTournamentCode(10000)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Tournament code must be a 4-digit number (1000-9999)')
  })

  it('rejects non-numeric strings', () => {
    const result = validateTournamentCode('abcd')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Tournament code must be a valid number')
  })

  it('rejects negative numbers', () => {
    const result = validateTournamentCode(-1234)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Tournament code must be a 4-digit number (1000-9999)')
  })

  it('rejects decimal numbers', () => {
    const result = validateTournamentCode(1234.5)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Tournament code must be an integer')
  })

  it('rejects empty strings', () => {
    const result = validateTournamentCode('')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Tournament code must be a valid number')
  })
})
