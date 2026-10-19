import { Command } from '@sapphire/framework'
import {
  AttachmentBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js'
import prisma from '@esports/database'
import { genericErrorEmbed, successEmbed } from '../utils/responses'
import { ShadowEmbed } from '../utils/embed-builder'
import { e } from '../utils/emojis'
import { gameLabel } from '../utils/time'

const GAME_CHOICES = [
  { name: 'BGMI',       value: 'BGMI'       },
  { name: 'Free Fire',  value: 'FREE_FIRE'  },
  { name: 'COD Mobile', value: 'COD_MOBILE' },
] as const

export class AnalyticsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'analytics',
      description: 'View server analytics and export data.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('analytics')
        .setDescription('View server analytics and export data.')
        .addSubcommand(sub =>
          sub
            .setName('summary')
            .setDescription('View a stat summary for this server.')
            .addStringOption(opt =>
              opt
                .setName('game')
                .setDescription('Filter by game (optional)')
                .setRequired(false)
                .addChoices(...GAME_CHOICES),
            ),
        )
        .addSubcommand(sub =>
          sub
            .setName('export')
            .setDescription('Export tournament data as a CSV file.')
            .addStringOption(opt =>
              opt
                .setName('game')
                .setDescription('Filter by game (optional)')
                .setRequired(false)
                .addChoices(...GAME_CHOICES),
            ),
        ),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand(true)
    if (sub === 'summary') return this.handleSummary(interaction)
    if (sub === 'export')  return this.handleExport(interaction)
  }

  private async handleSummary(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const guildId = interaction.guildId!
    const game = interaction.options.getString('game', false) as string | null

    try {
      const gameFilter = game ? { game: game as 'BGMI' | 'FREE_FIRE' | 'COD_MOBILE' } : {}

      // Tournaments by status
      const [
        totalTournaments,
        draftCount,
        openCount,
        liveCount,
        completedCount,
        cancelledCount,
        totalMatches,
        totalRegistrations,
        openDisputes,
      ] = await Promise.all([
        prisma.tournament.count({ where: { guildId, ...gameFilter } }),
        prisma.tournament.count({ where: { guildId, status: 'DRAFT', ...gameFilter } }),
        prisma.tournament.count({ where: { guildId, status: 'REGISTRATION_OPEN', ...gameFilter } }),
        prisma.tournament.count({ where: { guildId, status: 'LIVE', ...gameFilter } }),
        prisma.tournament.count({ where: { guildId, status: 'COMPLETED', ...gameFilter } }),
        prisma.tournament.count({ where: { guildId, status: 'CANCELLED', ...gameFilter } }),
        prisma.match.count({ where: { guildId } }),
        prisma.registration.count({ where: { guildId } }),
        prisma.dispute.count({
          where: {
            status: 'OPEN',
            match: { guildId },
          },
        }),
      ])

      // Distinct players via captainId
      const distinctCaptains = await prisma.team.findMany({
        where: { guildId },
        select: { captainId: true },
        distinct: ['captainId'],
      })
      const distinctPlayerCount = distinctCaptains.length

      const gameTitle = game ? ` (${gameLabel(game)})` : ''

      const embed = new ShadowEmbed()
        .setKind('info')
        .setTitle(e('chart'), 'analytics', `Server Stats${gameTitle}`)
        .addInlineFields([
          { name: 'Total Tournaments', value: String(totalTournaments) },
          { name: 'Draft',             value: String(draftCount)       },
          { name: 'Open',              value: String(openCount)        },
          { name: 'Live',              value: String(liveCount)        },
          { name: 'Completed',         value: String(completedCount)   },
          { name: 'Cancelled',         value: String(cancelledCount)   },
        ])
        .addInlineFields([
          { name: 'Total Matches',      value: String(totalMatches)       },
          { name: 'Registrations',      value: String(totalRegistrations) },
          { name: 'Distinct Players',   value: String(distinctPlayerCount) },
        ])
        .addField('Open Disputes', String(openDisputes), false)
        .setFooter()
        .setTimestamp()
        .build()

      return interaction.editReply({ embeds: [embed] })
    } catch (err) {
      this.container.logger.error(`analytics summary error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  private async handleExport(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const guildId = interaction.guildId!
    const game = interaction.options.getString('game', false) as string | null

    try {
      const gameFilter = game ? { game: game as 'BGMI' | 'FREE_FIRE' | 'COD_MOBILE' } : {}

      const tournaments = await prisma.tournament.findMany({
        where: { guildId, ...gameFilter },
        select: {
          id:           true,
          name:         true,
          game:         true,
          status:       true,
          teamCapacity: true,
          acceptedCount:true,
          startAt:      true,
        },
        orderBy: { createdAt: 'desc' },
      })

      const header = 'id,name,game,status,capacity,accepted,startAt\n'
      const rows = tournaments.map(t =>
        [
          t.id,
          `"${t.name.replace(/"/g, '""')}"`,
          t.game,
          t.status,
          t.teamCapacity,
          t.acceptedCount,
          t.startAt ? t.startAt.toISOString() : '',
        ].join(','),
      )
      const csv = header + rows.join('\n')

      const attachment = new AttachmentBuilder(Buffer.from(csv, 'utf-8'), {
        name: 'tournaments.csv',
      })

      const confirmEmbed = successEmbed(
        'Export Ready',
        `Exported **${tournaments.length}** tournament(s)${game ? ` (${gameLabel(game)})` : ''} as \`tournaments.csv\`.`,
      )

      return interaction.editReply({ embeds: [confirmEmbed], files: [attachment] })
    } catch (err) {
      this.container.logger.error(`analytics export error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }
}
