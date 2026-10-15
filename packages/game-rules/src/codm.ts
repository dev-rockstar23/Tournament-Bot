import type { CodmScoringConfig, ScoringConfig } from '@esports/shared-types';
import type {
  ApprovedMatchScore,
  MatchScoreParams,
  SeriesResult,
  TeamStanding,
} from './types';
import { calculateStandings as bgmiCalculateStandings } from './bgmi';

export const CODM_BR_DEFAULT_CONFIG: CodmScoringConfig = {
  game: 'COD_MOBILE',
  mode: 'BATTLE_ROYALE',
  killPoints: 1,
  placementPoints: [15, 12, 10, 8, 6, 5, 4, 3, 2, 1, 0, 0],
  winBonus: 0,
};

export function calculateMatchScore(params: MatchScoreParams): ApprovedMatchScore[] {
  const { config, placements, matchId } = params;

  return placements.map((row) => {
    const pointsFromPlacement = config.placementPoints[row.placement - 1] ?? 0;
    const killPoints = row.kills * config.killPoints;
    const total = pointsFromPlacement + killPoints - (row.penalties ?? 0);

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

export function calculateMultiplayerSeries(
  results: { teamId: string; roundsWon: number; roundsLost: number }[],
): SeriesResult[] {
  const map = new Map<string, { roundsWon: number; roundsLost: number }>();

  for (const result of results) {
    const existing = map.get(result.teamId);
    if (existing) {
      existing.roundsWon += result.roundsWon;
      existing.roundsLost += result.roundsLost;
    } else {
      map.set(result.teamId, {
        roundsWon: result.roundsWon,
        roundsLost: result.roundsLost,
      });
    }
  }

  const series: SeriesResult[] = Array.from(map.entries()).map(([teamId, data]) => ({
    teamId,
    wins: data.roundsWon > data.roundsLost ? 1 : 0,
    losses: data.roundsWon <= data.roundsLost ? 1 : 0,
    roundsWon: data.roundsWon,
    roundsLost: data.roundsLost,
  }));

  series.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.roundsWon - a.roundsWon;
  });

  return series;
}
