import { Job } from 'bullmq'
import { EmbedBuilder, TextChannel } from 'discord.js'
import { createClient } from '@supabase/supabase-js'
import prisma from '@esports/database'
import { discordClient } from '../discord-client'
import { dmQueue } from '../queues/definitions'

// ---------------------------------------------------------------------------
// Supabase realtime broadcast
// ---------------------------------------------------------------------------
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function broadcastRealtimeEvent(
  guildId: string,
  event: string,
  payload: object,
): Promise<void> {
  await supabase.channel(`server:${guildId}:public`).send({
    type: 'broadcast',
    event,
    payload,
  })
}

// ---------------------------------------------------------------------------
// Embed helpers (mirrors apps/discord-bot/src/utils/embeds.ts)
// ---------------------------------------------------------------------------

const BRAND_COLOR = 0x7c3aed

function discordTs(date: unknown): string {
  if (!date) return '—'
  const d = date instanceof Date ? date : new Date(date as string)
  return `<t:${Math.floor(d.getTime() / 1000)}:F>`
}

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    DRAFT: '📝 Draft',
    REGISTRATION_OPEN: '📋 Registration Open',
    REGISTRATION_CLOSED: '🔒 Registration Closed',
    CHECK_IN: '✅ Check-in',
    LIVE: '🔴 Live',
    COMPLETED: '🏁 Completed',
    CANCELLED: '❌ Cancelled',
    ARCHIVED: '📦 Archived',
  }
  return map[status] ?? status
}

function buildTournamentEmbed(tournament: Record<string, unknown>): EmbedBuilder {
  const name     = String(tournament.name ?? 'Tournament')
  const status   = String(tournament.status ?? '')
  const game     = String(tournament.game ?? '')
  const accepted = Number(tournament.acceptedCount ?? 0)
  const capacity = Number(tournament.teamCapacity ?? 0)

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`🏆 ${name}`)
    .addFields(
      { name: 'Status', value: statusBadge(status),        inline: true },
      { name: 'Game',   value: game.replace(/_/g, ' '),    inline: true },
      { name: 'Teams',  value: `${accepted}/${capacity}`,  inline: true },
      { name: 'Starts', value: discordTs(tournament.startAt), inline: true },
      { name: 'Ends',   value: discordTs(tournament.endAt),   inline: true },
    )
    .setTimestamp()

  if (tournament.bannerUrl) embed.setImage(String(tournament.bannerUrl))
  if (tournament.description) embed.setDescription(String(tournament.description))
  return embed
}

function buildMatchEmbed(match: Record<string, unknown>): EmbedBuilder {
  const num       = Number(match.number ?? 0)
  const status    = String(match.status ?? '')
  const mapName   = String(match.map ?? 'TBD')
  const scheduled = match.scheduledStart

  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`🎮 Match #${num}`)
    .addFields(
      { name: 'Status',    value: statusBadge(status), inline: true  },
      { name: 'Map',       value: mapName,              inline: true  },
      { name: 'Scheduled', value: discordTs(scheduled), inline: false },
    )
    .setTimestamp()
}

function buildRegistrationConfirmEmbed(tournamentName: string, teamName: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle('✅ Registration Approved')
    .setDescription(
      `Your team **${teamName}** has been approved for **${tournamentName}**.\n\nStay tuned for match schedules and check-in announcements.`,
    )
    .setTimestamp()
}

// ---------------------------------------------------------------------------
// Helper — post a message to a Discord channel
// ---------------------------------------------------------------------------
type SendOptions = { content?: string; embeds?: EmbedBuilder[] }

async function postToChannel(channelId: string, options: SendOptions) {
  const channel = await discordClient.channels.fetch(channelId)
  if (!channel || !channel.isTextBased()) {
    throw new Error(`Channel ${channelId} is not a text channel`)
  }
  return (channel as TextChannel).send(options)
}

