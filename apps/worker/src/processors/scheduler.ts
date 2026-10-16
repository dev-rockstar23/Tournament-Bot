import { Job } from 'bullmq'
import prisma from '@esports/database'
import { dmQueue } from '../queues/definitions'

// ---------------------------------------------------------------------------
// DM reminder helpers
// ---------------------------------------------------------------------------

function toUnixTimestamp(date: Date | null | undefined): number {
  return date ? Math.floor(date.getTime() / 1000) : 0
}

async function enqueueMemberDms(
  tournamentId: string,
  content: string,
): Promise<void> {
  // Get all APPROVED registrations for this tournament with their members
  const registrations = await prisma.registration.findMany({
    where: { tournamentId, status: 'APPROVED' },
    include: {
      members: { include: { registration: { include: { team: true } } } },
      team: true,
    },
  })

  // Collect unique user IDs from registration members
  const memberUserIds = new Set<string>()
  for (const reg of registrations) {
    for (const member of reg.members) {
      memberUserIds.add(member.userId)
    }
  }

  // Fetch discord IDs for each user
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(memberUserIds) } },
    select: { id: true, discordId: true },
  })

  const discordIdMap = new Map(users.map(u => [u.id, u.discordId]))

  for (const userId of memberUserIds) {
    const discordId = discordIdMap.get(userId)
    if (!discordId) continue
    await dmQueue.add('send-dm', { userId: discordId, content })
  }
}

// ---------------------------------------------------------------------------
// Job type handlers
// ---------------------------------------------------------------------------

async function handleDmReminder(
  payload: Record<string, unknown>,
  type: string,
): Promise<void> {
  const matchId = String(payload.matchId)
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      stage: {
        include: {
          tournament: {
            include: { server: { include: { settings: true } } },
          },
        },
      },
    },
  })
  if (!match) return

  const tournament = match.stage.tournament

  // Skip if tournament is cancelled
  if (tournament.status === 'CANCELLED') return

  const unix = toUnixTimestamp(match.scheduledStart)

  let content: string
  if (type === 'DM_REMINDER_24H') {
    content = `⚡ Tournament Reminder — 24 Hours to Go!\n\n**${tournament.name}** is starting in 24 hours.\nMatch time: <t:${unix}:R>`
  } else if (type === 'DM_REMINDER_30MIN') {
    content = `🔥 30 Minutes — Game On Soon!\n\n**${tournament.name}** is starting in 30 minutes. Get ready!`
  } else {
    content = `👑 5 MINUTES — LOCK IN!\n\n**${tournament.name}** starts in 5 minutes. Launch the game NOW!`
  }

  await enqueueMemberDms(tournament.id, content)
}

async function handleResultDeadlineReminder(payload: Record<string, unknown>): Promise<void> {
  const matchId = String(payload.matchId)
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { participants: { include: { team: { include: { captain: true } } } } },
  })
  if (!match) return

  // Skip if already completed
  if (match.status === 'COMPLETED') return

  const matchNumber = match.number
  for (const participant of match.participants) {
    const captain = participant.team.captain
    await dmQueue.add('send-dm', {
      userId: captain.discordId,
      content: `⚠️ Result deadline approaching for Match ${matchNumber}. Submit your result now or contact a referee.`,
    })
  }
}

async function handleCredentialRelease(payload: Record<string, unknown>): Promise<void> {
  const matchId = String(payload.matchId)

  // Fetch room credential — RoomCredential model exists in the schema
  const credential = await prisma.roomCredential.findUnique({ where: { matchId } })
  if (!credential) return

  // Validate releaseAt <= now
  if (credential.releaseAt > new Date()) return

  // Fetch checked-in match participants with their team captains
  const participants = await prisma.matchParticipant.findMany({
    where: { matchId, checkedIn: true },
    include: { team: { include: { captain: true } } },
  })

  // DM each captain with room ID and password — NEVER post to any channel
  for (const participant of participants) {
    const captain = participant.team.captain
    await dmQueue.add('send-dm', {
      userId: captain.discordId,
      content: [
        `🔐 **Room Credentials for Match #${
          (await prisma.match.findUnique({ where: { id: matchId }, select: { number: true } }))?.number ?? matchId
        }**`,
        `Room ID: \`${credential.roomId}\``,
        `Password: \`${credential.password}\``,
        '',
        '_These credentials are private. Do not share them publicly._',
      ].join('\n'),
    })
  }

  // Mark as released
  await prisma.roomCredential.update({
    where: { matchId },
    data: { releasedAt: new Date() },
  })
}

// ---------------------------------------------------------------------------
// Main processor
// ---------------------------------------------------------------------------

export async function processScheduledJob(job: Job): Promise<void> {
  const { scheduledJobKey } = job.data as { scheduledJobKey: string }

  const scheduledJob = await prisma.scheduledJob.findUnique({ where: { jobKey: scheduledJobKey } })

  // Idempotency check
  if (!scheduledJob || scheduledJob.status !== 'PENDING') return

  const payload = scheduledJob.payloadJson as Record<string, unknown>

  switch (scheduledJob.type) {
    case 'DM_REMINDER_24H':
    case 'DM_REMINDER_30MIN':
    case 'DM_REMINDER_5MIN':
      await handleDmReminder(payload, scheduledJob.type)
      break
    case 'RESULT_DEADLINE_REMINDER':
      await handleResultDeadlineReminder(payload)
      break
    case 'CREDENTIAL_RELEASE':
      await handleCredentialRelease(payload)
      break
    default:
      // Unknown type — mark completed to avoid re-running
      break
  }

  // Mark COMPLETED
  await prisma.scheduledJob.update({
    where: { jobKey: scheduledJobKey },
    data: { status: 'COMPLETED', completedAt: new Date() },
  })
}
