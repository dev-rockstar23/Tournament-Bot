import { z } from 'zod';

// ─── BgmiScoringConfigSchema ──────────────────────────────────────────────────

export const BgmiScoringConfigSchema = z.object({
  game: z.literal('BGMI'),
  killPoints: z.number().positive().default(1),
  placementPoints: z.array(z.number()).length(16),
  maxKillPoints: z.number().optional(),
});
export type BgmiScoringConfig = z.infer<typeof BgmiScoringConfigSchema>;

// ─── FreeFireScoringConfigSchema ──────────────────────────────────────────────

export const FreeFireScoringConfigSchema = z.object({
  game: z.literal('FREE_FIRE'),
  killPoints: z.number().positive().default(1),
  placementPoints: z.array(z.number()).length(12),
  booyahBonus: z.number().optional(),
});
export type FreeFireScoringConfig = z.infer<typeof FreeFireScoringConfigSchema>;

// ─── CodmScoringConfigSchema ──────────────────────────────────────────────────

export const CodmModeEnum = z.enum(['BATTLE_ROYALE', 'MULTIPLAYER']);
export type CodmMode = z.infer<typeof CodmModeEnum>;

export const CodmScoringConfigSchema = z.object({
  game: z.literal('COD_MOBILE'),
  mode: CodmModeEnum,
  killPoints: z.number().positive(),
  placementPoints: z.array(z.number()),
  winBonus: z.number().optional(),
});
export type CodmScoringConfig = z.infer<typeof CodmScoringConfigSchema>;

// ─── Discriminated union ──────────────────────────────────────────────────────

export const ScoringConfigSchema = z.discriminatedUnion('game', [
  BgmiScoringConfigSchema,
  FreeFireScoringConfigSchema,
  CodmScoringConfigSchema,
]);
export type ScoringConfig = z.infer<typeof ScoringConfigSchema>;