async function editChannelMessage(channelId: string, messageId: string, options: SendOptions): Promise<void> {
  const channel = await discordClient.channels.fetch(channelId)
  if (!channel || !channel.isTextBased()) return
  const msg = await (channel as TextChannel).messages.fetch(messageId)
  await msg.edit(options)
}

// ---------------------------------------------------------------------------
// Event type handlers
// ---------------------------------------------------------------------------

async function handleTournamentPublished(payload: Record<string, unknown>, guildId: string): Promise<void> {
  const tournamentId = String(payload.tournamentId)
  const [tournament, settings] = await Promise.all([
    prisma.tournament.findUnique({ where: { id: tournamentId } }),
    prisma.serverSettings.findUnique({ where: { guildId } }),
  ])
  if (!tournament || !settings?.announcementChannelId) return

  const embed = buildTournamentEmbed(tournament as Record<string, unknown>)
  
  // Add bracket link if tournament is LIVE
  const WEB_BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://legendary-esports.gg'
  if (tournament.status === 'LIVE') {
    embed.addFields({
      name: '🔗 Bracket',
      value: `[View Bracket](${WEB_BASE}/servers/${guildId}/tournaments/${tournamentId}/bracket)`,
      inline: true,
    })
  }
  
  const msg = await postToChannel(settings.announcementChannelId, { embeds: [embed] })

  await prisma.discordMessageBinding.create({
    data: {
      guildId,
      channelId: settings.announcementChannelId,
      messageId: msg.id,
      recordType: 'TOURNAMENT',
      recordId: tournamentId,
      tournamentId,
    },
  })
}

async function handleTournamentCompleted(payload: Record<string, unknown>, guildId: string): Promise<void> {
  const tournamentId = String(payload.tournamentId)
  const [tournament, winners, settings] = await Promise.all([
    prisma.tournament.findUnique({ where: { id: tournamentId } }),
    prisma.winnerRecord.findMany({
      where: { tournamentId },
      include: { team: true },
      orderBy: { placement: 'asc' },
    }),
    prisma.serverSettings.findUnique({ where: { guildId } }),
  ])
  if (!tournament || !settings?.announcementChannelId) return

  const description = winners.length
    ? winners
        .map(w => {
          const medal = w.placement === 1 ? '🥇' : w.placement === 2 ? '🥈' : w.placement === 3 ? '🥉' : `${w.placement}.`
          return `${medal} **${w.team.name}**`
        })
        .join('\n')
    : 'No winners recorded.'

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`🏆 Tournament Completed — ${tournament.name}`)
    .setDescription(description)
    .setTimestamp()

  const msg = await postToChannel(settings.announcementChannelId, { embeds: [embed] })

  await prisma.discordMessageBinding.create({
    data: {
      guildId,
      channelId: settings.announcementChannelId,
      messageId: msg.id,
      recordType: 'TOURNAMENT',
      recordId: tournamentId,
      tournamentId,
    },
  })

  await broadcastRealtimeEvent(guildId, 'tournament_status_changed', { tournamentId })
}

async function handleTournamentStarted(payload: Record<string, unknown>, guildId: string): Promise<void> {
  const tournamentId = String(payload.tournamentId)
  const [tournament, settings, existingBinding] = await Promise.all([
    prisma.tournament.findUnique({ where: { id: tournamentId } }),
    prisma.serverSettings.findUnique({ where: { guildId } }),
    prisma.discordMessageBinding.findFirst({ where: { guildId, tournamentId, recordType: 'TOURNAMENT' } }),
  ])
  if (!tournament || !settings?.announcementChannelId) return

  const embed = buildTournamentEmbed(tournament as Record<string, unknown>)
  
  // Add bracket link when tournament goes LIVE
  const WEB_BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://legendary-esports.gg'
  embed.addFields({
    name: '🔗 Bracket',
    value: `[View Bracket](${WEB_BASE}/servers/${guildId}/tournaments/${tournamentId}/bracket)`,
    inline: true,
  })

  // Edit original announcement if binding exists
  if (existingBinding) {
    await editChannelMessage(existingBinding.channelId, existingBinding.messageId, { embeds: [embed] }).catch(() => {
      // Edit may fail if message was deleted — continue to post new one
    })
  }

  // Post new announcement
  const msg = await postToChannel(settings.announcementChannelId, {
    content: '🔴 **Tournament is now LIVE!** Check the bracket and match schedules.',
    embeds: [embed],
  })

  // Create or update binding
  if (!existingBinding) {
    await prisma.discordMessageBinding.create({
      data: {
        guildId,
        channelId: settings.announcementChannelId,
        messageId: msg.id,
        recordType: 'TOURNAMENT',
        recordId: tournamentId,
        tournamentId,
      },
    })
  }

  await broadcastRealtimeEvent(guildId, 'tournament_status_changed', { tournamentId })
}

