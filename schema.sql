-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('VIEWER', 'PLAYER', 'REFEREE', 'TOURNAMENT_MANAGER', 'SERVER_ADMIN');

-- CreateEnum
CREATE TYPE "Game" AS ENUM ('BGMI', 'FREE_FIRE', 'COD_MOBILE');

-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('BATTLE_ROYALE', 'CLASH_SQUAD', 'MULTIPLAYER');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'CHECK_IN', 'LIVE', 'COMPLETED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RegistrationPhase" AS ENUM ('FIRST_OPEN', 'REOPENED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'CHECK_IN', 'READY', 'LIVE', 'AWAITING_RESULT', 'UNDER_REVIEW', 'COMPLETED', 'POSTPONED', 'CANCELLED', 'FORFEIT', 'DISPUTED');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('FREE', 'PAID');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'DISPUTED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('RAZORPAY');

-- CreateEnum
CREATE TYPE "AwardType" AS ENUM ('CHAMPION', 'RUNNER_UP', 'THIRD_PLACE', 'MVP', 'TOP_FRAGGER', 'BEST_TEAM', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'PROCESSING', 'FULFILLED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISQUALIFIED', 'WAITLISTED');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ScoreEventType" AS ENUM ('MATCH_SCORE', 'CORRECTION');

