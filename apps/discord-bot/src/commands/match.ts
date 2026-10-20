import { Command } from '@sapphire/framework'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
  type ChatInputCommandInteraction,
  type TextChannel,
} from 'discord.js'
import prisma from '@esports/database'
import { AppRole, resolveUserRole, roleAtLeast } from '@esports/permissions'
import { assertMatchTransition, InvalidTransitionError } from '@esports/tournament-engine'
import { getDefaultConfig, calculateBgmiMatchScore } from '@esports/game-rules'
import type { MatchScoreParams } from '@esports/game-rules'
import {
  successEmbed,
  errorEmbed,
  notFoundEmbed,
  genericErrorEmbed,
  permissionDeniedEmbed,
  legendaryMatchEmbed,
} from '../utils/responses'
import { ShadowEmbed } from '../utils/embed-builder'
import { discordTs, countdown } from '../utils/time'
import { e } from '../utils/emojis'

// ─── Status helpers ───────────────────────────────────────────────────────────

function matchStatusBadge(status: string): string {
  const map: Record<string, string> = {
    SCHEDULED:        `${e('upcoming')} Scheduled`,
    CHECK_IN:         `${e('checkin')} Check-In`,
    READY:            `${e('completed')} Ready`,
    LIVE:             `${e('live')} Live`,
    AWAITING_RESULT:  `${e('results')} Awaiting Result`,
    UNDER_REVIEW:     `⏳ Under Review`,
    COMPLETED:        `${e('completed')} Completed`,
    POSTPONED:        `⏸️ Postponed`,
    CANCELLED:        `${e('cancelled')} Cancelled`,
    DISPUTED:         `${e('dispute')} Disputed`,
  }
  return map[status] ?? status
}

// ─── Command ──────────────────────────────────────────────────────────────────

