import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveUserRole, AppRole } from '@esports/permissions';
import { prisma } from '@esports/database';
import { DeveloperDashboard } from '@/components/developer/DeveloperDashboard';

interface PageProps {
  params: { guildId: string };
}

export default async function DeveloperPage({ params }: PageProps) {
  const { guildId } = params;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/?next=/servers/${guildId}/developer`);
  }

  const discordId: string =
    user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? '';

  const userRole = await resolveUserRole({
    prisma,
    userId: discordId,
    guildId,
    botToken: process.env.DISCORD_BOT_TOKEN ?? '',
  });

  if (userRole < AppRole.SERVER_ADMIN) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div className="text-center">
          <h1 className="font-display text-4xl font-black text-white mb-4">
            Access Denied
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            You need Server Admin role to view the developer dashboard.
          </p>
        </div>
      </main>
    );
  }

  // Fetch initial data from all 5 API routes in parallel
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  
  const [metricsRes, errorsRes, bridgeHealthRes, botAnalyticsRes, websiteErrorsRes] = await Promise.all([
    fetch(`${baseUrl}/api/developer/metrics?guildId=${guildId}`, { cache: 'no-store' }).catch(() => null),
    fetch(`${baseUrl}/api/developer/errors?guildId=${guildId}&source=bot`, { cache: 'no-store' }).catch(() => null),
    fetch(`${baseUrl}/api/developer/bridge-health?guildId=${guildId}`, { cache: 'no-store' }).catch(() => null),
    fetch(`${baseUrl}/api/developer/bot-analytics?guildId=${guildId}`, { cache: 'no-store' }).catch(() => null),
    fetch(`${baseUrl}/api/developer/website-errors?guildId=${guildId}`, { cache: 'no-store' }).catch(() => null),
  ]);

  const initialMetrics = metricsRes?.ok ? await metricsRes.json() : [];
  const initialErrors = errorsRes?.ok ? await errorsRes.json() : [];
  const initialBridgeHealth = bridgeHealthRes?.ok ? await bridgeHealthRes.json() : [];
  const initialBotAnalytics = botAnalyticsRes?.ok ? await botAnalyticsRes.json() : { totalCommands: 0, topCommands: [] };
  const initialWebsiteErrors = websiteErrorsRes?.ok ? await websiteErrorsRes.json() : [];

  return (
    <DeveloperDashboard
      guildId={guildId}
      initialMetrics={initialMetrics}
      initialErrors={initialErrors}
      initialBridgeHealth={initialBridgeHealth}
      initialBotAnalytics={initialBotAnalytics}
      initialWebsiteErrors={initialWebsiteErrors}
    />
  );
}
