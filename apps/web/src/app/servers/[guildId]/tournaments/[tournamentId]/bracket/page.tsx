export const revalidate = 30

import { prisma } from '@esports/database'
import { notFound } from 'next/navigation'
import { BracketPageClient } from './BracketPageClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { guildId: string; tournamentId: string }
}

export default async function BracketPage({ params }: PageProps) {
  // Fetch tournament
  const tournament = await prisma.tournament.findUnique({
    where: {
      id: params.tournamentId,
      guildId: params.guildId,
    },
    select: {
      id: true,
      name: true,
      status: true,
      stages: {
        select: {
          id: true,
          type: true,
          order: true,
        },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!tournament) {
    notFound()
  }

  const totalStages = tournament.stages.length
  // Determine the current/first stage order
  const firstStageOrder = tournament.stages[0]?.order ?? 1
  // Bracket is locked if this is not one of the last 3 stages
  const bracketLocked = firstStageOrder < totalStages - 2

  // Fetch all matches with participants
  const matches = await prisma.match.findMany({
    where: {
      stage: {
        tournamentId: params.tournamentId,
      },
    },
    select: {
      id: true,
      number: true,
      status: true,
      scheduledStart: true,
      stageId: true,
      participants: {
        select: {
          teamId: true,
          team: {
            select: {
              name: true,
            },
          },
        },
      },
      segments: {
        select: {
          scoreJson: true,
        },
      },
    },
    orderBy: [{ number: 'asc' }],
  })

  // Determine tournament format from stage type
  const stageType = tournament.stages[0]?.type ?? 'SINGLE_ELIM'
  let format: 'SINGLE_ELIM' | 'DOUBLE_ELIM' | 'ROUND_ROBIN' = 'SINGLE_ELIM'
  
  if (stageType.includes('DOUBLE')) {
    format = 'DOUBLE_ELIM'
  } else if (stageType.includes('ROBIN')) {
    format = 'ROUND_ROBIN'
  }

  // Calculate round for each match based on match number
  // For single elim: round = ceil(log2(match_number + 1))
  // This is a simplified calculation; real bracket generation would be more complex
  const bracketMatches = matches.map((match) => {
    // Extract scores from segments
    const scores = match.segments.reduce<Record<string, number>>((acc, seg) => {
      if (seg.scoreJson && typeof seg.scoreJson === 'object') {
        return { ...acc, ...(seg.scoreJson as Record<string, number>) }
      }
      return acc
    }, {})

    return {
      id: match.id,
      number: match.number,
      round: Math.ceil(Math.log2(match.number + 1)), // Simplified round calculation
      status: match.status,
      scheduledStart: match.scheduledStart?.toISOString() ?? null,
      participants: match.participants.map((p) => ({
        teamId: p.teamId,
        teamName: p.team.name,
        score: scores[p.teamId] ?? null,
      })),
      nextMatchId: null, // Would need to be calculated from bracket structure
    }
  })

  return (
    <BracketPageClient
      tournamentId={tournament.id}
      tournamentName={tournament.name}
      format={format}
      matches={bracketMatches}
      guildId={params.guildId}
      bracketLocked={bracketLocked}
    />
  )
}
