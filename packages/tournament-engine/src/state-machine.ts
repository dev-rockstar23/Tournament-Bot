import { TournamentStatus } from '@esports/shared-types';
import { MatchStatus } from '@esports/database';

// ─── Tournament transition map ────────────────────────────────────────────────

export const TOURNAMENT_TRANSITIONS: Record<TournamentStatus, TournamentStatus[]> = {
  DRAFT: ['REGISTRATION_OPEN'],
  REGISTRATION_OPEN: ['REGISTRATION_CLOSED', 'CANCELLED'],
  REGISTRATION_CLOSED: ['CHECK_IN', 'CANCELLED'],
  CHECK_IN: ['LIVE', 'CANCELLED'],
  LIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['ARCHIVED'],
  CANCELLED: [],
  ARCHIVED: [],
};

// ─── Match transition map ─────────────────────────────────────────────────────

export const MATCH_TRANSITIONS: Record<MatchStatus, MatchStatus[]> = {
  SCHEDULED: ['CHECK_IN', 'POSTPONED', 'CANCELLED'],
  CHECK_IN: ['READY', 'CANCELLED'],
  READY: ['LIVE', 'CANCELLED'],
  LIVE: ['AWAITING_RESULT', 'CANCELLED'],
  AWAITING_RESULT: ['UNDER_REVIEW', 'DISPUTED', 'COMPLETED'],
  UNDER_REVIEW: ['COMPLETED', 'DISPUTED'],
  DISPUTED: ['UNDER_REVIEW', 'COMPLETED'],
  COMPLETED: [],
  POSTPONED: ['SCHEDULED', 'CANCELLED'],
  CANCELLED: [],
  FORFEIT: [],
};

// ─── Error class ──────────────────────────────────────────────────────────────

export class InvalidTransitionError extends Error {
  readonly from: string;
  readonly to: string;
  readonly allowed: string[];
  readonly httpStatus = 409 as const;

  constructor(from: string, to: string, allowed: string[]) {
    super(`Transition from ${from} to ${to} is not allowed. Allowed: [${allowed.join(', ')}]`);
    this.name = 'InvalidTransitionError';
    this.from = from;
    this.to = to;
    this.allowed = allowed;
  }
}

// ─── Guard helpers ────────────────────────────────────────────────────────────

/**
 * Asserts that a tournament status transition is valid.
 * Throws InvalidTransitionError (HTTP 409) if the transition is not permitted.
 */
export function assertTournamentTransition(
  from: TournamentStatus,
  to: TournamentStatus,
): void {
  const allowed = TOURNAMENT_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new InvalidTransitionError(from, to, allowed);
  }
}

/**
 * Asserts that a match status transition is valid.
 * Throws InvalidTransitionError (HTTP 409) if the transition is not permitted.
 */
export function assertMatchTransition(
  from: MatchStatus,
  to: MatchStatus,
): void {
  const allowed = MATCH_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new InvalidTransitionError(from, to, allowed);
  }
}
