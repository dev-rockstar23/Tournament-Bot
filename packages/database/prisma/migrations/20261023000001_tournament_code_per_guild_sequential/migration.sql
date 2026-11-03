-- Migration: tournament_code_per_guild_sequential
--
-- Changes:
--   1. Drop the old global @unique constraint on tournament_code.
--   2. Add a per-guild composite unique index on (guild_id, tournament_code).
--
-- This allows each Discord server to have its own sequential T0001, T0002, …
-- while two different servers can both have a T0001 without conflicting.

-- Drop old global unique constraint (Prisma named it tournaments_tournament_code_key)
ALTER TABLE "tournaments" DROP CONSTRAINT IF EXISTS "tournaments_tournament_code_key";

-- Add per-guild composite unique index
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_guild_code_unique"
  ON "tournaments" ("guild_id", "tournament_code")
  WHERE "tournament_code" IS NOT NULL;
