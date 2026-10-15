import type { ScoringConfig } from '@esports/shared-types';
import type {
  ApprovedMatchScore,
  MatchScoreParams,
  TeamStanding,
  TieBreaker,
} from './types';

export const BGMI_DEFAULT_CONFIG: ScoringConfig = {
  game: 'BGMI',
  killPoints: 1,
  placementPoints: [15, 12, 10, 8, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0],
  maxKillPoints: undefined,
};

export function calculateMatchScore(params: MatchScoreParams): ApprovedMatchScore[] {
  const { config, placements, matchId } = params;

  return placements.map((row) => {
    const pointsFromPlacement = config.placementPoints[row.placement - 1] ?? 0;
    let killPoints = row.kills * config.killPoints;

    if (config.game === 'BGMI' && config.maxKillPoints !== undefined) {
      killPoints = Math.min(killPoints, config.maxKillPoints);
    }

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
  const map = new Map<
    string,
    { totalPoints: number; totalKills: number; matchesPlayed: number; bestPlacement: number | null }
  >();

  for (const score of scores) {
    const existing = map.get(score.teamId);
    if (existing) {
      existing.totalPoints += score.points;
      existing.totalKills += score.kills;
      existing.matchesPlayed += 1;
      if (score.placement !== null) {
        if (existing.bestPlacement === null || score.placement < existing.bestPlacement) {
          existing.bestPlacement = score.placement;
        }
      }
    } else {
      map.set(score.teamId, {
        totalPoints: score.points,
        totalKills: score.kills,
        matchesPlayed: 1,
        bestPlacement: score.placement,
      });
    }
  }

  const standings: TeamStanding[] = Array.from(map.entries()).map(([teamId, data]) => ({
    teamId,
    ...data,
    rank: 0,
  }));

  standings.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return b.totalKills - a.totalKills;
  });

  standings.forEach((s, i) => {
    s.rank = i + 1;
  });

  return standings;
}

export function applyTiebreakers(
  standings: TeamStanding[],
  tiebreakers: TieBreaker[],
): TeamStanding[] {
  const result = [...standings];

  result.sort((a, b) => {
    for (const tb of tiebreakers) {
      let diff = 0;
      if (tb.field === 'points') {
        diff = a.totalPoints - b.totalPoints;
      } else if (tb.field === 'kills') {
        diff = a.totalKills - b.totalKills;
      } else if (tb.field === 'placement') {
        const ap = a.bestPlacement ?? Infinity;
        const bp = b.bestPlacement ?? Infinity;
        diff = ap - bp;
      }
      // 'custom' tiebreaker field is a no-op here; external logic handles it

      if (diff !== 0) {
        return tb.order === 'asc' ? diff : -diff;
      }
    }
    return 0;
  });

  result.forEach((s, i) => {
    s.rank = i + 1;
  });

  return result;
}
