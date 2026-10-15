import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@esports/database';

export async function GET(
  _request: NextRequest,
  { params }: { params: { guildId: string; tournamentId: string } }
) {
  // Scope to tournamentId + guildId — prevents cross-guild data leakage
  const scoreEvents = await prisma.scoreEvent.findMany({
    where: {
      match: {
        stage: {
          tournamentId: params.tournamentId,
          tournament: { guildId: params.guildId },
        },
      },
      status: 'active',
    },
    include: { team: { select: { name: true, tag: true } } },
  });

  // Aggregate by team
  const teamMap = new Map<
    string,
    {
      teamId: string;
      name: string;
      tag: string | null;
      totalPoints: number;
      totalKills: number;
      matchesPlayed: number;
      bestPlacement: number | null;
    }
  >();

  for (const event of scoreEvents) {
    const existing = teamMap.get(event.teamId) ?? {
      teamId: event.teamId,
      name: event.team.name,
      tag: event.team.tag,
      totalPoints: 0,
      totalKills: 0,
      matchesPlayed: 0,
      bestPlacement: null,
    };

    existing.totalPoints += Number(event.points);
    existing.totalKills += event.kills;
    existing.matchesPlayed += 1;

    if (event.placement !== null) {
      existing.bestPlacement =
        existing.bestPlacement === null
          ? event.placement
          : Math.min(existing.bestPlacement, event.placement);
    }

    teamMap.set(event.teamId, existing);
  }

  const standings = Array.from(teamMap.values())
    .sort(
      (a, b) =>
        b.totalPoints - a.totalPoints || b.totalKills - a.totalKills
    )
    .map((entry, index) => ({ rank: index + 1, ...entry }));

  return NextResponse.json({ standings });
}
