import type { ScoringConfig } from '@esports/shared-types';

export type { ScoringConfig };

export interface PlacementRow {
  teamId: string;
  placement: number;
  kills: number;
  penalties?: number;
}

export interface TieBreaker {
  field: 'kills' | 'placement' | 'points' | 'custom';
  order: 'asc' | 'desc';
}

export interface MatchScoreParams {
  config: ScoringConfig;
  placements: PlacementRow[];
  matchId: string;
}

export interface TeamStanding {
  teamId: string;
  totalPoints: number;
  totalKills: number;
  matchesPlayed: number;
  bestPlacement: number | null;
  rank: number;
}

export interface SeriesResult {
  teamId: string;
  wins: number;
  losses: number;
  roundsWon: number;
  roundsLost: number;
}

export interface ApprovedMatchScore {
  matchId: string;
  teamId: string;
  points: number;
  kills: number;
  placement: number | null;
}
