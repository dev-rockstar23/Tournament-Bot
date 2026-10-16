import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveUserRole, AppRole } from '@esports/permissions';
import { prisma } from '@esports/database';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';

interface PageProps {
  params: { guildId: string };
}

export default async function AnalyticsPage({ params }: PageProps) {
  const { guildId } = params;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/?next=/servers/${guildId}/admin/analytics`);
  }

  const discordId: string =
    user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? '';

  const userRole = await resolveUserRole({
    prisma,
    userId: discordId,
    guildId,
    botToken: process.env.DISCORD_BOT_TOKEN ?? '',
  });

  if (userRole < AppRole.REFEREE) {
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
            You need at least Referee role to view analytics.
          </p>
        </div>
      </main>
    );
  }

  // Fetch initial analytics data server-side for fast first paint (last 30 days, all games)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  let initialData = null;
  try {
    const res = await fetch(
      `${baseUrl}/api/servers/${guildId}/analytics`,
      { headers: { Cookie: '' }, cache: 'no-store' }
    );
    if (res.ok) {
      initialData = await res.json();
    }
  } catch {
    // Non-fatal: dashboard will fetch on mount
  }

  return (
    <AnalyticsDashboard
      guildId={guildId}
      initialData={initialData}
      userRole={userRole as AppRole}
    />
  );
}
