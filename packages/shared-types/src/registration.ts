import { z } from 'zod';
import { GameTypeEnum } from './tournament';

// ─── Shared sub-schemas ───────────────────────────────────────────────────────

const DISCORD_ID_REGEX = /^\d{17,19}$/;
const UID_REGEX = /^\d{8,12}$/;

const discordId = () => z.string().regex(DISCORD_ID_REGEX, 'Must be a valid Discord user ID');

const BasePlayerSchema = z.object({
  discordId: discordId(),
  ign: z.string().min(3).max(20),
  uid: z.string().regex(UID_REGEX, 'Must be a numeric string of 8-12 digits'),
  game: GameTypeEnum,
});

// ─── SimpleMentionsSchema ────────────────────────────────────────────────────

export const SimpleMentionsSchema = z.object({
  format: z.literal('SIMPLE_MENTIONS'),
  mentions: z
    .array(discordId())
    .min(2)
    .max(4),
});
export type SimpleMentions = z.infer<typeof SimpleMentionsSchema>;

// ─── CaptainBasedSchema ───────────────────────────────────────────────────────

export const CaptainBasedSchema = z.object({
  format: z.literal('CAPTAIN_BASED'),
  captainId: discordId(),
  teammates: z.array(discordId()).min(1).max(3),
  teamName: z.string().min(3).max(30),
});
export type CaptainBased = z.infer<typeof CaptainBasedSchema>;

// ─── FullPlayerDetailsSchema ──────────────────────────────────────────────────

export const FullPlayerDetailsSchema = z.object({
  format: z.literal('FULL_PLAYER_DETAILS'),
  teamName: z.string().min(3).max(30),
  players: z.array(BasePlayerSchema).min(2).max(4),
});
export type FullPlayerDetails = z.infer<typeof FullPlayerDetailsSchema>;

// ─── TeamWithSubstituteSchema ─────────────────────────────────────────────────

export const TeamWithSubstituteSchema = z.object({
  format: z.literal('TEAM_WITH_SUBSTITUTE'),
  teamName: z.string().min(3).max(30),
  players: z.array(BasePlayerSchema).min(2).max(4),
  substitute: BasePlayerSchema.optional(),
});
export type TeamWithSubstitute = z.infer<typeof TeamWithSubstituteSchema>;

// ─── CodmFivePlayerSchema ─────────────────────────────────────────────────────

const CodmRoleEnum = z.enum(['IGL', 'FRAGGER', 'SUPPORT', 'SNIPER', 'FLEX']);

const CodmPlayerSchema = z.object({
  discordId: discordId(),
  ign: z.string().min(3).max(20),
  uid: z.string().regex(UID_REGEX, 'Must be a numeric string of 8-12 digits'),
  role: CodmRoleEnum,
});
export type CodmRole = z.infer<typeof CodmRoleEnum>;

export const CodmFivePlayerSchema = z.object({
  format: z.literal('CODM_FIVE_PLAYER'),
  teamName: z.string().min(3).max(30),
  players: z.array(CodmPlayerSchema).length(5),
});
export type CodmFivePlayer = z.infer<typeof CodmFivePlayerSchema>;

// ─── FullWithSubstituteSchema ─────────────────────────────────────────────────

export const FullWithSubstituteSchema = z.object({
  format: z.literal('FULL_WITH_SUBSTITUTE'),
  teamName: z.string().min(3).max(30),
  players: z.array(BasePlayerSchema).min(2).max(6),
  substitute: BasePlayerSchema.optional(),
  captain: discordId(),
});
export type FullWithSubstitute = z.infer<typeof FullWithSubstituteSchema>;

// ─── Discriminated union ──────────────────────────────────────────────────────

export const RegistrationSubmitSchema = z.discriminatedUnion('format', [
  SimpleMentionsSchema,
  CaptainBasedSchema,
  FullPlayerDetailsSchema,
  TeamWithSubstituteSchema,
  CodmFivePlayerSchema,
  FullWithSubstituteSchema,
]);
export type RegistrationSubmit = z.infer<typeof RegistrationSubmitSchema>;
