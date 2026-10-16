import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveUserRole, AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { computeTournamentStandings } from '@esports/scoring'
import { GlassCard } from '@/components/ui/GlassCard'
import { FinalizeButton } from '@/components/admin/FinalizeButton'

interface PageProps {
  params: { guildId: string; tournamentId: string }
}

const gameLabels: Record<string, string> = {
  BGMI: 'BGMI',
  FREE_FIRE: 'Free Fire',
  COD_MOBILE: 'COD Mobile',
}

export default async function FinalizeTournamentPage({ params }: PageProps) {
  const { guildId, tournamentId } = params

  // Auth guard: TOURNAMENT_MANAGER+
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/?next=/servers/${guildId}/admin/tournaments/${tournamentId}/finalize`)
  }

  const discordId: string =
    user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? ''

  const userRole = await resolveUserRole({
    prisma,
    userId: discordId,
    guildId,
    botToken: process.env.DISCORD_BOT_TOKEN ?? '',
  })

  if (userRole < AppRole.TOURNAMENT_MANAGER) {
    redirect(`/servers/${guildId}/admin/tournaments`)
  }

  // Fetch tournament with stages → matches and disputes — scoped to guildId
  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, guildId },
    select: {
      id: true,
      name: true,
      game: true,
      status: true,
      resultsLocked: true,
      stages: {
        select: {
          matches: {
            select: {
              id: true,
              number: true,
              status: true,
              disputes: {
                where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
                select: { id: true, status: true },
              },
            },
          },
        },
      },
    },
  })

  if (!tournament) {
    redirect(`/servers/${guildId}/admin/tournaments`)
  }

  const terminalStatuses = new Set(['COMPLETED', 'CANCELLED', 'FORFEIT'])
  const allMatches = tournament.stages.flatMap((s) => s.matches)
  const blockingMatches = allMatches.filter((m) => !terminalStatuses.has(m.status as string))
  const blockingDisputeCount = allMatches.reduce((n, m) => n + m.disputes.length, 0)

  const allMatchesComplete = blockingMatches.length === 0
  const noOpenDisputes = blockingDisputeCount === 0
  const canFinalize =
    allMatchesComplete &&
    noOpenDisputes &&
    !tournament.resultsLocked &&
    tournament.status === 'LIVE'

  // Compute standings preview (top 10) — may return empty array if no scores yet
  let standingsPreview: Awaited<ReturnType<typeof computeTournamentStandings>> = []
  try {
    const all = await computeTournamentStandings(prisma, tournamentId, guildId)
    standingsPreview = all.slice(0, 10)
  } catch {
    // standings computation failure must not break the page
  }

  const statusColor: Record<string, string> = {
    DRAFT: 'text-gray-400',
    REGISTRATION_OPEN: 'text-green-400',
    REGISTRATION_CLOSED: 'text-yellow-400',
    CHECK_IN: 'text-blue-400',
    LIVE: 'text-violet-400',
    COMPLETED: 'text-emerald-400',
    CANCELLED: 'text-red-400',
    ARCHIVED: 'text-gray-500',
  }

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-display text-2xl font-black text-white">
            Finalize Tournament
          </h1>
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-500/15 border border-violet-500/30 text-violet-400"
          >
            {gameLabels[tournament.game] ?? tournament.game}
          </span>
        </div>
        <p className="text-white/50 text-sm">{tournament.name}</p>
        <p className="text-sm mt-1">
          Status:{' '}
          <span className={`font-semibold ${statusColor[tournament.status] ?? 'text-white'}`}>
            {tournament.status}
          </span>
        </p>
      </div>

      {/* Guard checklist */}
      <GlassCard className="p-5 space-y-3" hover={false}>
        <h2 className="font-display text-base font-bold text-white mb-3">
          Finalization Checklist
        </h2>
        <ChecklistItem
          ok={allMatchesComplete}
          label="All matches completed"
          detail={
            allMatchesComplete
              ? `${allMatches.length} match${allMatches.length !== 1 ? 'es' : ''} done`
              : `${blockingMatches.length} match${blockingMatches.length !== 1 ? 'es' : ''} still in progress`
          }
        />
        <ChecklistItem
          ok={noOpenDisputes}
          label="No open disputes"
          detail={
            noOpenDisputes
              ? 'No active disputes'
              : `${blockingDisputeCount} dispute${blockingDisputeCount !== 1 ? 's' : ''} pending`
          }
        />
        <ChecklistItem
          ok={tournament.status === 'LIVE'}
          label="Tournament is LIVE"
          detail={
            tournament.status === 'LIVE'
              ? 'Ready to finalize'
              : `Current status: ${tournament.status}`
          }
        />
        <ChecklistItem
          ok={!tournament.resultsLocked}
          label="Results not yet locked"
          detail={tournament.resultsLocked ? 'Already locked' : 'Not locked'}
          invert
        />
      </GlassCard>

      {/* Standings preview */}
      {standingsPreview.length > 0 && (
        <GlassCard className="p-5" hover={false}>
          <h2 className="font-display text-base font-bold text-white mb-4">
            Current Standings (Top {standingsPreview.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs uppercase tracking-wider">
                  <th className="text-left pb-2 pr-4">Rank</th>
                  <th className="text-left pb-2 pr-4">Team</th>
                  <th className="text-right pb-2 pr-4">Points</th>
                  <th className="text-right pb-2 pr-4">Kills</th>
                  <th className="text-right pb-2">Games</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {standingsPreview.map((row) => (
                  <tr key={row.teamId} className="text-white/80">
                    <td className="py-2 pr-4 font-mono text-white/60">
                      {row.rank === 1
                        ? '🥇'
                        : row.rank === 2
                        ? '🥈'
                        : row.rank === 3
                        ? '🥉'
                        : `#${row.rank}`}
                    </td>
                    <td className="py-2 pr-4 font-semibold text-white">{row.teamId}</td>
                    <td className="py-2 pr-4 text-right text-violet-300 font-mono">
                      {row.totalPoints.toFixed(0)}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono">{row.totalKills}</td>
                    <td className="py-2 text-right font-mono">{row.matchesPlayed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Discord announcement preview */}
      <GlassCard className="p-5" hover={false}>
        <h2 className="font-display text-base font-bold text-white mb-3">
          Discord Announcement Preview
        </h2>
        <div className="bg-[#36393f] rounded-lg p-4 text-sm font-mono text-white/80 space-y-1">
          <p className="text-yellow-400 font-bold">🏆 Tournament Complete!</p>
          <p>
            <span className="text-white/60">Tournament:</span>{' '}
            <span className="text-white">{tournament.name}</span>
          </p>
          {standingsPreview[0] && (
            <p>
              <span className="text-yellow-400">🥇 Champion:</span>{' '}
              <span className="text-white">{standingsPreview[0].teamId}</span>
            </p>
          )}
          {standingsPreview[1] && (
            <p>
              <span className="text-gray-400">🥈 Runner-Up:</span>{' '}
              <span className="text-white">{standingsPreview[1].teamId}</span>
            </p>
          )}
          {standingsPreview[2] && (
            <p>
              <span className="text-orange-400">🥉 Third Place:</span>{' '}
              <span className="text-white">{standingsPreview[2].teamId}</span>
            </p>
          )}
        </div>
      </GlassCard>

      {/* Finalize button */}
      <div>
        {!canFinalize && (
          <p className="text-yellow-400 text-sm mb-3">
            ⚠ Complete all checklist items before finalizing.
          </p>
        )}
        <FinalizeButton
          guildId={guildId}
          tournamentId={tournamentId}
          disabled={!canFinalize}
        />
      </div>
    </div>
  )
}

// ── Checklist item component ────────────────────────────────────────────────

interface ChecklistItemProps {
  ok: boolean
  label: string
  detail: string
  /** When invert=true, ok means the condition is undesirable (e.g. resultsLocked=false is good) */
  invert?: boolean
}

function ChecklistItem({ ok, label, detail, invert }: ChecklistItemProps) {
  // For "Results not yet locked", ok=true means NOT locked — that's the passing state
  const passing = invert ? ok : ok
  return (
    <div className="flex items-start gap-3">
      <span className="text-lg leading-none mt-0.5" aria-hidden="true">
        {passing ? '✅' : '❌'}
      </span>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${passing ? 'text-white' : 'text-red-400'}`}>
          {label}
        </p>
        <p className="text-xs text-white/40 mt-0.5">{detail}</p>
      </div>
    </div>
  )
}
