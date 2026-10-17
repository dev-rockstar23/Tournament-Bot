import { withPermission } from '@esports/permissions'
import { AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export const GET = withPermission(AppRole.REFEREE, async (_req, { guildId }) => {
  // Run primary KPI queries in parallel for performance
  const [
    totalTournaments,
    currentlyLive,
    upcoming,
    totalRegistrations,
    pendingResults,
    openDisputes,
  ] = await Promise.all([
    prisma.tournament.count({ where: { guildId } }),
    prisma.tournament.count({ where: { guildId, status: 'LIVE' } }),
    prisma.tournament.count({
      where: { guildId, status: { in: ['REGISTRATION_OPEN', 'CHECK_IN'] } },
    }),
    prisma.registration.count({ where: { guildId } }),
    prisma.match.count({ where: { guildId, status: 'AWAITING_RESULT' } }),
    prisma.dispute.count({ where: { match: { guildId }, status: 'OPEN' } }),
  ])

  // Unique players: distinct userId from registrationMembers scoped to guild
  const uniquePlayersResult = await prisma.registrationMember.findMany({
    where: { registration: { guildId } },
    select: { userId: true },
    distinct: ['userId'],
  })
  const uniquePlayers = uniquePlayersResult.length

  // Completion rate: completed / (completed + live + check_in)
  const [completed, liveAndCheckIn] = await Promise.all([
    prisma.tournament.count({ where: { guildId, status: 'COMPLETED' } }),
    prisma.tournament.count({
      where: { guildId, status: { in: ['LIVE', 'CHECK_IN', 'COMPLETED'] } },
    }),
  ])
  const completionRate =
    liveAndCheckIn > 0 ? Math.round((completed / liveAndCheckIn) * 100) : 0

  // Fill rate: average of (acceptedCount / capacity) for non-draft tournaments
  const nonDraftTournaments = await prisma.tournament.findMany({
    where: { guildId, status: { notIn: ['DRAFT'] }, teamCapacity: { gt: 0 } },
    select: { acceptedCount: true, teamCapacity: true },
  })
  const fillRate =
    nonDraftTournaments.length > 0
      ? Math.round(
          (nonDraftTournaments.reduce(
            (sum, t) => sum + t.acceptedCount / t.teamCapacity,
            0,
          ) /
            nonDraftTournaments.length) *
            100,
        )
      : 0

  return NextResponse.json({
    totalTournaments,
    currentlyLive,
    upcoming,
    totalRegistrations,
    uniquePlayers,
    activeTeams: totalRegistrations, // approximation
    fillRate,
    checkinRate: 0, // requires check-in data — placeholder
    noShowRate: 0, // requires attendance data — placeholder
    pendingResults,
    openDisputes,
    completionRate,
  })
})
