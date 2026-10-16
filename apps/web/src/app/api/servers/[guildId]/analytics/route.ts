import { withPermission, AppRole } from '@esports/permissions';
import { prisma } from '@esports/database';
import { NextResponse } from 'next/server';
import { subDays } from 'date-fns';

export const GET = withPermission(
  AppRole.REFEREE,
  async (req, { guildId }) => {
    const { searchParams } = new URL(req.url);

    const game = searchParams.get('game'); // BGMI | FREE_FIRE | COD_MOBILE | ALL | null
    const mode = searchParams.get('mode');
    const tournamentId = searchParams.get('tournamentId');
    const status = searchParams.get('status');
    const dateFromParam = searchParams.get('dateFrom');
    const dateToParam = searchParams.get('dateTo');

    // Default date range: last 30 days
    const dateTo = dateToParam ? new Date(dateToParam) : new Date();
    const dateFrom = dateFromParam ? new Date(dateFromParam) : subDays(dateTo, 30);

    // Build shared tournament filter — always scoped to guildId
    const tournamentWhere: Record<string, unknown> = {
      guildId,
      createdAt: { gte: dateFrom, lte: dateTo },
    };
    if (game && game !== 'ALL') tournamentWhere['game'] = game;
    if (mode) tournamentWhere['mode'] = mode;
    if (tournamentId) tournamentWhere['id'] = tournamentId;
    if (status) tournamentWhere['status'] = status;

    // Registration filter scoped through tournament
    const registrationWhere: Record<string, unknown> = {
      tournament: { guildId, createdAt: { gte: dateFrom, lte: dateTo } },
    };
    if (game && game !== 'ALL') {
      (registrationWhere['tournament'] as Record<string, unknown>)['game'] = game;
    }
    if (mode) {
      (registrationWhere['tournament'] as Record<string, unknown>)['mode'] = mode;
    }
    if (tournamentId) registrationWhere['tournamentId'] = tournamentId;
    if (status) {
      (registrationWhere['tournament'] as Record<string, unknown>)['status'] = status;
    }

    const [
      totalTournaments,
      draftCount,
      publishedCount,
      currentlyLive,
      upcoming,
      totalRegistrations,
      uniquePlayersResult,
      activeTeamsResult,
      fillRateResult,
      checkinData,
      pendingResults,
      openDisputes,
      completionData,
    ] = await Promise.all([
      // totalTournaments
      prisma.tournament.count({ where: tournamentWhere }),

      // draftCount
      prisma.tournament.count({ where: { ...tournamentWhere, status: 'DRAFT' } }),

      // publishedCount (status != DRAFT)
      prisma.tournament.count({
        where: { ...tournamentWhere, status: { not: 'DRAFT' } },
      }),

      // currentlyLive
      prisma.tournament.count({ where: { ...tournamentWhere, status: 'LIVE' } }),

      // upcoming
      prisma.tournament.count({
        where: {
          ...tournamentWhere,
          status: { in: ['REGISTRATION_OPEN', 'CHECK_IN'] },
        },
      }),

      // totalRegistrations
      prisma.registration.count({ where: registrationWhere }),

      // uniquePlayers — COUNT DISTINCT userId from registration_members
      prisma.registrationMember.findMany({
        where: {
          registration: registrationWhere,
        },
        select: { userId: true },
        distinct: ['userId'],
      }),

      // activeTeams — teams with APPROVED registration in active tournament
      prisma.registration.count({
        where: {
          ...registrationWhere,
          status: 'APPROVED',
          tournament: {
            ...(registrationWhere['tournament'] as Record<string, unknown>),
            status: { in: ['REGISTRATION_OPEN', 'CHECK_IN', 'LIVE'] },
          },
        },
      }),

      // fillRate — AVG(acceptedCount / teamCapacity)
      prisma.tournament.findMany({
        where: { ...tournamentWhere, teamCapacity: { gt: 0 } },
        select: { acceptedCount: true, teamCapacity: true },
      }),

      // checkin data for checkinRate
      prisma.matchParticipant.aggregate({
        where: {
          match: { guildId, stage: { tournament: tournamentWhere } },
        },
        _count: { id: true },
      }).then(async (total) => {
        const checkedIn = await prisma.matchParticipant.count({
          where: {
            checkedIn: true,
            match: { guildId, stage: { tournament: tournamentWhere } },
          },
        });
        return { total: total._count.id, checkedIn };
      }),

      // pendingResults — matches WHERE status=AWAITING_RESULT scoped to guildId
      prisma.match.count({
        where: {
          guildId,
          status: 'AWAITING_RESULT',
          stage: { tournament: tournamentWhere },
        },
      }),

      // openDisputes — disputes WHERE status=OPEN, scoped via match→guildId
      prisma.dispute.count({
        where: {
          status: 'OPEN',
          match: { guildId, stage: { tournament: tournamentWhere } },
        },
      }),

      // completion data
      prisma.tournament.groupBy({
        by: ['status'],
        where: {
          ...tournamentWhere,
          status: { in: ['COMPLETED', 'LIVE', 'CHECK_IN'] },
        },
        _count: { id: true },
      }),
    ]);

    // Calculate derived metrics
    const uniquePlayers = uniquePlayersResult.length;

    const fillRate =
      fillRateResult.length > 0
        ? (fillRateResult.reduce(
            (sum, t) => sum + (t.teamCapacity > 0 ? t.acceptedCount / t.teamCapacity : 0),
            0
          ) /
            fillRateResult.length) *
          100
        : 0;

    const checkinRate =
      checkinData.total > 0
        ? (checkinData.checkedIn / checkinData.total) * 100
        : 0;

    const statusCounts = Object.fromEntries(
      completionData.map((row) => [row.status, row._count.id])
    );
    const completed = statusCounts['COMPLETED'] ?? 0;
    const live = statusCounts['LIVE'] ?? 0;
    const checkIn = statusCounts['CHECK_IN'] ?? 0;
    const completionDenominator = completed + live + checkIn;
    const completionRate =
      completionDenominator > 0 ? (completed / completionDenominator) * 100 : 0;

    return NextResponse.json({
      totalTournaments,
      draftCount,
      publishedCount,
      currentlyLive,
      upcoming,
      totalRegistrations,
      uniquePlayers,
      activeTeams: activeTeamsResult,
      fillRate: Math.round(fillRate * 10) / 10,
      checkinRate: Math.round(checkinRate * 10) / 10,
      pendingResults,
      openDisputes,
      completionRate: Math.round(completionRate * 10) / 10,
    });
  }
);