async function handleTournamentCancelled(payload: Record<string, unknown>, guildId: string): Promise<void> {
  const tournamentId = String(payload.tournamentId)
  const [tournament, settings, existingBinding] = await Promise.all([
    prisma.tournament.findUnique({ where: { id: tournamentId } }),
    prisma.serverSettings.findUnique({ where: { guildId } }),
    prisma.discordMessageBinding.findFirst({ where: { guildId, tournamentId, recordType: 'TOURNAMENT' } }),
  ])
  if (!tournament || !settings?.announcementChannelId) return

  const embed = new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle(`❌ Tournament Cancelled — ${tournament.name}`)
    .setDescription('This tournament has been cancelled.')
    .setTimestamp()

  // Edit original announcement if binding exists
  if (existingBinding) {
    await editChannelMessage(existingBinding.channelId, existingBinding.messageId, { embeds: [embed] }).catch(() => {
      // Edit may fail if message was deleted — continue to post new one
    })
  }

  await postToChannel(settings.announcementChannelId, { embeds: [embed] })
}

async function handleMatchScheduled(payload: Record<string, unknown>, guildId: string): Promise<void> {
  const matchId = String(payload.matchId)
  const [match, settings, existingBinding] = await Promise.all([
    prisma.match.findUnique({ where: { id: matchId }, include: { stage: { include: { tournament: true } } } }),
    prisma.serverSettings.findUnique({ where: { guildId } }),
    prisma.discordMessageBinding.findFirst({ where: { guildId, matchId, recordType: 'MATCH' } }),
  ])
  if (!match || !settings?.matchChannelId) return

  const embed = buildMatchEmbed(match as Record<string, unknown>)

  if (existingBinding) {
    await editChannelMessage(existingBinding.channelId, existingBinding.messageId, { embeds: [embed] })
    await prisma.discordMessageBinding.update({
      where: { id: existingBinding.id },
      data: { lastSyncedAt: new Date() },
    })
  } else {
    const msg = await postToChannel(settings.matchChannelId, { embeds: [embed] })
    await prisma.discordMessageBinding.create({
      data: {
        guildId,
        channelId: settings.matchChannelId,
        messageId: msg.id,
        recordType: 'MATCH',
        recordId: matchId,
        matchId,
        tournamentId: match.stage.tournamentId,
      },
    })
  }
}

async function handleMatchRescheduled(payload: Record<string, unknown>, guildId: string): Promise<void> {
  const matchId = String(payload.matchId)
  const [match, settings, existingBinding] = await Promise.all([
    prisma.match.findUnique({ where: { id: matchId }, include: { stage: { include: { tournament: true } } } }),
    prisma.serverSettings.findUnique({ where: { guildId } }),
    prisma.discordMessageBinding.findFirst({ where: { guildId, matchId, recordType: 'MATCH' } }),
  ])
  if (!match || !settings?.matchChannelId) return

  const embed = buildMatchEmbed(match as Record<string, unknown>)

  if (existingBinding) {
    await editChannelMessage(existingBinding.channelId, existingBinding.messageId, { embeds: [embed] })
    await prisma.discordMessageBinding.update({
      where: { id: existingBinding.id },
      data: { lastSyncedAt: new Date() },
    })
  } else {
    const msg = await postToChannel(settings.matchChannelId, { embeds: [embed] })
    await prisma.discordMessageBinding.create({
      data: {
        guildId,
        channelId: settings.matchChannelId,
        messageId: msg.id,
        recordType: 'MATCH',
        recordId: matchId,
        matchId,
        tournamentId: match.stage.tournamentId,
      },
    })
  }

  await broadcastRealtimeEvent(guildId, 'match_status_changed', { matchId })
}

