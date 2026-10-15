import { z } from 'zod';

// ─── Enum literals ────────────────────────────────────────────────────────────

export const GameTypeEnum = z.enum(['BGMI', 'FREE_FIRE', 'COD_MOBILE']);
export type GameType = z.infer<typeof GameTypeEnum>;

export const TournamentModeEnum = z.enum(['BATTLE_ROYALE', 'CLASH_SQUAD', 'MULTIPLAYER']);
export type TournamentMode = z.infer<typeof TournamentModeEnum>;

export const EntryTypeEnum = z.enum(['FREE', 'PAID']);
export type EntryType = z.infer<typeof EntryTypeEnum>;

export const MapRotationEnum = z.enum(['FIXED', 'SEQUENTIAL', 'CUSTOM']);
export type MapRotation = z.infer<typeof MapRotationEnum>;

export const VisibilityEnum = z.enum(['public', 'private']);
export type Visibility = z.infer<typeof VisibilityEnum>;

export const RegistrationFormatEnum = z.enum([
  'SIMPLE_MENTIONS',
  'CAPTAIN_BASED',
  'FULL_PLAYER_DETAILS',
  'TEAM_WITH_SUBSTITUTE',
  'CODM_FIVE_PLAYER',
  'FULL_WITH_SUBSTITUTE',
]);
export type RegistrationFormat = z.infer<typeof RegistrationFormatEnum>;

export const TournamentStatusEnum = z.enum([
  'DRAFT',
  'REGISTRATION_OPEN',
  'REGISTRATION_CLOSED',
  'CHECK_IN',
  'LIVE',
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED',
]);
export type TournamentStatus = z.infer<typeof TournamentStatusEnum>;

// ─── Step schemas ─────────────────────────────────────────────────────────────

export const TournamentCreateStep1Schema = z.object({
  name: z.string().min(3).max(100),
  game: GameTypeEnum,
  mode: TournamentModeEnum,
  description: z.string().max(500).optional(),
});
export type TournamentCreateStep1 = z.infer<typeof TournamentCreateStep1Schema>;

export const TournamentCreateStep2Schema = z.object({
  entryType: EntryTypeEnum,
  entryPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid decimal')
    .optional(),
  currency: z.string().default('INR'),
  teamCapacity: z.number().int().min(2).max(256),
});
export type TournamentCreateStep2 = z.infer<typeof TournamentCreateStep2Schema>;

export const TournamentCreateStep3Schema = z.object({
  rosterMin: z.number().int().min(2).max(6),
  rosterMax: z.number().int().min(2).max(10),
  substituteAllowed: z.number().int().min(0).max(2),
  waitlistEnabled: z.boolean(),
  registrationFormat: RegistrationFormatEnum,
});
export type TournamentCreateStep3 = z.infer<typeof TournamentCreateStep3Schema>;

export const TournamentCreateStep4Schema = z.object({
  mapPool: z.array(z.string()),
  mapRotation: MapRotationEnum,
});
export type TournamentCreateStep4 = z.infer<typeof TournamentCreateStep4Schema>;

export const TournamentCreateStep5Schema = z.object({
  registrationOpenAt: z.string().datetime().optional(),
  registrationCloseAt: z.string().datetime().optional(),
  checkInOpenAt: z.string().datetime().optional(),
  checkInCloseAt: z.string().datetime().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
});
export type TournamentCreateStep5 = z.infer<typeof TournamentCreateStep5Schema>;

export const TournamentCreateStep6Schema = z.object({
  bannerUrl: z.string().url().optional(),
  rulesUrl: z.string().url().optional(),
  visibility: VisibilityEnum,
  autoApprove: z.boolean(),
});
export type TournamentCreateStep6 = z.infer<typeof TournamentCreateStep6Schema>;

// ─── Merged full create schema ────────────────────────────────────────────────

export const TournamentCreateSchema = z
  .object({})
  .merge(TournamentCreateStep1Schema)
  .merge(TournamentCreateStep2Schema)
  .merge(TournamentCreateStep3Schema)
  .merge(TournamentCreateStep4Schema)
  .merge(TournamentCreateStep5Schema)
  .merge(TournamentCreateStep6Schema);
export type TournamentCreate = z.infer<typeof TournamentCreateSchema>;

// ─── Status transition schema ─────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<TournamentStatus, TournamentStatus[]> = {
  DRAFT: ['REGISTRATION_OPEN'],
  REGISTRATION_OPEN: ['REGISTRATION_CLOSED', 'CANCELLED'],
  REGISTRATION_CLOSED: ['CHECK_IN', 'CANCELLED'],
  CHECK_IN: ['LIVE', 'CANCELLED'],
  LIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['ARCHIVED'],
  CANCELLED: [],
  ARCHIVED: [],
};

export const TournamentStatusTransitionSchema = z
  .object({
    from: TournamentStatusEnum,
    to: TournamentStatusEnum,
  })
  .refine(
    (data) => {
      const allowed = ALLOWED_TRANSITIONS[data.from];
      return allowed.includes(data.to);
    },
    (data) => ({
      message: `Transition from ${data.from} to ${data.to} is not allowed`,
      path: ['to'],
    }),
  );
export type TournamentStatusTransition = z.infer<typeof TournamentStatusTransitionSchema>;
