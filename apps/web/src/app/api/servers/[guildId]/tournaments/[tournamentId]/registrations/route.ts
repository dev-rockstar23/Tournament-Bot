import { NextRequest, NextResponse } from 'next/server'
import { prisma, type RegistrationStatus } from '@esports/database'
import { createClient } from '@/lib/supabase/server'
import { withPermission, AppRole } from '@esports/permissions'
import { RegistrationSubmitSchema } from '@esports/shared-types'

// ─── POST /api/servers/[guildId]/tournaments/[tournamentId]/registrations ─────
// Public: any authenticated user may register their team.

export async function POST(
  request: NextRequest,
  { params }: { params: { guildId: string; tournamentId: string } }
) {
  const { guildId, tournamentId } = params

  // 1. Require Supabase auth
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Look up DB user via discordId
  const discordId: string =
    user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? user.id

  const dbUser = await prisma.user.findFirst({
    where: { discordId },
    select: { id: true },
  })

  if (!dbUser) {
    return NextResponse.json(
      { error: 'User profile not found. Please complete your profile first.' },
      { status: 404 }
    )
  }

  // 3. Parse body with RegistrationSubmitSchema (discriminated union on format)
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = RegistrationSubmitSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const body = parsed.data

  // 4. Find or create Team (captain-scoped per guild)
  const teamName =
    'teamName' in body && body.teamName ? body.teamName : 'My Team'

  let team = await prisma.team.findFirst({
    where: { guildId, captainId: dbUser.id },
    select: { id: true },
  })

  if (!team) {
    team = await prisma.team.create({
      data: {
        guildId,
        name: teamName,
        captainId: dbUser.id,
      },
      select: { id: true },
    })
  }

  // 5. Check for duplicate registration
  const existing = await prisma.registration.findFirst({
    where: { tournamentId, teamId: team.id },
    select: { id: true },
  })

  if (existing) {
    return NextResponse.json({ error: 'already_registered' }, { status: 409 })
  }

  // 6. Atomic slot reservation inside $transaction with SELECT FOR UPDATE
  try {
    const registration = await prisma.$transaction(async (tx) => {
      // Lock the tournament row to prevent concurrent registrations
      const rows = await tx.$queryRaw<
        Array<{
          id: string
          team_capacity: number
          accepted_count: number
          auto_approve: boolean
          waitlist_enabled: boolean
          status: string
        }>
      >`SELECT id, team_capacity, accepted_count, auto_approve, waitlist_enabled, status FROM tournaments WHERE id = ${tournamentId} AND guild_id = ${guildId} FOR UPDATE`

      const row = rows[0]
      if (!row) {
        throw Object.assign(new Error('Tournament not found'), { httpStatus: 404, code: 'not_found' })
      }

      if (row.status !== 'REGISTRATION_OPEN') {
        throw Object.assign(new Error('not_open'), { httpStatus: 409, code: 'not_open' })
      }

      const { team_capacity, accepted_count, auto_approve, waitlist_enabled } = row

      let regStatus: 'APPROVED' | 'PENDING' | 'WAITLISTED'
      let slotNumber: number | null = null
      let outboxType: string

      if (accepted_count < team_capacity) {
        // Slot available
        if (auto_approve) {
          regStatus = 'APPROVED'
          slotNumber = accepted_count + 1
          outboxType = 'REGISTRATION_AUTO_APPROVED'
          // Increment acceptedCount inside the same tx
          await tx.tournament.update({
            where: { id: tournamentId },
            data: { acceptedCount: { increment: 1 } },
          })
        } else {
          regStatus = 'PENDING'
          outboxType = 'REGISTRATION_SUBMITTED'
        }
      } else if (waitlist_enabled) {
        regStatus = 'WAITLISTED'
        outboxType = 'REGISTRATION_WAITLISTED'
      } else {
        throw Object.assign(new Error('slots_full'), { httpStatus: 409, code: 'slots_full' })
      }

      // Create the Registration
      const reg = await tx.registration.create({
        data: {
          tournamentId,
          guildId,
          teamId: team!.id,
          status: regStatus,
          slotNumber,
          submittedRaw: JSON.stringify(rawBody),
        },
        select: { id: true, status: true, slotNumber: true },
      })

      // Create RegistrationMember rows from body player list (best-effort, format-dependent)
      const memberDiscordIds = extractMemberIds(body, discordId)
      if (memberDiscordIds.length > 0) {
        const dbMembers = await tx.user.findMany({
          where: { discordId: { in: memberDiscordIds } },
          select: { id: true, discordId: true },
        })
        const memberMap = new Map(dbMembers.map((u) => [u.discordId, u.id]))
        const memberRows = memberDiscordIds
          .map((did, idx) => {
            const uid = memberMap.get(did)
            if (!uid) return null
            return {
              registrationId: reg.id,
              userId: uid,
              isCaptain: did === discordId,
              isSubstitute: false,
              status: 'active',
            }
          })
          .filter((r): r is NonNullable<typeof r> => r !== null)

        if (memberRows.length > 0) {
          await tx.registrationMember.createMany({ data: memberRows })
        }
      }

      // Outbox event
      await tx.outboxEvent.create({
        data: {
          guildId,
          type: outboxType,
          payloadJson: { tournamentId, registrationId: reg.id, teamId: team!.id },
          status: 'PENDING',
        },
      })

      return reg
    })

    return NextResponse.json({ registration }, { status: 201 })
  } catch (err: unknown) {
    const e = err as { httpStatus?: number; code?: string; message?: string }
    if (e.httpStatus) {
      return NextResponse.json({ error: e.code ?? e.message }, { status: e.httpStatus })
    }
    console.error('[registrations POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── GET /api/servers/[guildId]/tournaments/[tournamentId]/registrations ──────
// Admin only: returns registrations with optional ?status filter.
// PENDING registrations are NEVER returned from non-admin routes.

export const GET = withPermission(
  AppRole.TOURNAMENT_MANAGER,
  async (req, { guildId, params }) => {
    const tournamentId = params['tournamentId']
    if (!tournamentId) {
      return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status') as RegistrationStatus | null

    // Build where clause — always scope to guildId + tournamentId
    const where: {
      tournamentId: string
      guildId: string
      status?: RegistrationStatus
    } = { tournamentId, guildId }

    if (statusFilter) {
      where.status = statusFilter
    }

    const registrations = await prisma.registration.findMany({
      where,
      select: {
        id: true,
        status: true,
        slotNumber: true,
        createdAt: true,
        approvedAt: true,
        rejectionReason: true,
        team: { select: { name: true, tag: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Serialize dates
    const serialized = registrations.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      approvedAt: r.approvedAt?.toISOString() ?? null,
    }))

    return NextResponse.json({ registrations: serialized })
  }
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractMemberIds(
  body: { format: string; [key: string]: unknown },
  captainDiscordId: string
): string[] {
  const ids: string[] = [captainDiscordId]
  switch (body.format) {
    case 'SIMPLE_MENTIONS': {
      const b = body as { mentions?: string[] }
      if (Array.isArray(b.mentions)) ids.push(...b.mentions)
      break
    }
    case 'CAPTAIN_BASED': {
      const b = body as { captainId?: string; teammates?: string[] }
      if (b.captainId) ids.push(b.captainId)
      if (Array.isArray(b.teammates)) ids.push(...b.teammates)
      break
    }
    case 'FULL_PLAYER_DETAILS':
    case 'TEAM_WITH_SUBSTITUTE':
    case 'CODM_FIVE_PLAYER':
    case 'FULL_WITH_SUBSTITUTE': {
      const b = body as { players?: Array<{ discordId?: string }> }
      if (Array.isArray(b.players)) {
        b.players.forEach((p) => { if (p.discordId) ids.push(p.discordId) })
      }
      break
    }
  }
  return [...new Set(ids)]
}
