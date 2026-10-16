import { Command } from '@sapphire/framework'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
  type ChatInputCommandInteraction,
} from 'discord.js'
import prisma from '@esports/database'
import { AppRole, roleAtLeast, resolveUserRole } from '@esports/permissions'
import { getDefaultConfig, calculateBgmiMatchScore } from '@esports/game-rules'
import type { MatchScoreParams } from '@esports/game-rules'
import { assertMatchTransition, InvalidTransitionError } from '@esports/tournament-engine'
import { successEmbed, errorEmbed, genericErrorEmbed, permissionDeniedEmbed } from '../../utils/responses'

const BRAND_COLOR = 0x7c3aed

export class MatchApproveCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'approve',
      description: 'Review and approve or reject submitted match results.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('approve')
        .setDescription('Review and approve or reject submitted match results.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(opt =>
          opt
            .setName('match')
            .setDescription('Match ID')
            .setRequired(true),
        ),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const matchId = interaction.options.getString('match', true)
    const guildId = interaction.guildId!
    const userId = interaction.user.id

    // Check REFEREE+ permission
    const userRole = await resolveUserRole({
      prisma,
      userId,
      guildId,
      botToken: process.env.DISCORD_BOT_TOKEN!,
    })

    if (!roleAtLeast(userRole, AppRole.REFEREE)) {
      return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
    }

    try {
      // Fetch match with pending submission
      const match = await prisma.match.findFirst({
        where: { id: matchId, guildId },
        select: {
          id: true,
          status: true,
          number: true,
          stage: {
            select: {
              tournamentId: true,
              tournament: {
                select: {
                  game: true,
                  mode: true,
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
        return interaction.editReply({
          embeds: [errorEmbed(`Match \`${matchId}\` not found in this server.`)],
        })
      }

      if (match.status !== 'UNDER_REVIEW') {
        return interaction.editReply({
          embeds: [errorEmbed(`This match is not currently under review (status: **${match.status}**).`)],
        })
      }

      // Get pending submission
      const submission = await prisma.resultSubmission.findFirst({
        where: { matchId, status: 'PENDING_REVIEW' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          scorecardJson: true,
          evidenceUrl: true,
          createdAt: true,
        },
      })

      if (!submission) {
        return interaction.editReply({
          embeds: [errorEmbed('No pending result submission found for this match.')],
        })
      }

      const scorecard = submission.scorecardJson as Array<{
        teamId: string
        placement: number
        kills: number
        penalties: number
      }>

      // Build scorecard embed
      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle(`📊 Result Review — Match #${match.number}`)
        .setDescription(
          [
            `**Submission ID:** \`${submission.id}\``,
            `**Submitted:** <t:${Math.floor(new Date(submission.createdAt).getTime() / 1000)}:F>`,
            submission.evidenceUrl ? `**Evidence:** [View Screenshot](${submission.evidenceUrl})` : '',
          ]
            .filter(Boolean)
            .join('\n'),
        )
        .setTimestamp()

      const scorecardLines = scorecard.map(
        (e, i) => `**#${e.placement}** Team \`${e.teamId}\` — ${e.kills} kills${e.penalties ? ` (−${e.penalties} pts penalty)` : ''}`,
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

      const btnInteraction = await msg.awaitMessageComponent({
        componentType: ComponentType.Button,
        filter: i =>
          (i.customId.startsWith('mapprove:approve:') || i.customId.startsWith('mapprove:reject:')) &&
          i.user.id === userId,
        time: 120_000,
      }).catch(() => null)

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
        await this.handleApprove({ match, submission, scorecard, guildId, userId, interaction })
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
          await this.handleReject({ matchId, submission, guildId, userId, reason, interaction })
        } catch {
          // Timed out — no-op
        }
      }
    } catch (err) {
      this.container.logger.error(`match approve error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()], components: [] })
    }
  }

  private async handleApprove(ctx: {
    match: {
      id: string
      number: number
      stage: {
        tournamentId: string
        tournament: {
          game: string
          mode: string
          ruleVersions: Array<{ rulesJson: unknown }>
        }
      }
    }
    submission: { id: string; scorecardJson: unknown }
    scorecard: Array<{ teamId: string; placement: number; kills: number; penalties: number }>
    guildId: string
    userId: string
    interaction: ChatInputCommandInteraction
  }) {
    const { match, submission, scorecard, guildId, userId, interaction } = ctx

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
            killPoints: rj['killPoints'] as number,
            placementPoints: rj['placementPoints'] as number[],
            ...(typeof rj['maxKillPoints'] === 'number' ? { maxKillPoints: rj['maxKillPoints'] as number } : {}),
          }
        }
      } catch { /* use defaults */ }
    }

    const scoreParams: MatchScoreParams = {
      config,
      placements: scorecard.map(e => ({
        teamId: e.teamId,
        placement: e.placement,
        kills: e.kills,
        penalties: e.penalties,
      })),
      matchId: match.id,
    }
    const approvedScores = calculateBgmiMatchScore(scoreParams)

    await prisma.$transaction(async tx => {
      await tx.scoreEvent.createMany({
        data: approvedScores.map(score => {
          const entry = scorecard.find(e => e.teamId === score.teamId)!
          return {
            matchId: match.id,
            teamId: score.teamId,
            type: 'MATCH_SCORE' as const,
            points: score.points,
            kills: score.kills,
            placement: score.placement,
            penalties: Number(entry.penalties ?? 0),
            status: 'active',
            createdBy: userId,
          }
        }),
      })

      await tx.resultSubmission.update({
        where: { id: submission.id },
        data: { status: 'APPROVED', reviewedBy: userId, reviewedAt: new Date() },
      })

      assertMatchTransition('UNDER_REVIEW', 'COMPLETED')
      await tx.match.update({
        where: { id: match.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })

      await tx.outboxEvent.create({
        data: {
          guildId,
          type: 'RESULT_APPROVED',
          payloadJson: { matchId: match.id, scores: approvedScores.map(s => ({ teamId: s.teamId, points: s.points })) },
          status: 'PENDING',
        },
      })

      await tx.auditLog.create({
        data: {
          guildId,
          actorId: userId,
          action: 'RESULT_APPROVED',
          targetType: 'Match',
          targetId: match.id,
          metadata: { submissionId: submission.id, scoresCount: approvedScores.length },
        },
      })
    })

    await interaction.editReply({
      embeds: [successEmbed('Result Approved', `✅ Match #${match.number} has been completed and scores recorded.`)],
      components: [],
    })
  }

  private async handleReject(ctx: {
    matchId: string
    submission: { id: string }
    guildId: string
    userId: string
    reason: string
    interaction: ChatInputCommandInteraction
  }) {
    const { matchId, submission, guildId, userId, reason, interaction } = ctx

    await prisma.$transaction(async tx => {
      await tx.resultSubmission.update({
        where: { id: submission.id },
        data: { status: 'REJECTED', reviewedBy: userId, reviewedAt: new Date(), rejectionReason: reason },
      })

      // Revert match to AWAITING_RESULT so the team can resubmit
      await tx.match.update({ where: { id: matchId }, data: { status: 'AWAITING_RESULT' } })

      await tx.outboxEvent.create({
        data: {
          guildId,
          type: 'RESULT_REJECTED',
          payloadJson: { matchId, reason },
          status: 'PENDING',
        },
      })

      await tx.auditLog.create({
        data: {
          guildId,
          actorId: userId,
          action: 'RESULT_REJECTED',
          targetType: 'Match',
          targetId: matchId,
          reason,
          metadata: { submissionId: submission.id },
        },
      })
    })

    await interaction.editReply({
      embeds: [successEmbed('Result Rejected', `❌ The submission has been rejected. The team must resubmit.`)],
      components: [],
    })
  }
}
