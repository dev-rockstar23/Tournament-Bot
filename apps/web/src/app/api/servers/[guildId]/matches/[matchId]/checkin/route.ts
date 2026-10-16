import { withPermission, AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { NextResponse } from 'next/server'

// POST /api/servers/[guildId]/matches/[matchId]/checkin
// Allows a team captain to check in their team for a match.
export const POST = withPermission(
  AppRole.PLAYER,
  async (_req, { guildId, userId, params }) => {
    const matchId = params['matchId']
    if (!matchId) {
      return NextResponse.json({ error: 'Missing matchId' }, { status: 400 })
    }

    // 1. Find match and validate it belongs to guildId
    const match = await prisma.match.findFirst({
      where: { id: matchId, guildId },
      select: { id: true, status: true },
    })

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // 2. Validate match status is CHECK_IN or READY
    if (match.status !== 'CHECK_IN' && match.status !== 'READY') {
      return NextResponse.json(
        {
          error: 'check_in_not_open',
          message: `Check-in is not open for this match (current status: ${match.status})`,
        },
        { status: 409 }
      )
    }

    // 3. Find the MatchParticipant for a team where the requesting user is captain
    const participant = await prisma.matchParticipant.findFirst({
      where: {
        matchId,
        team: {
          captainId: userId,
          guildId,
        },
      },
      select: {
        id: true,
        matchId: true,
        teamId: true,
        checkedIn: true,
        checkedInAt: true,
        seeding: true,
        isVacant: true,
        createdAt: true,
      },
    })

    if (!participant) {
      return NextResponse.json(
        {
          error: 'not_a_participant',
          message: 'You are not a captain of any team participating in this match',
        },
        { status: 403 }
      )
    }

    if (participant.checkedIn) {
      return NextResponse.json(
        { error: 'already_checked_in', message: 'Your team has already checked in' },
        { status: 409 }
      )
    }

    // 4. Update MatchParticipant.checkedIn = true, checkedInAt = now()
    const updated = await prisma.matchParticipant.update({
      where: { id: participant.id },
      data: {
        checkedIn: true,
        checkedInAt: new Date(),
      },
      select: {
        id: true,
        matchId: true,
        teamId: true,
        checkedIn: true,
        checkedInAt: true,
        seeding: true,
        isVacant: true,
        createdAt: true,
      },
    })

    // 5. Return updated participant
    return NextResponse.json({
      participant: {
        ...updated,
        checkedInAt: updated.checkedInAt?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
      },
    })
  }
)
