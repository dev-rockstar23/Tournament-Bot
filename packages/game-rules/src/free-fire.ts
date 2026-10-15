import type { ScoringConfig } from '@esports/shared-types';
import type {
  ApprovedMatchScore,
  MatchScoreParams,
  SeriesResult,
  TeamStanding,
} from './types';
import { calculateStandings as bgmiCalculateStandings } from './bgmi';

export const FREE_FIRE_DEFAULT_CONFIG: ScoringConfig = {
  game: 'FREE_FIRE',
  killPoints: 1,
  placementPoints: [12, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0],
  booyahBonus: 2,
};

export function calculateMatchScore(params: MatchScoreParams): ApprovedMatchScore[] {
  const { config, placements, matchId } = params;

  return placements.map((row) => {
    const pointsFromPlacement = config.placementPoints[row.placement - 1] ?? 0;
    const killPoints = row.kills * config.killPoints;

    // Apply booyah bonus (placement = 1) for Free Fire
    let booyahBonus = 0;
    if (config.game === 'FREE_FIRE' && row.placement === 1) {
      booyahBonus = config.booyahBonus ?? 0;
    }

    const total = pointsFromPlacement + killPoints + booyahBonus - (row.penalties ?? 0);

    return {
      matchId,
      teamId: row.teamId,
      points: total,
      kills: row.kills,
      placement: row.placement,
    };
  });
}

export function calculateStandings(scores: ApprovedMatchScore[]): TeamStanding[] {
  return bgmiCalculateStandings(scores);
}

export function calculateClashSquadSeries(
  results: { teamId: string; win: boolean }[],
): SeriesResult[] {
  const map = new Map<string, { wins: number; losses: number }>();

  for (const result of results) {
    const existing = map.get(result.teamId);
    if (existing) {
      if (result.win) {
        existing.wins += 1;
      } else {
        existing.losses += 1;
      }
    } else {
      map.set(result.teamId, {
        wins: result.win ? 1 : 0,
        losses: result.win ? 0 : 1,
      });
    }
  }

  const series: SeriesResult[] = Array.from(map.entries()).map(([teamId, data]) => ({
    teamId,
    wins: data.wins,
    losses: data.losses,
    roundsWon: 0,
    roundsLost: 0,
  }));

  series.sort((a, b) => b.wins - a.wins);

  return series;
}