export class MatchCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'match',
      description: 'Manage matches for this tournament server.',
      preconditions: ['GuildOnly', 'TournamentManagerOrAdmin'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('match')
        .setDescription('Manage matches for this tournament server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        // ── schedule ────────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('schedule')
            .setDescription('View upcoming match schedule for a tournament.')
            .addStringOption(opt =>
              opt.setName('tournament').setDescription('Tournament ID').setRequired(true),
            ),
        )
        // ── generate ────────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('generate')
            .setDescription('Generate a batch of matches for a tournament stage.')
            .addStringOption(opt =>
              opt.setName('tournament').setDescription('Tournament ID').setRequired(true),
            )
            .addIntegerOption(opt =>
              opt
                .setName('count')
                .setDescription('Number of matches to generate (1–20)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(20),
            )
            .addStringOption(opt =>
              opt
                .setName('start_time')
                .setDescription('Start time for the first match (ISO 8601 or natural format)')
                .setRequired(true),
            )
            .addIntegerOption(opt =>
              opt
                .setName('interval_minutes')
                .setDescription('Minutes between matches (default: 30)')
                .setRequired(false),
            )
            .addStringOption(opt =>
              opt.setName('map').setDescription('Map name (optional)').setRequired(false),
            ),
        )
        // ── reschedule ──────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('reschedule')
            .setDescription('Reschedule a match to a new time.')
            .addStringOption(opt =>
              opt.setName('match').setDescription('Match ID').setRequired(true),
            )
            .addStringOption(opt =>
              opt
                .setName('new_time')
                .setDescription('New scheduled time (ISO 8601)')
                .setRequired(true),
            ),
        )
        // ── checkin ─────────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('checkin')
            .setDescription('Check in for an upcoming match.')
            .addStringOption(opt =>
              opt.setName('match').setDescription('Match ID').setRequired(true),
            ),
        )
        // ── result ──────────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('result')
            .setDescription('Submit match results.')
            .addStringOption(opt =>
              opt.setName('match').setDescription('Match ID').setRequired(true),
            ),
        )
        // ── approve ─────────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('approve')
            .setDescription('Review and approve or reject submitted match results.')
            .addStringOption(opt =>
              opt.setName('match').setDescription('Match ID').setRequired(true),
            ),
        )
        // ── dispute ─────────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('dispute')
            .setDescription('File a dispute for a match result.')
            .addStringOption(opt =>
              opt.setName('match').setDescription('Match ID').setRequired(true),
            )
            .addStringOption(opt =>
              opt.setName('reason').setDescription('Reason for the dispute').setRequired(true),
            )
            .addStringOption(opt =>
              opt.setName('evidence').setDescription('Evidence URL (screenshot)').setRequired(false),
            ),
        )
        // ── resolve ─────────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('resolve')
            .setDescription('Resolve an open dispute for a match.')
            .addStringOption(opt =>
              opt.setName('match').setDescription('Match ID').setRequired(true),
            )
            .addStringOption(opt =>
              opt
                .setName('decision')
                .setDescription('Resolution decision')
                .setRequired(true)
                .addChoices(
                  { name: 'Uphold Claim', value: 'UPHOLD_CLAIM' },
                  { name: 'Reject Claim', value: 'REJECT_CLAIM' },
                  { name: 'Void Match', value: 'VOID_MATCH' },
                ),
            )
            .addStringOption(opt =>
              opt
                .setName('correction')
                .setDescription('Correction JSON (array of {teamId,placement,kills}) for UPHOLD_CLAIM')
                .setRequired(false),
            )
            .addStringOption(opt =>
              opt.setName('notes').setDescription('Resolution notes').setRequired(false),
            ),
        )
        // ── room group ──────────────────────────────────────────────────────
        .addSubcommandGroup(group =>
          group
            .setName('room')
            .setDescription('Manage room credentials for a match.')
            .addSubcommand(sub =>
              sub
                .setName('get')
                .setDescription('Get room credentials for your match (ephemeral, captains only).')
                .addStringOption(opt =>
                  opt.setName('match').setDescription('Match ID').setRequired(true),
                ),
            )
            .addSubcommand(sub =>
              sub
                .setName('set')
                .setDescription('Set room credentials for a match.')
                .addStringOption(opt =>
                  opt.setName('match').setDescription('Match ID').setRequired(true),
                )
                .addStringOption(opt =>
                  opt.setName('room_id').setDescription('Room ID').setRequired(true),
                )
                .addStringOption(opt =>
                  opt.setName('password').setDescription('Room password').setRequired(true),
                )
                .addStringOption(opt =>
                  opt
                    .setName('release_at')
                    .setDescription('When credentials become available (ISO 8601, defaults to match start)')
                    .setRequired(false),
                ),
            )
            .addSubcommand(sub =>
              sub
                .setName('release')
                .setDescription('Release room credentials publicly to the match channel.')
                .addStringOption(opt =>
                  opt.setName('match').setDescription('Match ID').setRequired(true),
                ),
            ),
        ),
    )
  }

  // ─── Dispatch ────────────────────────────────────────────────────────────────

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const group = interaction.options.getSubcommandGroup(false)

    if (group === 'room') {
      const sub = interaction.options.getSubcommand()
      switch (sub) {
        case 'get':     return this.handleRoomGet(interaction)
        case 'set':     return this.handleRoomSet(interaction)
        case 'release': return this.handleRoomRelease(interaction)
        default:
          return interaction.reply({ embeds: [errorEmbed(`Unknown room subcommand: ${sub}`)], ephemeral: true })
      }
    }

    switch (interaction.options.getSubcommand()) {
      case 'schedule':   return this.handleSchedule(interaction)
      case 'generate':   return this.handleGenerate(interaction)
      case 'reschedule': return this.handleReschedule(interaction)
      case 'checkin':    return this.handleCheckin(interaction)
      case 'result':     return this.handleResult(interaction)
      case 'approve':    return this.handleApprove(interaction)
      case 'dispute':    return this.handleDispute(interaction)
      case 'resolve':    return this.handleResolve(interaction)
      default:
        return interaction.reply({
          embeds: [errorEmbed('Unknown subcommand.')],
          ephemeral: true,
        })
    }
  }

  // ─── handleSchedule ──────────────────────────────────────────────────────────

  private async handleSchedule(interaction: ChatInputCommandInteraction): Promise<unknown> {
    await interaction.deferReply({ ephemeral: false })

    const tournamentId = interaction.options.getString('tournament', true)
    const guildId = interaction.guildId!

    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id: tournamentId, guildId },
        select: { id: true, name: true },
      })

      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      const matches = await prisma.match.findMany({
        where: {
          guildId,
          stage: { tournamentId, tournament: { guildId } },
          scheduledStart: { gte: new Date() },
        },
        orderBy: { scheduledStart: 'asc' },
        take: 10,
        include: { stage: { select: { name: true } } },
      })

      const rowCount = matches.length

      const rows = matches.map(m => {
        const badge = matchStatusBadge(m.status)
        const mapLabel = m.map ?? 'TBD'
        const ts = discordTs(m.scheduledStart, 'F')
        const rel = discordTs(m.scheduledStart, 'R')
        return `${badge} **M${String(m.number).padStart(2, '0')}** — ${mapLabel}\n${ts} (${rel})`
      })

      const embed = new ShadowEmbed()
        .setKind('info')
        .setTitle(e('calendar'), 'MATCH SCHEDULE', tournament.name)
        .setDescription(
          rowCount > 0
            ? [
                `**${rowCount} Match${rowCount !== 1 ? 'es' : ''}** • Map rotation`,
                '',
                rows.join('\n\n'),
              ].join('\n')
            : 'No upcoming matches scheduled.',
        )
        .setFooter()
        .setTimestamp()
        .build()

      // Add next-match countdown
      if (matches[0]) {
        const next = matches[0]
        embed.addFields({
          name: `${e('lightning')} Next Match`,
          value: `M${String(next.number).padStart(2, '0')} — ${discordTs(next.scheduledStart, 'R')}`,
          inline: false,
        })
      }

      return interaction.editReply({ embeds: [embed] })
    } catch (err) {
      this.container.logger.error(`match schedule error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ─── handleGenerate ──────────────────────────────────────────────────────────

  private async handleGenerate(interaction: ChatInputCommandInteraction): Promise<unknown> {
    await interaction.deferReply({ ephemeral: true })

    const guildId = interaction.guildId!
    const userId  = interaction.user.id

    // Permission check
    try {
      const userRole = await resolveUserRole({
        prisma,
        userId,
        guildId,
        botToken: process.env['DISCORD_BOT_TOKEN']!,
      })
      if (!roleAtLeast(userRole, AppRole.TOURNAMENT_MANAGER)) {
        return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
      }
    } catch {
      return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
    }

    const tournamentId    = interaction.options.getString('tournament', true)
    const count           = interaction.options.getInteger('count', true)
    const startTimeRaw    = interaction.options.getString('start_time', true)
    const intervalMinutes = interaction.options.getInteger('interval_minutes') ?? 30
    const mapName         = interaction.options.getString('map') ?? undefined

    const startTime = new Date(startTimeRaw)
    if (isNaN(startTime.getTime())) {
      return interaction.editReply({ embeds: [errorEmbed(`Invalid start_time: \`${startTimeRaw}\``)] })
    }

    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id: tournamentId, guildId },
        select: { id: true, name: true, mode: true },
      })

      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      // Find or create a stage
      let stage = await prisma.stage.findFirst({
        where: { tournamentId },
        orderBy: { order: 'asc' },
        select: { id: true, order: true },
      })

      if (!stage) {
        stage = await prisma.stage.create({
          data: {
            tournamentId,
            name: 'Group Stage',
            type: 'group_stage',
            order: 1,
          },
          select: { id: true, order: true },
        })
      }

      // Determine the current max match number for this stage
      const maxEntry = await prisma.match.findFirst({
        where: { stageId: stage.id },
        orderBy: { number: 'desc' },
        select: { number: true },
      })
      const baseNumber = (maxEntry?.number ?? 0) + 1

      const intervalMs = intervalMinutes * 60 * 1000
      const generatedMatches: Array<{ number: number; scheduledStart: Date }> = []

      for (let i = 0; i < count; i++) {
        const scheduledStart = new Date(startTime.getTime() + i * intervalMs)
        const scheduledEnd   = new Date(startTime.getTime() + (i + 1) * intervalMs)
        const matchNumber    = baseNumber + i

        const match = await prisma.match.create({
          data: {
            stageId:       stage.id,
            guildId,
            number:        matchNumber,
            scheduledStart,
            scheduledEnd,
            map:           mapName ?? null,
            mode:          tournament.mode ?? null,
          },
          select: { id: true, number: true, scheduledStart: true },
        })

        // Placeholder room credential
        await prisma.roomCredential.create({
          data: {
            matchId:   match.id,
            roomId:    '',
            password:  '',
            releaseAt: scheduledStart,
            expiresAt: scheduledEnd,
            createdBy: userId,
          },
        })

        // DM reminder jobs
        const dmJobs = [
          { type: 'DM_REMINDER_24H',  scheduledFor: new Date(scheduledStart.getTime() - 24 * 60 * 60 * 1000) },
          { type: 'DM_REMINDER_30MIN', scheduledFor: new Date(scheduledStart.getTime() - 30 * 60 * 1000) },
          { type: 'DM_REMINDER_5MIN',  scheduledFor: new Date(scheduledStart.getTime() - 5 * 60 * 1000) },
        ]

        for (const job of dmJobs) {
          await prisma.scheduledJob.create({
            data: {
              jobKey:      `${job.type}:${match.id}:${Date.now()}`,
              type:        job.type,
              payloadJson: { matchId: match.id },
              scheduledFor: job.scheduledFor,
              matchId:     match.id,
              tournamentId,
            },
          })
        }

        generatedMatches.push({ number: matchNumber, scheduledStart })
      }

      const lines = generatedMatches.map(
        m => `• M${String(m.number).padStart(2, '0')} — ${discordTs(m.scheduledStart, 'F')}`,
      )

      const embed = new ShadowEmbed()
        .setKind('success')
        .setTitle(e('matchIcon'), 'MATCHES GENERATED', tournament.name)
        .setDescription(
          [
            `✅ Created **${count}** match${count !== 1 ? 'es' : ''} with ${intervalMinutes}-min intervals.`,
            '',
            lines.join('\n'),
          ].join('\n'),
        )
        .setFooter()
        .setTimestamp()
        .build()

      return interaction.editReply({ embeds: [embed] })
    } catch (err) {
      this.container.logger.error(`match generate error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ─── handleReschedule ────────────────────────────────────────────────────────

  private async handleReschedule(interaction: ChatInputCommandInteraction): Promise<unknown> {
    await interaction.deferReply({ ephemeral: true })

    const guildId = interaction.guildId!
    const userId  = interaction.user.id

    try {
      const userRole = await resolveUserRole({
        prisma,
        userId,
        guildId,
        botToken: process.env['DISCORD_BOT_TOKEN']!,
      })
      if (!roleAtLeast(userRole, AppRole.REFEREE)) {
        return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
      }
    } catch {
      return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
    }

    const matchId    = interaction.options.getString('match', true)
    const newTimeRaw = interaction.options.getString('new_time', true)

    const newTime = new Date(newTimeRaw)
    if (isNaN(newTime.getTime())) {
      return interaction.editReply({ embeds: [errorEmbed(`Invalid new_time: \`${newTimeRaw}\``)] })
    }

    try {
      const match = await prisma.match.findFirst({
        where: { id: matchId, guildId },
        select: {
          id: true,
          number: true,
          status: true,
          scheduledStart: true,
          scheduledEnd:   true,
          stage: { select: { tournamentId: true } },
        },
      })

      if (!match) {
        return interaction.editReply({ embeds: [notFoundEmbed('match')] })
      }

      const reschedulable = ['SCHEDULED', 'CHECK_IN', 'POSTPONED']
      if (!reschedulable.includes(match.status)) {
        return interaction.editReply({
          embeds: [errorEmbed(`Cannot reschedule a match with status **${match.status}**.`)],
        })
      }

      const duration = match.scheduledEnd.getTime() - match.scheduledStart.getTime()
      const newEnd   = new Date(newTime.getTime() + duration)

      await prisma.$transaction(async tx => {
        await tx.match.update({
          where: { id: matchId },
          data: { scheduledStart: newTime, scheduledEnd: newEnd },
        })

        // Cancel existing PENDING jobs
        await tx.scheduledJob.updateMany({
          where: { matchId, status: 'PENDING' },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        })

        // Recreate DM reminder jobs
        const dmJobs = [
          { type: 'DM_REMINDER_24H',   scheduledFor: new Date(newTime.getTime() - 24 * 60 * 60 * 1000) },
          { type: 'DM_REMINDER_30MIN', scheduledFor: new Date(newTime.getTime() - 30 * 60 * 1000) },
          { type: 'DM_REMINDER_5MIN',  scheduledFor: new Date(newTime.getTime() - 5 * 60 * 1000) },
        ]

        for (const job of dmJobs) {
          await tx.scheduledJob.create({
            data: {
              jobKey:       `${job.type}:${matchId}:${Date.now()}`,
              type:         job.type,
              payloadJson:  { matchId },
              scheduledFor: job.scheduledFor,
              matchId,
              tournamentId: match.stage.tournamentId,
            },
          })
        }

        await tx.outboxEvent.create({
          data: {
            guildId,
            type:        'MATCH_RESCHEDULED',
            payloadJson: { matchId, newTime: newTime.toISOString() },
            status:      'PENDING',
          },
        })

        await tx.auditLog.create({
          data: {
            guildId,
            actorId:    userId,
            action:     'MATCH_RESCHEDULED',
            targetType: 'Match',
            targetId:   matchId,
            metadata:   { oldStart: match.scheduledStart.toISOString(), newStart: newTime.toISOString() },
          },
        })
      })

      const embed = new ShadowEmbed()
        .setKind('success')
        .setTitle(e('calendar'), 'MATCH RESCHEDULED', `M${String(match.number).padStart(2, '0')}`)
        .setDescription(`Match #${match.number} has been rescheduled to ${discordTs(newTime, 'F')} (${countdown(newTime)}).`)
        .setFooter()
        .setTimestamp()
        .build()

      return interaction.editReply({ embeds: [embed] })
    } catch (err) {
      this.container.logger.error(`match reschedule error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ─── handleCheckin ───────────────────────────────────────────────────────────

  private async handleCheckin(interaction: ChatInputCommandInteraction): Promise<unknown> {
    await interaction.deferReply({ ephemeral: true })

    const matchId = interaction.options.getString('match', true)
    const guildId = interaction.guildId!
    const userId  = interaction.user.id

    try {
      const match = await prisma.match.findFirst({
        where: { id: matchId, guildId },
        select: { id: true, status: true, number: true },
      })

      if (!match) {
        return interaction.editReply({ embeds: [errorEmbed(`Match \`${matchId}\` not found in this server.`)] })
      }

      if (match.status !== 'CHECK_IN' && match.status !== 'READY') {
        return interaction.editReply({
          embeds: [errorEmbed(`Check-in is not open for this match (status: **${match.status}**).`)],
        })
      }

      const dbUser = await prisma.user.findFirst({
        where: { discordId: userId },
        select: { id: true },
      })

      if (!dbUser) {
        return interaction.editReply({
          embeds: [errorEmbed('Your user profile was not found. Please complete registration first.')],
        })
      }

      const participant = await prisma.matchParticipant.findFirst({
        where: { matchId, team: { captainId: dbUser.id, guildId } },
        select: { id: true, checkedIn: true },
      })

      if (!participant) {
        return interaction.editReply({
          embeds: [errorEmbed('You are not the captain of any team participating in this match.')],
        })
      }

      if (participant.checkedIn) {
        return interaction.editReply({
          embeds: [errorEmbed('Your team has already checked in for this match.')],
        })
      }

      await prisma.matchParticipant.update({
        where: { id: participant.id },
        data: { checkedIn: true, checkedInAt: new Date() },
      })

      return interaction.editReply({
        embeds: [successEmbed('Checked In!', `${e('checkin')} Your team is confirmed for Match #${match.number}.`)],
      })
    } catch (err) {
      this.container.logger.error(`match checkin error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ─── handleResult ────────────────────────────────────────────────────────────

  private async handleResult(interaction: ChatInputCommandInteraction): Promise<unknown> {
    const matchId = interaction.options.getString('match', true)
    const guildId = interaction.guildId!
    const userId  = interaction.user.id

    // Pre-validate before showing modal (no defer — we show a modal)
    try {
      const match = await prisma.match.findFirst({
        where: { id: matchId, guildId },
        select: {
          id: true, status: true, number: true,
          participants: {
            select: { teamId: true, team: { select: { captainId: true } } },
          },
        },
      })

      if (!match) {
        return interaction.reply({
          embeds: [errorEmbed(`Match \`${matchId}\` not found in this server.`)],
          ephemeral: true,
        })
      }

      if (match.status !== 'AWAITING_RESULT' && match.status !== 'LIVE') {
        return interaction.reply({
          embeds: [errorEmbed(`Results cannot be submitted for a match with status: **${match.status}**.`)],
          ephemeral: true,
        })
      }

      const dbUser = await prisma.user.findFirst({
        where: { discordId: userId },
        select: { id: true },
      })

      const isCaptain = dbUser
        ? match.participants.some(p => p.team.captainId === dbUser.id)
        : false

      if (!isCaptain) {
        return interaction.reply({
          embeds: [errorEmbed('You must be the captain of a team in this match to submit results.')],
          ephemeral: true,
        })
      }

      const participantCount = Math.min(match.participants.length, 4)

      const modal = new ModalBuilder()
        .setCustomId(`result_modal:${matchId}`)
        .setTitle(`Match #${match.number} — Submit Results`)

      const placementInput = new TextInputBuilder()
        .setCustomId('result_scorecard')
        .setLabel('Scorecard (teamId,placement,kills per line)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setPlaceholder('Format: teamId,placement,kills\nExample:\ncm1abc,1,8\ncm2def,2,5')
        .setValue(
          match.participants
            .slice(0, participantCount)
            .map((p, i) => `${p.teamId},${i + 1},0`)
            .join('\n'),
        )

      const evidenceInput = new TextInputBuilder()
        .setCustomId('result_evidence')
        .setLabel('Evidence URL (screenshot — optional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('https://...')

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(placementInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(evidenceInput),
      )

      await interaction.showModal(modal)

      // Await modal submission
      try {
        const modalSubmit = await interaction.awaitModalSubmit({
          filter: i => i.customId === `result_modal:${matchId}` && i.user.id === userId,
          time: 300_000,
        })

        await modalSubmit.deferReply({ ephemeral: true })

        const rawScorecard = modalSubmit.fields.getTextInputValue('result_scorecard')
        const evidenceUrl  = modalSubmit.fields.getTextInputValue('result_evidence').trim() || undefined

        const lines = rawScorecard
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean)

        const scorecardJson: Array<{ teamId: string; placement: number; kills: number; penalties: number }> = []

        for (const line of lines) {
          const parts = line.split(',').map(p => p.trim())
          if (parts.length < 3) continue
          const placement = parseInt(parts[1]!, 10)
          const kills     = parseInt(parts[2]!, 10)
          if (!parts[0] || isNaN(placement) || isNaN(kills)) continue
          scorecardJson.push({ teamId: parts[0], placement, kills, penalties: 0 })
        }

        if (scorecardJson.length === 0) {
          return modalSubmit.editReply({
            embeds: [errorEmbed('Could not parse the scorecard. Check the format and try again.')],
          })
        }

        const participantIds = new Set(match.participants.map(p => p.teamId))
        const invalid = scorecardJson.filter(sc => !participantIds.has(sc.teamId))
        if (invalid.length > 0) {
          return modalSubmit.editReply({
            embeds: [errorEmbed(`Unknown team IDs: ${invalid.map(sc => sc.teamId).join(', ')}`)],
          })
        }

        await prisma.$transaction(async tx => {
          await tx.resultSubmission.create({
            data: {
              matchId,
              submittedBy: dbUser!.id,
              scorecardJson,
              evidenceUrl:  evidenceUrl ?? null,
              status:       'PENDING_REVIEW',
            },
          })

          await tx.match.update({
            where: { id: matchId },
            data: { status: 'UNDER_REVIEW' },
          })

          await tx.outboxEvent.create({
            data: {
              guildId,
              type:        'RESULT_SUBMITTED',
              payloadJson: { matchId, submittedBy: dbUser!.id },
              status:      'PENDING',
            },
          })

          await tx.auditLog.create({
            data: {
              guildId,
              actorId:    dbUser!.id,
              action:     'RESULT_SUBMITTED',
              targetType: 'Match',
              targetId:   matchId,
              metadata:   { teamsCount: scorecardJson.length },
            },
          })
        })

        return modalSubmit.editReply({
          embeds: [
            successEmbed(
              'Results Submitted',
              `${e('results')} Your scorecard for Match #${match.number} has been submitted for review. A referee will approve it shortly.`,
            ),
          ],
        })
      } catch {
        // Modal timed out — no-op
      }
    } catch (err) {
      this.container.logger.error(`match result error: ${err}`)
      // Already responded via modal flow; only catch unexpected pre-modal errors
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({ embeds: [genericErrorEmbed()], ephemeral: true })
      }
    }
  }

  // ─── handleApprove ───────────────────────────────────────────────────────────

  private async handleApprove(interaction: ChatInputCommandInteraction): Promise<unknown> {
    await interaction.deferReply({ ephemeral: true })

    const matchId = interaction.options.getString('match', true)
    const guildId = interaction.guildId!
    const userId  = interaction.user.id

    try {
      const userRole = await resolveUserRole({
        prisma,
        userId,
        guildId,
        botToken: process.env['DISCORD_BOT_TOKEN']!,
      })
      if (!roleAtLeast(userRole, AppRole.REFEREE)) {
        return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
      }
    } catch {
      return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
    }

    try {
      const match = await prisma.match.findFirst({
        where: { id: matchId, guildId },
        select: {
          id: true, status: true, number: true,
          stage: {
            select: {
              tournamentId: true,
              tournament: {
                select: {
                  game: true, mode: true,
                  ruleVersions: {
                    where: { isActive: true },
                    take: 1,
                    orderBy: { version: 'desc' },
                    select: { rulesJson: true },
                  },
                },
              },
            },
          },
        },
      })

      if (!match) {
        return interaction.editReply({ embeds: [errorEmbed(`Match \`${matchId}\` not found in this server.`)] })
      }

      if (match.status !== 'UNDER_REVIEW') {
        return interaction.editReply({
          embeds: [errorEmbed(`This match is not currently under review (status: **${match.status}**).`)],
        })
      }

      const submission = await prisma.resultSubmission.findFirst({
        where: { matchId, status: 'PENDING_REVIEW' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, scorecardJson: true, evidenceUrl: true, createdAt: true },
      })

      if (!submission) {
        return interaction.editReply({
          embeds: [errorEmbed('No pending result submission found for this match.')],
        })
      }

      const scorecard = submission.scorecardJson as Array<{
        teamId: string; placement: number; kills: number; penalties: number
      }>

      const embed = new ShadowEmbed()
        .setKind('info')
        .setTitle(e('results'), 'RESULT REVIEW', `Match #${match.number}`)
        .setDescription(
          [
            `**Submission ID:** \`${submission.id}\``,
            `**Submitted:** ${discordTs(submission.createdAt, 'F')}`,
            submission.evidenceUrl ? `**Evidence:** [View Screenshot](${submission.evidenceUrl})` : '',
          ].filter(Boolean).join('\n'),
        )
        .setFooter()
        .setTimestamp()
        .build()

      const scorecardLines = scorecard.map(
        sc => `**#${sc.placement}** Team \`${sc.teamId}\` — ${sc.kills} kills${sc.penalties ? ` (−${sc.penalties} pts penalty)` : ''}`,
      )
      embed.addFields({ name: 'Scorecard', value: scorecardLines.join('\n') || 'Empty', inline: false })

      const approveBtn = new ButtonBuilder()
        .setCustomId(`mapprove:approve:${submission.id}`)
        .setLabel('✅ Approve')
        .setStyle(ButtonStyle.Success)

      const rejectBtn = new ButtonBuilder()
        .setCustomId(`mapprove:reject:${submission.id}`)
        .setLabel('❌ Reject')
        .setStyle(ButtonStyle.Danger)

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(approveBtn, rejectBtn)
      const msg = await interaction.editReply({ embeds: [embed], components: [row] })

      const btnInteraction = await msg
        .awaitMessageComponent({
          componentType: ComponentType.Button,
          filter: i =>
            (i.customId.startsWith('mapprove:approve:') || i.customId.startsWith('mapprove:reject:')) &&
            i.user.id === userId,
          time: 120_000,
        })
        .catch(() => null)

      if (!btnInteraction) {
        await interaction.editReply({
          embeds: [embed],
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              approveBtn.setDisabled(true),
              rejectBtn.setDisabled(true),
            ),
          ],
        })
        return
      }

      const action = btnInteraction.customId.startsWith('mapprove:approve:') ? 'approve' : 'reject'

      if (action === 'approve') {
        await btnInteraction.deferUpdate()

        const tournament = match.stage.tournament
        let config = getDefaultConfig(
          tournament.game as Parameters<typeof getDefaultConfig>[0],
          tournament.mode as Parameters<typeof getDefaultConfig>[1],
        )

        const ruleVersion = tournament.ruleVersions[0]
        if (ruleVersion?.rulesJson) {
          try {
            const rj = ruleVersion.rulesJson as Record<string, unknown>
            if (typeof rj['killPoints'] === 'number' && Array.isArray(rj['placementPoints'])) {
              config = {
                ...config,
                killPoints:       rj['killPoints'] as number,
                placementPoints:  rj['placementPoints'] as number[],
                ...(typeof rj['maxKillPoints'] === 'number' ? { maxKillPoints: rj['maxKillPoints'] as number } : {}),
              }
            }
          } catch { /* use defaults */ }
        }

        const scoreParams: MatchScoreParams = {
          config,
          placements: scorecard.map(sc => ({
            teamId:    sc.teamId,
            placement: sc.placement,
            kills:     sc.kills,
            penalties: sc.penalties,
          })),
          matchId: match.id,
        }
        const approvedScores = calculateBgmiMatchScore(scoreParams)

        await prisma.$transaction(async tx => {
          await tx.scoreEvent.createMany({
            data: approvedScores.map(score => {
              const entry = scorecard.find(sc => sc.teamId === score.teamId)!
              return {
                matchId:   match.id,
                teamId:    score.teamId,
                type:      'MATCH_SCORE' as const,
                points:    score.points,
                kills:     score.kills,
                placement: score.placement,
                penalties: Number(entry.penalties ?? 0),
                status:    'active',
                createdBy: userId,
              }
            }),
          })

          await tx.resultSubmission.update({
            where: { id: submission.id },
            data: { status: 'APPROVED', reviewedBy: userId, reviewedAt: new Date() },
          })

          assertMatchTransition(match.status, 'COMPLETED')
          await tx.match.update({
            where: { id: match.id },
            data: { status: 'COMPLETED', completedAt: new Date() },
          })

          await tx.outboxEvent.create({
            data: {
              guildId,
              type:        'RESULT_APPROVED',
              payloadJson: { matchId: match.id, scores: approvedScores.map(s => ({ teamId: s.teamId, points: s.points })) },
              status:      'PENDING',
            },
          })

          await tx.auditLog.create({
            data: {
              guildId,
              actorId:    userId,
              action:     'RESULT_APPROVED',
              targetType: 'Match',
              targetId:   match.id,
              metadata:   { submissionId: submission.id, scoresCount: approvedScores.length },
            },
          })
        })

        await interaction.editReply({
          embeds: [successEmbed('Result Approved', `✅ Match #${match.number} has been completed and scores recorded.`)],
          components: [],
        })
      } else {
        // Show rejection reason modal
        const rejectModal = new ModalBuilder()
          .setCustomId(`mapprove_reject:${submission.id}`)
          .setTitle('Reject Result')

        const reasonInput = new TextInputBuilder()
          .setCustomId('reject_reason')
          .setLabel('Reason for rejection')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(500)
          .setPlaceholder('e.g. Screenshot does not match reported kills')

        rejectModal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput))

        await btnInteraction.showModal(rejectModal)

        try {
          const modalSubmit = await btnInteraction.awaitModalSubmit({
            filter: i => i.customId === `mapprove_reject:${submission.id}` && i.user.id === userId,
            time: 120_000,
          })
          const reason = modalSubmit.fields.getTextInputValue('reject_reason').trim()
          await modalSubmit.deferUpdate()

          await prisma.$transaction(async tx => {
            await tx.resultSubmission.update({
              where: { id: submission.id },
              data: {
                status:          'REJECTED',
                reviewedBy:      userId,
                reviewedAt:      new Date(),
                rejectionReason: reason,
              },
            })

            await tx.match.update({ where: { id: matchId }, data: { status: 'AWAITING_RESULT' } })

            await tx.outboxEvent.create({
              data: {
                guildId,
                type:        'RESULT_REJECTED',
                payloadJson: { matchId, reason },
                status:      'PENDING',
              },
            })

            await tx.auditLog.create({
              data: {
                guildId,
                actorId:    userId,
                action:     'RESULT_REJECTED',
                targetType: 'Match',
                targetId:   matchId,
                reason,
                metadata:   { submissionId: submission.id },
              },
            })
          })

          await interaction.editReply({
            embeds: [successEmbed('Result Rejected', '❌ The submission has been rejected. The team must resubmit.')],
            components: [],
          })
        } catch {
          // Modal timed out — no-op
        }
      }
    } catch (err) {
      this.container.logger.error(`match approve error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()], components: [] })
    }
  }

  // ─── handleDispute ───────────────────────────────────────────────────────────

  private async handleDispute(interaction: ChatInputCommandInteraction): Promise<unknown> {
    await interaction.deferReply({ ephemeral: true })

    const matchId    = interaction.options.getString('match', true)
    const reason     = interaction.options.getString('reason', true)
    const evidenceUrl = interaction.options.getString('evidence') ?? undefined
    const guildId    = interaction.guildId!
    const userId     = interaction.user.id

    try {
      const match = await prisma.match.findFirst({
        where: { id: matchId, guildId },
        select: { id: true, status: true, number: true },
      })

      if (!match) {
        return interaction.editReply({ embeds: [notFoundEmbed('match')] })
      }

      const dbUser = await prisma.user.findFirst({
        where: { discordId: userId },
        select: { id: true },
      })

      if (!dbUser) {
        return interaction.editReply({
          embeds: [errorEmbed('Your user profile was not found. Please complete registration first.')],
        })
      }

      await prisma.$transaction(async tx => {
        await tx.dispute.create({
          data: {
            matchId,
            raisedBy:    dbUser.id,
            reason,
            evidenceUrl: evidenceUrl ?? null,
            status:      'OPEN',
          },
        })

        await tx.match.update({
          where: { id: matchId },
          data: { status: 'DISPUTED' },
        })

        await tx.outboxEvent.create({
          data: {
            guildId,
            type:        'DISPUTE_OPENED',
            payloadJson: { matchId, raisedBy: dbUser.id, reason },
            status:      'PENDING',
          },
        })

        await tx.auditLog.create({
          data: {
            guildId,
            actorId:    dbUser.id,
            action:     'DISPUTE_OPENED',
            targetType: 'Match',
            targetId:   matchId,
            metadata:   { reason },
          },
        })
      })

      const embed = new ShadowEmbed()
        .setKind('warning')
        .setTitle(e('dispute'), 'DISPUTE FILED', `Match #${match.number}`)
        .setDescription(
          [
            `Your dispute for Match #${match.number} has been filed.`,
            `**Reason:** ${reason}`,
            evidenceUrl ? `**Evidence:** [View](${evidenceUrl})` : '',
            '',
            'A referee will review your dispute shortly.',
          ].filter(Boolean).join('\n'),
        )
        .setFooter()
        .setTimestamp()
        .build()

      return interaction.editReply({ embeds: [embed] })
    } catch (err) {
      this.container.logger.error(`match dispute error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ─── handleResolve ───────────────────────────────────────────────────────────

  private async handleResolve(interaction: ChatInputCommandInteraction): Promise<unknown> {
    await interaction.deferReply({ ephemeral: true })

    const guildId = interaction.guildId!
    const userId  = interaction.user.id

    try {
      const userRole = await resolveUserRole({
        prisma,
        userId,
        guildId,
        botToken: process.env['DISCORD_BOT_TOKEN']!,
      })
      if (!roleAtLeast(userRole, AppRole.REFEREE)) {
        return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
      }
    } catch {
      return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
    }

    const matchId    = interaction.options.getString('match', true)
    const decision   = interaction.options.getString('decision', true) as 'UPHOLD_CLAIM' | 'REJECT_CLAIM' | 'VOID_MATCH'
    const correction = interaction.options.getString('correction') ?? undefined
    const notes      = interaction.options.getString('notes') ?? undefined

    try {
      const match = await prisma.match.findFirst({
        where: { id: matchId, guildId },
        select: {
          id: true, status: true, number: true,
          participants: { select: { teamId: true } },
        },
      })

      if (!match) {
        return interaction.editReply({ embeds: [notFoundEmbed('match')] })
      }

      const dispute = await prisma.dispute.findFirst({
        where: { matchId, status: 'OPEN' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, raisedBy: true },
      })

      if (!dispute) {
        return interaction.editReply({
          embeds: [errorEmbed('No open dispute found for this match.')],
        })
      }

      await prisma.$transaction(async tx => {
        const now = new Date()

        if (decision === 'UPHOLD_CLAIM') {
          // Apply correction ScoreEvents if provided
          if (correction) {
            let correctionEntries: Array<{ teamId: string; placement: number; kills: number }> = []
            try {
              correctionEntries = JSON.parse(correction) as typeof correctionEntries
            } catch {
              // ignore malformed correction JSON
            }

            if (correctionEntries.length > 0) {
              await tx.scoreEvent.createMany({
                data: correctionEntries.map(ce => ({
                  matchId:   matchId,
                  teamId:    ce.teamId,
                  type:      'CORRECTION' as const,
                  points:    0,
                  kills:     ce.kills,
                  placement: ce.placement,
                  penalties: 0,
                  status:    'active',
                  createdBy: userId,
                })),
              })
            }
          }

          await tx.dispute.update({
            where: { id: dispute.id },
            data: {
              status:     'RESOLVED',
              resolution: notes ?? 'Claim upheld.',
              resolvedBy: userId,
              resolvedAt: now,
            },
          })

          assertMatchTransition(match.status, 'COMPLETED')
          await tx.match.update({
            where: { id: matchId },
            data: { status: 'COMPLETED', completedAt: now },
          })
        } else if (decision === 'REJECT_CLAIM') {
          await tx.dispute.update({
            where: { id: dispute.id },
            data: {
              status:     'DISMISSED',
              resolution: notes ?? 'Claim rejected.',
              resolvedBy: userId,
              resolvedAt: now,
            },
          })

          await tx.match.update({
            where: { id: matchId },
            data: { status: 'UNDER_REVIEW' },
          })
        } else {
          // VOID_MATCH
          await tx.dispute.update({
            where: { id: dispute.id },
            data: {
              status:     'RESOLVED',
              resolution: notes ?? 'Match voided.',
              resolvedBy: userId,
              resolvedAt: now,
            },
          })

          assertMatchTransition(match.status, 'CANCELLED')
          await tx.match.update({
            where: { id: matchId },
            data: { status: 'CANCELLED', cancelledAt: now },
          })
        }

        await tx.outboxEvent.create({
          data: {
            guildId,
            type:        'DISPUTE_RESOLVED',
            payloadJson: { matchId, disputeId: dispute.id, decision, notes },
            status:      'PENDING',
          },
        })

        // Notify teams via DM outbox
        for (const participant of match.participants) {
          await tx.outboxEvent.create({
            data: {
              guildId,
              type:        'DM_DISPUTE_RESOLVED',
              payloadJson: { matchId, teamId: participant.teamId, decision, notes },
              status:      'PENDING',
            },
          })
        }

        await tx.auditLog.create({
          data: {
            guildId,
            actorId:    userId,
            action:     'DISPUTE_RESOLVED',
            targetType: 'Match',
            targetId:   matchId,
            metadata:   { disputeId: dispute.id, decision, notes },
          },
        })
      })

      const decisionLabel: Record<string, string> = {
        UPHOLD_CLAIM: '✅ Claim Upheld',
        REJECT_CLAIM: '❌ Claim Rejected',
        VOID_MATCH:   '🚫 Match Voided',
      }

      const embed = new ShadowEmbed()
        .setKind('success')
        .setTitle(e('referee'), 'DISPUTE RESOLVED', `Match #${match.number}`)
        .setDescription(
          [
            `**Decision:** ${decisionLabel[decision] ?? decision}`,
            notes ? `**Notes:** ${notes}` : '',
          ].filter(Boolean).join('\n'),
        )
        .setFooter()
        .setTimestamp()
        .build()

      return interaction.editReply({ embeds: [embed] })
    } catch (err) {
      if (err instanceof InvalidTransitionError) {
        return interaction.editReply({
          embeds: [errorEmbed(`Invalid match transition: ${err.message}`)],
        })
      }
      this.container.logger.error(`match resolve error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ─── handleRoomGet ───────────────────────────────────────────────────────────

  private async handleRoomGet(interaction: ChatInputCommandInteraction): Promise<unknown> {
    // CRITICAL: Always ephemeral — room credentials must NEVER be posted to a channel
    await interaction.deferReply({ ephemeral: true })

    const matchId = interaction.options.getString('match', true)
    const guildId = interaction.guildId!
    const userId  = interaction.user.id

    try {
      // 1. Find match scoped to guildId
      const match = await prisma.match.findFirst({
        where: { id: matchId, guildId },
        select: { id: true, status: true, number: true, map: true },
      })

      if (!match) {
        return interaction.editReply({
          embeds: [errorEmbed(`Match \`${matchId}\` not found in this server.`)],
        })
      }

      // 2. Validate match is in LIVE or READY status
      if (match.status !== 'LIVE' && match.status !== 'READY') {
        return interaction.editReply({
          embeds: [errorEmbed(`Room credentials are not available for matches with status: **${match.status}**.`)],
        })
      }

      // 3. Find room credentials
      const credential = await prisma.roomCredential.findUnique({
        where: { matchId },
        select: { roomId: true, password: true, releaseAt: true, expiresAt: true },
      })

      if (!credential) {
        return interaction.editReply({
          embeds: [errorEmbed('Room credentials have not been set for this match yet.')],
        })
      }

      // 4. Validate credentials are released
      if (credential.releaseAt > new Date()) {
        return interaction.editReply({
          embeds: [errorEmbed(`Room credentials will be available ${discordTs(credential.releaseAt, 'R')}.`)],
        })
      }

      // 5. Look up DB user by Discord ID
      const dbUser = await prisma.user.findFirst({
        where: { discordId: userId },
        select: { id: true },
      })

      if (!dbUser) {
        return interaction.editReply({
          embeds: [errorEmbed('Your user profile was not found. Please complete registration first.')],
        })
      }

      // 6. Validate user is captain of a checked-in team in this match
      const participant = await prisma.matchParticipant.findFirst({
        where: {
          matchId,
          checkedIn: true,
          team: { captainId: dbUser.id, guildId },
        },
        select: {
          id:     true,
          seeding: true,
          team:   { select: { name: true } },
        },
      })

      if (!participant) {
        return interaction.editReply({
          embeds: [errorEmbed('You must be the captain of a checked-in team to view room credentials.')],
        })
      }

      // 7. Reply ephemerally ONLY — never post credentials to channel
      const mapLabel  = match.map ?? 'TBD'
      const slotLabel = participant.seeding != null ? `SLOT #${String(participant.seeding).padStart(2, '0')}` : ''

      const embed = new ShadowEmbed()
        .setKind('live')
        .setTitle(e('keyIcon'), 'MATCH ROOM CREDENTIALS')
        .setDescription(
          [
            '━━━━━━━━━━━━━━━━━━━━━━━━',
            `Match:    M${String(match.number).padStart(2, '0')} — ${mapLabel}`,
            `Team:     ${participant.team.name}${slotLabel ? ` [${slotLabel}]` : ''}`,
            '━━━━━━━━━━━━━━━━━━━━━━━━',
            `Room ID:  \`${credential.roomId}\``,
            `Password: \`${credential.password}\``,
            '━━━━━━━━━━━━━━━━━━━━━━━━',
            '⚠️ These credentials are for your team ONLY.',
            'Sharing them publicly will result in immediate DQ.',
            'Credentials auto-expire 15 minutes after match start.',
          ].join('\n'),
        )
        .setFooter('credentials visible only to you')
        .setTimestamp()
        .build()

      return interaction.editReply({ embeds: [embed] })
    } catch (err) {
      this.container.logger.error(`match room get error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ─── handleRoomSet ───────────────────────────────────────────────────────────

  private async handleRoomSet(interaction: ChatInputCommandInteraction): Promise<unknown> {
    await interaction.deferReply({ ephemeral: true })

    const guildId = interaction.guildId!
    const userId  = interaction.user.id

    try {
      const userRole = await resolveUserRole({
        prisma,
        userId,
        guildId,
        botToken: process.env['DISCORD_BOT_TOKEN']!,
      })
      if (!roleAtLeast(userRole, AppRole.TOURNAMENT_MANAGER)) {
        return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
      }
    } catch {
      return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
    }

    const matchId       = interaction.options.getString('match', true)
    const roomId        = interaction.options.getString('room_id', true)
    const password      = interaction.options.getString('password', true)
    const releaseAtRaw  = interaction.options.getString('release_at') ?? undefined

    try {
      const match = await prisma.match.findFirst({
        where: { id: matchId, guildId },
        select: { id: true, number: true, scheduledStart: true, scheduledEnd: true },
      })

      if (!match) {
        return interaction.editReply({ embeds: [notFoundEmbed('match')] })
      }

      const releaseAt = releaseAtRaw ? new Date(releaseAtRaw) : match.scheduledStart
      if (isNaN(releaseAt.getTime())) {
        return interaction.editReply({ embeds: [errorEmbed(`Invalid release_at: \`${releaseAtRaw}\``)] })
      }

      await prisma.roomCredential.upsert({
        where: { matchId },
        create: {
          matchId,
          roomId,
          password,
          releaseAt,
          expiresAt: match.scheduledEnd,
          createdBy: userId,
        },
        update: {
          roomId,
          password,
          releaseAt,
          expiresAt: match.scheduledEnd,
          createdBy: userId,
        },
      })

      const embed = new ShadowEmbed()
        .setKind('success')
        .setTitle(e('keyIcon'), 'ROOM CREDENTIALS SET', `Match #${match.number}`)
        .setDescription(
          [
            `✅ Room credentials have been saved for Match #${match.number}.`,
            `**Release at:** ${discordTs(releaseAt, 'F')}`,
          ].join('\n'),
        )
        .setFooter()
        .setTimestamp()
        .build()

      return interaction.editReply({ embeds: [embed] })
    } catch (err) {
      this.container.logger.error(`match room set error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ─── handleRoomRelease ───────────────────────────────────────────────────────

  private async handleRoomRelease(interaction: ChatInputCommandInteraction): Promise<unknown> {
    await interaction.deferReply({ ephemeral: true })

    const guildId = interaction.guildId!
    const userId  = interaction.user.id

    try {
      const userRole = await resolveUserRole({
        prisma,
        userId,
        guildId,
        botToken: process.env['DISCORD_BOT_TOKEN']!,
      })
      if (!roleAtLeast(userRole, AppRole.TOURNAMENT_MANAGER)) {
        return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
      }
    } catch {
      return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
    }

    const matchId = interaction.options.getString('match', true)

    try {
      const match = await prisma.match.findFirst({
        where: { id: matchId, guildId },
        select: { id: true, number: true, map: true },
      })

      if (!match) {
        return interaction.editReply({ embeds: [notFoundEmbed('match')] })
      }

      const credential = await prisma.roomCredential.findUnique({
        where: { matchId },
        select: { roomId: true, password: true },
      })

      if (!credential) {
        return interaction.editReply({
          embeds: [errorEmbed('Room credentials have not been set for this match yet.')],
        })
      }

      await prisma.roomCredential.update({
        where: { matchId },
        data: { releasedAt: new Date() },
      })

      await prisma.outboxEvent.create({
        data: {
          guildId,
          type:        'ROOM_RELEASED',
          payloadJson: { matchId },
          status:      'PENDING',
        },
      })

      await prisma.auditLog.create({
        data: {
          guildId,
          actorId:    userId,
          action:     'ROOM_RELEASED',
          targetType: 'Match',
          targetId:   matchId,
          metadata:   { matchNumber: match.number },
        },
      })

      const mapLabel = match.map ?? 'TBD'

      const credEmbed = new ShadowEmbed()
        .setKind('live')
        .setTitle(e('keyIcon'), 'ROOM CREDENTIALS', `M${String(match.number).padStart(2, '0')} — ${mapLabel}`)
        .setDescription(
          [
            `**Room ID:**  \`${credential.roomId}\``,
            `**Password:** \`${credential.password}\``,
            '',
            '⚠️ Credentials released by tournament staff.',
          ].join('\n'),
        )
        .setFooter()
        .setTimestamp()
        .build()

      // Attempt to post to matchChannelId if configured
      try {
        const settings = await prisma.serverSettings.findUnique({
          where: { guildId },
          select: { matchChannelId: true },
        })

        if (settings?.matchChannelId) {
          const channel = interaction.guild?.channels.cache.get(settings.matchChannelId) as TextChannel | undefined
          if (channel) {
            await channel.send({ embeds: [credEmbed] })
            return interaction.editReply({
              embeds: [
                successEmbed(
                  'Credentials Released',
                  `✅ Room credentials for Match #${match.number} have been posted to <#${settings.matchChannelId}>.`,
                ),
              ],
            })
          }
        }
      } catch {
        // Fall through to ephemeral reply
      }

      // No matchChannelId configured — reply ephemerally
      return interaction.editReply({ embeds: [credEmbed] })
    } catch (err) {
      this.container.logger.error(`match room release error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }
}
