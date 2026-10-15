import { z } from 'zod';

export const MatchCreateSchema = z.object({
  stageId: z.string().cuid(),
  number: z.number().int().positive(),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  map: z.string().optional(),
  mode: z.string().optional(),
  matchSpecificRules: z.string().optional(),
});
export type MatchCreate = z.infer<typeof MatchCreateSchema>;

export const MatchBulkCreateSchema = z.array(MatchCreateSchema).min(1).max(50);
export type MatchBulkCreate = z.infer<typeof MatchBulkCreateSchema>;

export const MatchRescheduleSchema = z.object({
  matchId: z.string().cuid(),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  reason: z.string().optional(),
});
export type MatchReschedule = z.infer<typeof MatchRescheduleSchema>;
