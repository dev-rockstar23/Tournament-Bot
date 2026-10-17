import { prisma } from '@esports/database'
import { GlassCard } from '@/components/ui/GlassCard'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import {
  Trophy,
  Radio,
  CalendarClock,
  Users,
  UserCheck,
  Shield,
  TrendingUp,
  CheckSquare,
  Activity,
  AlertTriangle,
  Clock,
  Star,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface DashboardPageProps {
  params: { guildId: string }
}

interface KpiCard {
  label: string
  value: number
  icon: React.ElementType
  suffix?: string
  borderClass?: string
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { guildId } = params

  // Run primary KPI queries in parallel — same logic as the API route
  const [
    totalTournaments,
    currentlyLive,
    upcoming,
    totalRegistrations,
    pendingResults,
    openDisputes,
  ] = await Promise.all([
    prisma.tournament.count({ where: { guildId } }),
    prisma.tournament.count({ where: { guildId, status: 'LIVE' } }),
    prisma.tournament.count({
      where: { guildId, status: { in: ['REGISTRATION_OPEN', 'CHECK_IN'] } },
    }),
    prisma.registration.count({ where: { guildId } }),
    prisma.match.count({ where: { guildId, status: 'AWAITING_RESULT' } }),
    prisma.dispute.count({ where: { match: { guildId }, status: 'OPEN' } }),
  ])

  // Unique players
  const uniquePlayersResult = await prisma.registrationMember.findMany({
    where: { registration: { guildId } },
    select: { userId: true },
    distinct: ['userId'],
  })
  const uniquePlayers = uniquePlayersResult.length

  // Completion rate
  const [completed, liveAndCheckIn] = await Promise.all([
    prisma.tournament.count({ where: { guildId, status: 'COMPLETED' } }),
    prisma.tournament.count({
      where: { guildId, status: { in: ['LIVE', 'CHECK_IN', 'COMPLETED'] } },
    }),
  ])
  const completionRate =
    liveAndCheckIn > 0 ? Math.round((completed / liveAndCheckIn) * 100) : 0

  // Fill rate
  const nonDraftTournaments = await prisma.tournament.findMany({
    where: { guildId, status: { notIn: ['DRAFT'] }, teamCapacity: { gt: 0 } },
    select: { acceptedCount: true, teamCapacity: true },
  })
  const fillRate =
    nonDraftTournaments.length > 0
      ? Math.round(
          (nonDraftTournaments.reduce(
            (sum, t) => sum + t.acceptedCount / t.teamCapacity,
            0,
          ) /
            nonDraftTournaments.length) *
            100,
        )
      : 0

  const activeTeams = totalRegistrations // approximation

  const kpis: KpiCard[] = [
    { label: 'Total Tournaments', value: totalTournaments, icon: Trophy },
    {
      label: 'Currently Live',
      value: currentlyLive,
      icon: Radio,
    },
    { label: 'Upcoming', value: upcoming, icon: CalendarClock },
    { label: 'Total Registrations', value: totalRegistrations, icon: CheckSquare },
    { label: 'Unique Players', value: uniquePlayers, icon: Users },
    { label: 'Active Teams', value: activeTeams, icon: Shield },
    {
      label: 'Fill Rate',
      value: fillRate,
      icon: TrendingUp,
      suffix: '%',
    },
    { label: 'Check-in Rate', value: 0, icon: UserCheck, suffix: '%' },
    { label: 'No-Show Rate', value: 0, icon: Activity, suffix: '%' },
    {
      label: 'Pending Results',
      value: pendingResults,
      icon: Clock,
    },
    {
      label: 'Open Disputes',
      value: openDisputes,
      icon: AlertTriangle,
      borderClass: 'border-red-500/30',
    },
    {
      label: 'Completion Rate',
      value: completionRate,
      icon: Star,
      suffix: '%',
      borderClass: 'border-green-500/30',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black text-white">Overview</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary,rgba(255,255,255,0.6))]">
          Server performance at a glance
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <GlassCard
              key={kpi.label}
              hover={false}
              className={[
                'flex flex-col gap-3 p-5 border',
                kpi.borderClass ?? 'border-white/10',
              ].join(' ')}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary,rgba(255,255,255,0.5))]">
                  {kpi.label}
                </span>
                <Icon
                  size={16}
                  className="text-[var(--color-accent,#7c3aed)] opacity-80"
                />
              </div>
              <p className="text-3xl font-black text-white leading-none">
                <AnimatedCounter
                  value={kpi.value}
                  suffix={kpi.suffix}
                  duration={1.5}
                />
              </p>
            </GlassCard>
          )
        })}
      </div>
    </div>
  )
}
