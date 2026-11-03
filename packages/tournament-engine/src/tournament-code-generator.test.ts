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

  it('generates T0001 when no codes exist for the guild', async () => {
    mockPrisma.tournament.findMany.mockResolvedValue([])

    const code = await generateTournamentCode('guild-123', mockPrisma as any)

    expect(code).toBe('T0001')
  })

  it('generates T0002 when T0001 already exists', async () => {
    mockPrisma.tournament.findMany.mockResolvedValue([{ tournamentCode: 'T0001' }])

    const code = await generateTournamentCode('guild-123', mockPrisma as any)

    expect(code).toBe('T0002')
  })

  it('generates T0006 when T0001–T0005 already exist', async () => {
    const existingCodes = ['T0001', 'T0002', 'T0003', 'T0004', 'T0005']
    mockPrisma.tournament.findMany.mockResolvedValue(
      existingCodes.map(tournamentCode => ({ tournamentCode })),
    )

    const code = await generateTournamentCode('guild-123', mockPrisma as any)

    expect(code).toBe('T0006')
  })

  it('skips gaps and finds next available sequential ID', async () => {
    // T0001 and T0003 exist — next should be T0002
    mockPrisma.tournament.findMany.mockResolvedValue([
      { tournamentCode: 'T0001' },
      { tournamentCode: 'T0003' },
    ])

    const code = await generateTournamentCode('guild-123', mockPrisma as any)

    expect(code).toBe('T0002')
  })

  it('generates codes matching /^T\\d{4}$/', async () => {
    mockPrisma.tournament.findMany.mockResolvedValue([])

    const code = await generateTournamentCode('guild-123', mockPrisma as any)

    expect(code).toMatch(/^T\d{4}$/)
  })

  it('throws when all 9999 IDs are exhausted', async () => {
    const allCodes: { tournamentCode: string }[] = []
    for (let n = 1; n <= 9999; n++) {
      allCodes.push({ tournamentCode: `T${String(n).padStart(4, '0')}` })
    }
    mockPrisma.tournament.findMany.mockResolvedValue(allCodes)

    await expect(
      generateTournamentCode('guild-123', mockPrisma as any),
    ).rejects.toThrow('All tournament IDs exhausted')
  })

  it('scopes IDs per guild — different guilds each start at T0001', async () => {
    mockPrisma.tournament.findMany.mockResolvedValue([])

    const codeGuild1 = await generateTournamentCode('guild-1', mockPrisma as any)
    const codeGuild2 = await generateTournamentCode('guild-2', mockPrisma as any)

    expect(codeGuild1).toBe('T0001')
    expect(codeGuild2).toBe('T0001')
  })
})

describe('validateTournamentCode', () => {
  it('accepts T0001', () => {
    expect(validateTournamentCode('T0001')).toBe(true)
  })

  it('accepts T9999', () => {
    expect(validateTournamentCode('T9999')).toBe(true)
  })

  it('accepts T0042', () => {
    expect(validateTournamentCode('T0042')).toBe(true)
  })

  it('rejects lowercase t0001', () => {
    expect(validateTournamentCode('t0001')).toBe(false)
  })

  it('rejects old format A42', () => {
    expect(validateTournamentCode('A42')).toBe(false)
  })

  it('rejects three-digit format T001', () => {
    expect(validateTournamentCode('T001')).toBe(false)
  })

  it('rejects five-digit format T00001', () => {
    expect(validateTournamentCode('T00001')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(validateTournamentCode('')).toBe(false)
  })

  it('rejects pure numbers 1234', () => {
    expect(validateTournamentCode('1234')).toBe(false)
  })

  it('rejects no prefix 0042', () => {
    expect(validateTournamentCode('0042')).toBe(false)
  })
})