-- CreateEnum
CREATE TYPE "MapRotationType" AS ENUM ('FIXED', 'SEQUENTIAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RegistrationFormat" AS ENUM ('SIMPLE_MENTIONS', 'CAPTAIN_BASED', 'FULL_PLAYER_DETAILS', 'TEAM_WITH_SUBSTITUTE', 'CODM_FIVE_PLAYER', 'FULL_WITH_SUBSTITUTE');

-- CreateTable
CREATE TABLE "discord_servers" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "owner_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "installed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discord_servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "server_settings" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "accent_color" TEXT,
    "logo_url" TEXT,
    "banner_url" TEXT,
    "announcement_channel_id" TEXT,
    "match_channel_id" TEXT,
    "results_channel_id" TEXT,
    "disputes_channel_id" TEXT,
    "admin_channel_id" TEXT,
    "registration_channel_id" TEXT,
    "overlay_token" TEXT,
    "control_panel_message_id" TEXT,
    "refund_on_cancel" BOOLEAN NOT NULL DEFAULT false,
    "max_delay_days" INTEGER NOT NULL DEFAULT 90,
    "dm_notification_config" JSONB NOT NULL DEFAULT '{"advance_1":{"hours":24,"enabled":true},"advance_2":{"minutes":30,"enabled":true},"advance_3":{"minutes":5,"enabled":true},"checkin_reminder":{"minutes_before_close":15,"enabled":true}}',
    "timezone_configured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "server_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "server_role_bindings" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "discord_role_id" TEXT NOT NULL,
    "discord_role_name" TEXT NOT NULL,
    "app_role" "AppRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "server_role_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "discord_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "discriminator" TEXT,
    "avatar" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "server_memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "server_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "game" "Game" NOT NULL,
    "ign" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT,
    "captain_id" TEXT NOT NULL,
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "game" "Game" NOT NULL,
    "mode" "GameMode" NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "registration_phase" "RegistrationPhase" NOT NULL DEFAULT 'FIRST_OPEN',
    "entry_type" "EntryType" NOT NULL DEFAULT 'FREE',
    "entry_price" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "team_capacity" INTEGER NOT NULL,
    "accepted_count" INTEGER NOT NULL DEFAULT 0,
    "roster_min" INTEGER NOT NULL DEFAULT 2,
    "roster_max" INTEGER NOT NULL DEFAULT 4,
    "substitute_allowed" INTEGER NOT NULL DEFAULT 1,
    "waitlist_enabled" BOOLEAN NOT NULL DEFAULT true,
    "registration_format" "RegistrationFormat" NOT NULL DEFAULT 'FULL_WITH_SUBSTITUTE',
    "auto_approve" BOOLEAN NOT NULL DEFAULT false,
    "map_pool" JSONB NOT NULL DEFAULT '[]',
    "map_rotation" "MapRotationType" NOT NULL DEFAULT 'SEQUENTIAL',
    "banner_url" TEXT,
    "rules_url" TEXT,
    "organizer_id" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "registration_open_at" TIMESTAMP(3),
    "registration_close_at" TIMESTAMP(3),
    "check_in_open_at" TIMESTAMP(3),
    "check_in_close_at" TIMESTAMP(3),
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "results_locked" BOOLEAN NOT NULL DEFAULT false,
    "extension_count" INTEGER NOT NULL DEFAULT 0,
    "payment_config_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_rule_versions" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "rules_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tournament_rule_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stages" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_start" TIMESTAMP(3) NOT NULL,
    "scheduled_end" TIMESTAMP(3) NOT NULL,
    "map" TEXT,
    "mode" TEXT,
    "result_deadline" TIMESTAMP(3),
    "room_release_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "postponed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "match_specific_rules" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_segments" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "segment_number" INTEGER NOT NULL,
    "map" TEXT,
    "mode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "winner_id" TEXT,
    "score_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_participants" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "seeding" INTEGER,
    "checked_in" BOOLEAN NOT NULL DEFAULT false,
    "checked_in_at" TIMESTAMP(3),
    "is_vacant" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "slot_number" INTEGER,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "phase" "RegistrationPhase" NOT NULL DEFAULT 'FIRST_OPEN',
    "payment_status" "PaymentStatus",
    "promoted_from_waitlist" BOOLEAN NOT NULL DEFAULT false,
    "submitted_raw" TEXT,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_members" (
    "id" TEXT NOT NULL,
    "registration_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "game_profile_id" TEXT,
    "is_substitute" BOOLEAN NOT NULL DEFAULT false,
    "is_captain" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_credentials" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "release_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "released_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "result_submissions" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "submitted_by" TEXT NOT NULL,
    "scorecard_json" JSONB NOT NULL,
    "evidence_url" TEXT,
    "status" "ResultStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "result_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_events" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "type" "ScoreEventType" NOT NULL DEFAULT 'MATCH_SCORE',
    "points" DECIMAL(10,2) NOT NULL,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "placement" INTEGER,
    "penalties" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "correction_of" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "raised_by" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence_url" TEXT,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_to" TEXT,
    "resolution" TEXT,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "winner_records" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "placement" INTEGER NOT NULL,
    "award_type" "AwardType" NOT NULL DEFAULT 'CHAMPION',
    "roster_snapshot" JSONB NOT NULL,
    "is_superseded" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "winner_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "awards" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "user_id" TEXT,
    "team_id" TEXT,
    "type" "AwardType" NOT NULL,
    "label" TEXT NOT NULL,
    "criteria" TEXT,
    "fulfillment_status" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING',
    "fulfilled_by" TEXT,
    "fulfilled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizer_payment_configs" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'RAZORPAY',
    "razorpay_key_id" TEXT NOT NULL,
    "razorpay_key_secret" TEXT NOT NULL,
    "razorpay_webhook_secret" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizer_payment_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "registration_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider_ref" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload_json" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider_ref" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discord_message_bindings" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "record_type" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "tournament_id" TEXT,
    "match_id" TEXT,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discord_message_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload_json" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempted_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_jobs" (
    "id" TEXT NOT NULL,
    "job_key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload_json" JSONB NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "tournament_id" TEXT,
    "match_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_bans" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'Repeated unauthorized admin access attempts',
    "banned_until" TIMESTAMP(3),
    "is_permanent" BOOLEAN NOT NULL DEFAULT false,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "banned_by" TEXT,
    "lifted_at" TIMESTAMP(3),
    "lifted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_bans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_metrics" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "metric_type" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "value" DECIMAL(20,4) NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_logs" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "error_type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bridge_health_checks" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latency_ms" INTEGER,
    "metadata" JSONB,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bridge_health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discord_servers_guild_id_key" ON "discord_servers"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "server_settings_guild_id_key" ON "server_settings"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "server_role_bindings_guild_id_discord_role_id_key" ON "server_role_bindings"("guild_id", "discord_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_discord_id_key" ON "users"("discord_id");

-- CreateIndex
CREATE UNIQUE INDEX "server_memberships_user_id_guild_id_key" ON "server_memberships"("user_id", "guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_profiles_user_id_game_key" ON "game_profiles"("user_id", "game");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_user_id_key" ON "team_members"("team_id", "user_id");

-- CreateIndex
CREATE INDEX "tournaments_guild_id_status_idx" ON "tournaments"("guild_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_rule_versions_tournament_id_version_key" ON "tournament_rule_versions"("tournament_id", "version");

-- CreateIndex
CREATE INDEX "matches_scheduled_start_idx" ON "matches"("scheduled_start");

-- CreateIndex
CREATE UNIQUE INDEX "matches_stage_id_number_key" ON "matches"("stage_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "match_segments_match_id_segment_number_key" ON "match_segments"("match_id", "segment_number");

-- CreateIndex
CREATE UNIQUE INDEX "match_participants_match_id_team_id_key" ON "match_participants"("match_id", "team_id");

-- CreateIndex
CREATE INDEX "registrations_tournament_id_status_idx" ON "registrations"("tournament_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_tournament_id_team_id_key" ON "registrations"("tournament_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "room_credentials_match_id_key" ON "room_credentials"("match_id");

-- CreateIndex
CREATE INDEX "result_submissions_match_id_idx" ON "result_submissions"("match_id");

-- CreateIndex
CREATE INDEX "score_events_match_id_idx" ON "score_events"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizer_payment_configs_guild_id_user_id_key" ON "organizer_payment_configs"("guild_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_registration_id_key" ON "orders"("registration_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_provider_event_id_key" ON "payment_events"("provider_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_order_id_key" ON "refunds"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "discord_message_bindings_channel_id_message_id_key" ON "discord_message_bindings"("channel_id", "message_id");

-- CreateIndex
CREATE INDEX "outbox_events_status_created_at_idx" ON "outbox_events"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_jobs_job_key_key" ON "scheduled_jobs"("job_key");

-- CreateIndex
CREATE INDEX "scheduled_jobs_status_scheduled_for_idx" ON "scheduled_jobs"("status", "scheduled_for");

-- CreateIndex
CREATE INDEX "audit_logs_guild_id_created_at_idx" ON "audit_logs"("guild_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "admin_bans_guild_id_user_id_key" ON "admin_bans"("guild_id", "user_id");

-- CreateIndex
CREATE INDEX "system_metrics_guild_id_timestamp_idx" ON "system_metrics"("guild_id", "timestamp");

-- CreateIndex
CREATE INDEX "error_logs_guild_id_timestamp_idx" ON "error_logs"("guild_id", "timestamp");

-- CreateIndex
CREATE INDEX "error_logs_source_timestamp_idx" ON "error_logs"("source", "timestamp");

-- CreateIndex
CREATE INDEX "bridge_health_checks_guild_id_checked_at_idx" ON "bridge_health_checks"("guild_id", "checked_at");

-- AddForeignKey
ALTER TABLE "server_settings" ADD CONSTRAINT "server_settings_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "discord_servers"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "server_role_bindings" ADD CONSTRAINT "server_role_bindings_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "discord_servers"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "server_memberships" ADD CONSTRAINT "server_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "server_memberships" ADD CONSTRAINT "server_memberships_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "discord_servers"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_profiles" ADD CONSTRAINT "game_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "discord_servers"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_captain_id_fkey" FOREIGN KEY ("captain_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "discord_servers"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_payment_config_id_fkey" FOREIGN KEY ("payment_config_id") REFERENCES "organizer_payment_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_rule_versions" ADD CONSTRAINT "tournament_rule_versions_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stages" ADD CONSTRAINT "stages_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_segments" ADD CONSTRAINT "match_segments_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_members" ADD CONSTRAINT "registration_members_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_members" ADD CONSTRAINT "registration_members_game_profile_id_fkey" FOREIGN KEY ("game_profile_id") REFERENCES "game_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_credentials" ADD CONSTRAINT "room_credentials_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_submissions" ADD CONSTRAINT "result_submissions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "winner_records" ADD CONSTRAINT "winner_records_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "winner_records" ADD CONSTRAINT "winner_records_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizer_payment_configs" ADD CONSTRAINT "organizer_payment_configs_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "discord_servers"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discord_message_bindings" ADD CONSTRAINT "discord_message_bindings_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "discord_servers"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discord_message_bindings" ADD CONSTRAINT "discord_message_bindings_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discord_message_bindings" ADD CONSTRAINT "discord_message_bindings_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "discord_servers"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "discord_servers"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_bans" ADD CONSTRAINT "admin_bans_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "discord_servers"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_bans" ADD CONSTRAINT "admin_bans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_metrics" ADD CONSTRAINT "system_metrics_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "discord_servers"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "discord_servers"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bridge_health_checks" ADD CONSTRAINT "bridge_health_checks_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "discord_servers"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;

