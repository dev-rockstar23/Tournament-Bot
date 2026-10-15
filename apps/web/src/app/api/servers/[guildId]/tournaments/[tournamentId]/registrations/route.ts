import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@esports/database'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const bodySchema = z.object({
  teamName: z.string().min(2, 'Team name required'),
  registrationFormat: z.string(),
}).passthrough()

export async function POST(
  request: NextRequest,
  { params }: { params: { guildId: string; tournamentId: string } }
) {
  // Require authentication
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Validate tournament belongs to guildId
  const tournament = await prisma.tournament.findFirst({
    where: { id: params.tournamentId, guildId: params.guildId },
    select: { id: true, status: true, teamCapacity: true, acceptedCount: true },
  })

  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  }

  if (tournament.status !== 'REGISTRATION_OPEN') {
    return NextResponse.json(
      { error: 'Registration is not currently open for this tournament' },
      { status: 409 }
    )
  }

  // Parse body
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  // Look up the user's discord id to find or create a team
  const dbUser = await prisma.user.findFirst({
    where: { discordId: user.user_metadata?.['provider_id'] ?? user.id },
    select: { id: true },
  })

  if (!dbUser) {
    return NextResponse.json(
      { error: 'User profile not found. Please complete your profile first.' },
      { status: 404 }
    )
  }

  // Find or create team for this user in this guild
  let team = await prisma.team.findFirst({
    where: { guildId: params.guildId, captainId: dbUser.id },
    select: { id: true },
  })

  if (!team) {
    team = await prisma.team.create({
      data: {
        guildId: params.guildId,
        name: parsed.data.teamName as string,
        captainId: dbUser.id,
      },
      select: { id: true },
    })
  }

  // Check for existing registration
  const existing = await prisma.registration.findFirst({
    where: { tournamentId: params.tournamentId, teamId: team.id },
    select: { id: true },
  })

  if (existing) {
    return NextResponse.json(
      { error: 'Your team is already registered for this tournament' },
      { status: 409 }
    )
  }

  // Create registration
  const registration = await prisma.registration.create({
    data: {
      tournamentId: params.tournamentId,
      guildId: params.guildId,
      teamId: team.id,
      status: 'PENDING',
      submittedRaw: JSON.stringify(body),
    },
    select: { id: true, status: true },
  })

  return NextResponse.json({ registration }, { status: 201 })
}
