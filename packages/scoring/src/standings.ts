import type { PrismaClient } from '@esports/database/src/generated/client';
import type { Decimal } from '@esports/database/src/generated/client/runtime/library';
import type { ApprovedMatchScore, TeamStanding } from '@esports/game-rules';
import { calculateStandings } from '@esports/game-rules';

export async function computeTournamentStandings(
  prisma: PrismaClient,
  tournamentId: string,
  guildId: string,
): Promise<TeamStanding[]> {
  const rows = await prisma.scoreEvent.findMany({
    where: {
      match: {
        stage: {
          tournamentId,
          tournament: { guildId },
        },
      },
      status: 'active',
    },
    select: {
      matchId: true,
      teamId: true,
      points: true,
      kills: true,
      placement: true,
    },
  });

  const scores: ApprovedMatchScore[] = rows.map((row: {
    matchId: string;
    teamId: string;
    points: Decimal;
    kills: number;
    placement: number | null;
  }) => ({
    matchId: row.matchId,
    teamId: row.teamId,
    points: Number(row.points),
    kills: row.kills,
    placement: row.placement ?? 0,
  }));

  return calculateStandings(scores);
}
