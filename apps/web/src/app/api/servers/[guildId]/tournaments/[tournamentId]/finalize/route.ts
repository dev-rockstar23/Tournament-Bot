import { NextResponse } from 'next/server';
import { withPermission, AppRole } from '@esports/permissions';
import {
  assertTournamentTransition,
  InvalidTransitionError,
} from '@esports/tournament-engine';
import { computeTournamentStandings } from '@esports/scoring';
import { prisma } from '@esports/database';

export const dynamic = 'force-dynamic'

export const POST = withPermission(
  AppRole.TOURNAMENT_MANAGER,
  async (_req, { guildId, userId, params }) => {
    const tournamentId = params['tournamentId'];
    if (!tournamentId) {
      return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 });
    }

    // ── 1. Fetch tournament with stages → matches, disputes — validate guildId ──
    const tournament = await prisma.tournament.findFirst({
      where: { id: tournamentId, guildId },
      select: {
        id: true,
        name: true,
        status: true,
        resultsLocked: true,
        stages: {
          select: {
            matches: {
              select: {
                id: true,
                number: true,
                status: true,
                disputes: {
                  where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
                  select: { id: true, status: true },
                },
              },
            },
          },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // ── 2. Guard checks ───────────────────────────────────────────────────────
    const terminalStatuses = new Set(['COMPLETED', 'CANCELLED', 'FORFEIT']);
    const allMatches = tournament.stages.flatMap((s) => s.matches);

    const blockingMatches = allMatches.filter(
      (m) => !terminalStatuses.has(m.status as string)
    );

    const blockingDisputes = allMatches.flatMap((m) =>
      m.disputes.map((d) => ({ matchId: m.id, matchNumber: m.number, disputeId: d.id, status: d.status }))
    );

    if (blockingMatches.length > 0 || blockingDisputes.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot finalize tournament — blocking conditions exist',
          blockingMatches: blockingMatches.map((m) => ({
            matchId: m.id,
            matchNumber: m.number,
            status: m.status,
          })),
          blockingDisputes,
        },
        { status: 409 }
      );
    }

    // ── 3. Compute final standings ────────────────────────────────────────────
    const standings = await computeTournamentStandings(prisma, tournamentId, guildId);

    if (standings.length < 3) {
      return NextResponse.json(
        { error: 'Not enough teams with scores to finalize (need at least 3)' },
        { status: 409 }
      );
    }

    // ── 4. Transaction ────────────────────────────────────────────────────────
    try {
      assertTournamentTransition(tournament.status, 'COMPLETED');
    } catch (err) {
      if (err instanceof InvalidTransitionError) {
        return NextResponse.json({ error: err.message }, { status: 409 });
      }
      throw err;
    }

    const top3 = await prisma.$transaction(async (tx) => {
      // Create WinnerRecord rows for top 3
      const winnerData = [
        {
          tournamentId,
          teamId: standings[0].teamId,
          placement: 1,
          awardType: 'CHAMPION' as const,
          rosterSnapshot: {},
          version: 1,
        },
        {
          tournamentId,
          teamId: standings[1].teamId,
          placement: 2,
          awardType: 'RUNNER_UP' as const,
          rosterSnapshot: {},
          version: 1,
        },
        {
          tournamentId,
          teamId: standings[2].teamId,
          placement: 3,
          awardType: 'THIRD_PLACE' as const,
          rosterSnapshot: {},
          version: 1,
        },
      ];

      const winners = await Promise.all(
        winnerData.map((w) => tx.winnerRecord.create({ data: w }))
      );

      // Create Award records (MVP and top fragger from score events)
      const topKillsRow = standings.reduce((best, cur) =>
        cur.totalKills > best.totalKills ? cur : best
      );

      await tx.award.createMany({
        data: [
          {
            tournamentId,
            teamId: standings[0].teamId,
            type: 'CHAMPION',
            label: 'Champion',
            criteria: 'Most tournament points',
          },
          {
            tournamentId,
            teamId: topKillsRow.teamId,
            type: 'TOP_FRAGGER',
            label: 'Top Fragger',
            criteria: `${topKillsRow.totalKills} total kills`,
          },
        ],
        skipDuplicates: true,
      });

      // Lock results
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { resultsLocked: true },
      });

      // Transition status to COMPLETED
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      // Create outbox event
      await tx.outboxEvent.create({
        data: {
          type: 'TOURNAMENT_COMPLETED',
          guildId,
          payloadJson: {
            tournamentId,
            championTeamId: standings[0]?.teamId,
          },
          status: 'PENDING',
        },
      });

      return winners;
    });

    // ── 5. Audit log (outside transaction is fine — non-critical) ─────────────
    try {
      await prisma.auditLog.create({
        data: {
          guildId,
          actorId: userId,
          action: 'TOURNAMENT_FINALIZED',
          targetType: 'tournament',
          targetId: tournamentId,
          metadata: { championTeamId: standings[0]?.teamId },
        },
      });
    } catch {
      // Audit log failure must not block the success response
    }

    // ── 6. Return results ─────────────────────────────────────────────────────
    return NextResponse.json({
      winners: top3,
      standings,
    });
  }
);
