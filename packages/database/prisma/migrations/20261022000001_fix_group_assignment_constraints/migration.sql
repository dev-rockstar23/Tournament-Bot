-- DropIndex: Remove @@unique([groupId, teamId]) to allow re-adding a team after soft-delete
DROP INDEX IF EXISTS "group_team_assignments_group_id_team_id_key";

-- DropIndex: Remove @unique on registrationId to allow the same registration to appear in
-- multiple stage group assignments (qualifying → next stage)
DROP INDEX IF EXISTS "group_team_assignments_registration_id_key";

-- Partial unique index: enforce that qualifier groups (stageId IS NULL) cannot have
-- duplicate groupNumber values for the same tournament.
-- Standard @@unique([tournamentId, stageId, groupNumber]) does not deduplicate NULL stageId
-- rows in PostgreSQL (NULL != NULL in unique indexes).
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_groups_qualifier_unique"
  ON "tournament_groups" ("tournament_id", "group_number")
  WHERE "stage_id" IS NULL;