async function handleResultSubmitted(payload: Record<string, unknown>, guildId: string): Promise<void> {
  const matchId = String(payload.matchId)
  const settings = await prisma.serverSettings.findUnique({ where: { guildId } })
  if (!settings?.resultsChannelId) return

  const refereeBinding = await prisma.serverRoleBinding.findFirst({
    where: { guildId, appRole: 'REFEREE' },
  })
  const refMention = refereeBinding ? `<@&${refereeBinding.discordRoleId}>` : '@Referee'

  await postToChannel(settings.resultsChannelId, {
    content: `${refMention} — A result has been submitted for Match \`${matchId}\`. Please review.`,
  })
}

async function handleResultApproved(payload: Record<string, unknown>, guildId: string): Promise<void> {
  const matchId      = String(payload.matchId)
  const tournamentId = String(payload.tournamentId)
  const [match, settings, existingBinding] = await Promise.all([
    prisma.match.findUnique({ where: { id: matchId }, include: { stage: { include: { tournament: true } } } }),
    prisma.serverSettings.findUnique({ where: { guildId } }),
    prisma.discordMessageBinding.findFirst({ where: { guildId, matchId, recordType: 'MATCH' } }),
  ])
  if (!match || !settings?.resultsChannelId) return

  const embed = buildMatchEmbed({ ...match, status: 'COMPLETED' } as Record<string, unknown>)

  if (existingBinding) {
    await editChannelMessage(existingBinding.channelId, existingBinding.messageId, { embeds: [embed] }).catch(() => {})
  }

  await postToChannel(settings.resultsChannelId, {
    content: `✅ Match #${match.number} results have been approved.`,
    embeds: [embed],
  })

  await broadcastRealtimeEvent(guildId, 'standings_updated', { tournamentId })
}

async function handleResultRejected(payload: Record<string, unknown>, _guildId: string): Promise<void> {
  const matchId = String(payload.matchId)
  const reason  = String(payload.reason ?? 'No reason provided.')

  const submission = await prisma.resultSubmission.findFirst({
    where: { matchId },
    orderBy: { createdAt: 'desc' },
  })
  if (!submission) return

  const user = await prisma.user.findUnique({ where: { id: submission.submittedBy } })
  if (!user) return

  await dmQueue.add('send-dm', {
    userId: user.discordId,
    content: `❌ Your result submission for match \`${matchId}\` was rejected.\n**Reason:** ${reason}`,
  })
}

async function handleDisputeOpened(payload: Record<string, unknown>, guildId: string): Promise<void> {
  const disputeId = String(payload.disputeId)
  const matchId   = String(payload.matchId)
  const [settings, dispute] = await Promise.all([
    prisma.serverSettings.findUnique({ where: { guildId } }),
    prisma.dispute.findUnique({ where: { id: disputeId } }),
  ])
  if (!settings?.disputesChannelId || !dispute) return

  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle('⚠️ Dispute Opened')
    .addFields(
      { name: 'Match',  value: `\`${matchId}\``,  inline: true  },
      { name: 'Status', value: dispute.status,     inline: true  },
      { name: 'Reason', value: dispute.reason,     inline: false },
    )
    .setTimestamp()

  await postToChannel(settings.disputesChannelId, { embeds: [embed] })
}

async function handleRegistrationApproved(payload: Record<string, unknown>, _guildId: string): Promise<void> {
  const registrationId = String(payload.registrationId)
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { team: { include: { captain: true } }, tournament: true },
  })
  if (!registration) return

  const embed = buildRegistrationConfirmEmbed(registration.tournament.name, registration.team.name)
  await dmQueue.add('send-dm', {
    userId: registration.team.captain.discordId,
    content: `✅ Your registration for **${registration.tournament.name}** has been approved!`,
    embeds: [embed.toJSON()],
  })
}

