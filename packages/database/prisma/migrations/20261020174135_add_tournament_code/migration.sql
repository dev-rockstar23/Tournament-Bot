-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "tournament_code" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tournaments_tournament_code_key" ON "tournaments"("tournament_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tournaments_tournament_code_idx" ON "tournaments"("tournament_code");
