-- CreateTable
CREATE TABLE "pt_designs" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "game" "Game" NOT NULL,
    "designer_name" TEXT NOT NULL,
    "preview_url" TEXT,
    "price" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pt_designs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pt_licenses" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "design_id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "purchase_order_id" TEXT,
    "granted_by" TEXT,
    "granted_at" TIMESTAMP(3),
    "revoked_by" TEXT,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pt_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pt_licenses_tournament_id_design_id_key" ON "pt_licenses"("tournament_id", "design_id");

-- AddForeignKey
ALTER TABLE "pt_designs" ADD CONSTRAINT "pt_designs_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "discord_servers"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pt_licenses" ADD CONSTRAINT "pt_licenses_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pt_licenses" ADD CONSTRAINT "pt_licenses_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "pt_designs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pt_licenses" ADD CONSTRAINT "pt_licenses_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "discord_servers"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;
