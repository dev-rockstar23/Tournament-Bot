import { Command } from '@sapphire/framework'
import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ChatInputCommandInteraction,
} from 'discord.js'
import prisma from '@esports/database'
import { successEmbed, errorEmbed, genericErrorEmbed } from '../../utils/responses'

export class MatchResultCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'result',
      description: 'Submit match results.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('result')
        .setDescription('Submit match results.')
        .addStringOption(opt =>
          opt
            .setName('match')
            .setDescription('Match ID')
            .setRequired(true),
        ),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const matchId = interaction.options.getString('match', true)
    const guildId = interaction.guildId!
    const userId = interaction.user.id

    // Validate match and user authorization before showing modal
    const match = await prisma.match.findFirst({
      where: { id: matchId, guildId },
      select: {
        id: true,
        status: true,
        number: true,
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

    // Verify user is captain of a participating team
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

    // Show result submission modal
    // Teams participating in this match — up to 4 entries in the modal
    const participantCount = Math.min(match.participants.length, 4)

    const modal = new ModalBuilder()
      .setCustomId(`result_modal:${matchId}`)
      .setTitle(`Match #${match.number} — Submit Results`)

    // Each row: "teamId:placement:kills" for one team
    const hint = match.participants
      .slice(0, 4)
      .map((p, i) => `Team ${i + 1}: ${p.teamId}`)
      .join(', ')

    const placementInput = new TextInputBuilder()
      .setCustomId('result_scorecard')
      .setLabel('Scorecard (teamId,placement,kills per line)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setPlaceholder(
        'Format: teamId,placement,kills\nExample:\ncm1abc,1,8\ncm2def,2,5',
      )
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
      const evidenceUrl = modalSubmit.fields.getTextInputValue('result_evidence').trim() || undefined

      // Parse scorecard lines: "teamId,placement,kills"
      const lines = rawScorecard
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)

      const scorecardJson: Array<{ teamId: string; placement: number; kills: number; penalties: number }> = []

      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim())
        if (parts.length < 3) continue
        const placement = parseInt(parts[1], 10)
        const kills = parseInt(parts[2], 10)
        if (!parts[0] || isNaN(placement) || isNaN(kills)) continue
        scorecardJson.push({ teamId: parts[0], placement, kills, penalties: 0 })
      }

      if (scorecardJson.length === 0) {
        return modalSubmit.editReply({
          embeds: [errorEmbed('Could not parse the scorecard. Check the format and try again.')],
        })
      }

      // Validate team IDs are participants
      const participantIds = new Set(match.participants.map(p => p.teamId))
      const invalid = scorecardJson.filter(e => !participantIds.has(e.teamId))
      if (invalid.length > 0) {
        return modalSubmit.editReply({
          embeds: [errorEmbed(`Unknown team IDs: ${invalid.map(e => e.teamId).join(', ')}`)],
        })
      }

      // Submit result using same logic as the web API
      await prisma.$transaction(async tx => {
        await tx.resultSubmission.create({
          data: {
            matchId,
            submittedBy: dbUser!.id,
            scorecardJson,
            evidenceUrl: evidenceUrl ?? null,
            status: 'PENDING_REVIEW',
          },
        })

        await tx.match.update({
          where: { id: matchId },
          data: { status: 'UNDER_REVIEW' },
        })

        await tx.outboxEvent.create({
          data: {
            guildId,
            type: 'RESULT_SUBMITTED',
            payloadJson: { matchId, submittedBy: dbUser!.id },
            status: 'PENDING',
          },
        })

        await tx.auditLog.create({
          data: {
            guildId,
            actorId: dbUser!.id,
            action: 'RESULT_SUBMITTED',
            targetType: 'Match',
            targetId: matchId,
            metadata: { teamsCount: scorecardJson.length },
          },
        })
      })

      return modalSubmit.editReply({
        embeds: [
          successEmbed(
            'Results Submitted',
            `📊 Your scorecard for Match #${match.number} has been submitted for review. A referee will approve it shortly.`,
          ),
        ],
      })
    } catch {
      // Modal timed out — no-op
    }
  }
}
