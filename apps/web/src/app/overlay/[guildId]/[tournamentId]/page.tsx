import { prisma } from '@esports/database'
import { computeTournamentStandings } from '@esports/scoring'
import OverlayClient, { type StandingRow, type CurrentMatch } from './OverlayClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { guildId: string; tournamentId: string }
  searchParams: { token?: string }
}

export default async function OverlayPage({ params, searchParams }: PageProps) {
  const { guildId, tournamentId } = params
  const token = searchParams.token

  // 1. Token must be present
  if (!token) {
    return (
      <html>
        <body style={{ background: '#0a0a0f', color: '#f8fafc', fontFamily: 'sans-serif', padding: '40px' }}>
          <h1>401 — Unauthorized</h1>
          <p>Missing overlay token. Append <code>?token=YOUR_TOKEN</code> to the URL.</p>
        </body>
      </html>
    )
  }

  // 2. Validate token — must match the settings for this guildId
  const settings = await prisma.serverSettings.findFirst({
    where: { guildId, overlayToken: token },
    select: { guildId: true },
  })

  if (!settings) {
    // Check if any settings record exists for this guildId so we can distinguish 401 vs 403
    const serverExists = await prisma.serverSettings.findUnique({
      where: { guildId },
      select: { guildId: true, overlayToken: true },
    })

    if (!serverExists || serverExists.overlayToken === null) {
      return (
        <html>
          <body style={{ background: '#0a0a0f', color: '#f8fafc', fontFamily: 'sans-serif', padding: '40px' }}>
            <h1>401 — Unauthorized</h1>
            <p>Invalid overlay token.</p>
          </body>
        </html>
      )
    }

    // Token exists but does not match this guild — wrong server
    return (
      <html>
        <body style={{ background: '#0a0a0f', color: '#f8fafc', fontFamily: 'sans-serif', padding: '40px' }}>
          <h1>403 — Forbidden</h1>
          <p>This token does not belong to this server.</p>
        </body>
      </html>
    )
  }

  // 3. Fetch standings
  const rawStandings = await computeTournamentStandings(prisma, tournamentId, guildId)

  // Resolve team names in a single query
  const teamIds = rawStandings.map((s) => s.teamId)
  const teams = teamIds.length > 0
    ? await prisma.team.findMany({
        where: { id: { in: teamIds } },
        select: { id: true, name: true },
      })
    : []

  const teamNameMap = new Map(teams.map((t) => [t.id, t.name]))

  const standings: StandingRow[] = rawStandings.map((s, i) => ({
    teamId: s.teamId,
    teamName: teamNameMap.get(s.teamId) ?? s.teamId,
    totalPoints: s.totalPoints,
    totalKills: s.totalKills,
    matchesPlayed: s.matchesPlayed,
    rank: s.rank ?? i + 1,
  }))

  // 4. Fetch current match — LIVE first, otherwise most recently COMPLETED
  const liveMatch = await prisma.match.findFirst({
    where: {
      guildId,
      status: 'LIVE',
      stage: { tournamentId },
    },
    select: { id: true, number: true, status: true },
    orderBy: { scheduledStart: 'asc' },
  })

  const currentMatch: CurrentMatch | null = liveMatch
    ? { id: liveMatch.id, number: liveMatch.number, status: liveMatch.status }
    : await prisma.match.findFirst({
        where: {
          guildId,
          status: 'COMPLETED',
          stage: { tournamentId },
        },
        select: { id: true, number: true, status: true },
        orderBy: { completedAt: 'desc' },
      }).then((m) =>
        m ? { id: m.id, number: m.number, status: m.status } : null
      )

  return (
    <OverlayClient
      guildId={guildId}
      tournamentId={tournamentId}
      initialStandings={standings}
      initialMatch={currentMatch}
    />
  )
}
