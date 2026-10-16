import { withPermission, AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { NextResponse } from 'next/server'

// GET /api/servers/[guildId]/matches/[matchId]/room
// Returns room credentials ONLY to a captain of a checked-in team.
// Room credentials are NEVER returned from any other route.
export const GET = withPermission(
  AppRole.PLAYER,
  async (_req, { guildId, userId, params }) => {
    const matchId = params['matchId']
    if (!matchId) {
      return NextResponse.json({ error: 'Missing matchId' }, { status: 400 })
    }

    // 1. Find match and validate guildId
    const match = await prisma.match.findFirst({
      where: { id: matchId, guildId },
      select: { id: true, status: true },
    })

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // 2. Validate match status is LIVE or READY
    if (match.status !== 'LIVE' && match.status !== 'READY') {
      return NextResponse.json(
        {
          error: 'room_not_available',
          message: `Room credentials are not available for matches with status: ${match.status}`,
        },
        { status: 409 }
      )
    }

    // 3. Find RoomCredential for this match
    const credential = await prisma.roomCredential.findUnique({
      where: { matchId },
      select: {
        id: true,
        roomId: true,
        password: true,
        releaseAt: true,
        expiresAt: true,
      },
    })

    if (!credential) {
      return NextResponse.json(
        { error: 'room_not_set', message: 'Room credentials have not been set for this match' },
        { status: 404 }
      )
    }

    // 4. Validate releaseAt <= now()
    if (credential.releaseAt > new Date()) {
      return NextResponse.json(
        {
          error: 'room_not_released',
          message: 'Room credentials are not yet available',
          releaseAt: credential.releaseAt.toISOString(),
        },
        { status: 403 }
      )
    }

    // 5. Validate requesting user is captain of a checked-in team for this match
    const checkedInParticipant = await prisma.matchParticipant.findFirst({
      where: {
        matchId,
        checkedIn: true,
        team: {
          captainId: userId,
          guildId,
        },
      },
      select: { id: true },
    })

    if (!checkedInParticipant) {
      return NextResponse.json(
        {
          error: 'unauthorized',
          message: 'You must be the captain of a checked-in team to view room credentials',
        },
        { status: 403 }
      )
    }

    // 6. Return ONLY roomId and password — never expose in any other route
    return NextResponse.json({
      roomId: credential.roomId,
      password: credential.password,
    })
  }
)