async function handleRegistrationRejected(payload: Record<string, unknown>, _guildId: string): Promise<void> {
  const registrationId = String(payload.registrationId)
  const reason = String(payload.reason ?? 'No reason provided.')
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { team: { include: { captain: true } }, tournament: true },
  })
  if (!registration) return

  await dmQueue.add('send-dm', {
    userId: registration.team.captain.discordId,
    content: `❌ Your registration for **${registration.tournament.name}** was rejected.\n**Reason:** ${reason}`,
  })
}

// ---------------------------------------------------------------------------
// Main processor
// ---------------------------------------------------------------------------

export async function processOutboxEvent(job: Job): Promise<void> {
  const { outboxEventId } = job.data as { outboxEventId: string }

  const event = await prisma.outboxEvent.findUnique({ where: { id: outboxEventId } })

  // Idempotency check
  if (!event || event.status === 'DELIVERED') return

  // Mark attempt
  await prisma.outboxEvent.update({
    where: { id: outboxEventId },
    data: { lastAttemptedAt: new Date() },
  })

  const payload = event.payloadJson as Record<string, unknown>

  try {
    switch (event.type) {
      case 'TOURNAMENT_PUBLISHED':
        await handleTournamentPublished(payload, event.guildId)
        break
      case 'TOURNAMENT_STARTED':
        await handleTournamentStarted(payload, event.guildId)
        break
      case 'TOURNAMENT_COMPLETED':
        await handleTournamentCompleted(payload, event.guildId)
        break
      case 'TOURNAMENT_CANCELLED':
        await handleTournamentCancelled(payload, event.guildId)
        break
      case 'MATCH_SCHEDULED':
        await handleMatchScheduled(payload, event.guildId)
        break
      case 'MATCH_RESCHEDULED':
        await handleMatchRescheduled(payload, event.guildId)
        break
      case 'RESULT_SUBMITTED':
        await handleResultSubmitted(payload, event.guildId)
        break
      case 'RESULT_APPROVED':
        await handleResultApproved(payload, event.guildId)
        break
      case 'RESULT_REJECTED':
        await handleResultRejected(payload, event.guildId)
        break
      case 'DISPUTE_OPENED':
        await handleDisputeOpened(payload, event.guildId)
        break
      case 'REGISTRATION_APPROVED':
        await handleRegistrationApproved(payload, event.guildId)
        break
      case 'REGISTRATION_REJECTED':
        await handleRegistrationRejected(payload, event.guildId)
        break
      default:
        // Unknown type — mark delivered to prevent infinite loop
        break
    }

    // Mark DELIVERED
    await prisma.outboxEvent.update({
      where: { id: outboxEventId },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    })
  } catch (err: unknown) {
    const error = err as Record<string, unknown>

    // Discord rate limit — back off, never throw
    if (error?.status === 429 || error?.httpStatus === 429) {
      const retryAfterMs = Number(error?.retryAfter ?? error?.retry_after ?? 5000)
      await job.moveToDelayed(Date.now() + retryAfterMs)
      return
    }

    // Max attempts — mark FAILED and create an admin alert
    if (job.attemptsMade >= 5) {
      const failureReason = error?.message ? String(error.message) : 'Unknown error'
      await prisma.outboxEvent.update({
        where: { id: outboxEventId },
        data: { status: 'FAILED', failureReason },
      })
      await prisma.outboxEvent.create({
        data: {
          guildId: event.guildId,
          type: 'ADMIN_ALERT',
          payloadJson: {
            alertType: 'OUTBOX_FAILURE',
            failedEventId: outboxEventId,
            failedEventType: event.type,
            reason: failureReason,
          },
        },
      })
      return
    }

    // Let BullMQ handle retry with exponential backoff
    throw err
  }
}
