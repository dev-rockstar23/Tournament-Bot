import { Command } from '@sapphire/framework'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
} from 'discord.js'
import prisma from '@esports/database'
import { notFoundEmbed, genericErrorEmbed } from '../utils/responses'
import { ShadowEmbed } from '../utils/embed-builder'
import { e } from '../utils/emojis'
import { WEB_BASE } from '../utils/constants'
import { discordTs, gameLabel } from '../utils/time'

export class WinnersCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'winners',
      description: 'View tournament winners.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('winners')
        .setDescription('View tournament winners.')
        .addSubcommand(sub =>
          sub
            .setName('view')
            .setDescription('View the winners podium for a tournament.')
            .addStringOption(opt =>
              opt
                .setName('tournament')
                .setDescription('Tournament ID')
                .setRequired(true),
            ),
        ),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand(true)
    if (sub === 'view') return this.handleView(interaction)
  }

  private async handleView(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: false })

    const tournamentId = interaction.options.getString('tournament', true)
    const guildId = interaction.guildId!

    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id: tournamentId, guildId },
        select: {
          id: true,
          name: true,
          game: true,
          completedAt: true,
        },
      })

      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      const winners = await prisma.winnerRecord.findMany({
        where: {
          tournamentId,
          tournament: { guildId },
          isSuperseded: false,
        },
        orderBy: { placement: 'asc' },
        take: 10,
        include: {
          team: { select: { name: true, tag: true } },
        },
      })

      if (winners.length === 0) {
        const empty = new ShadowEmbed()
          .setKind('tournament')
          .setTitle(e('trophy'), 'winners', tournament.name)
          .setDescription('No winners have been recorded for this tournament yet.')
          .setFooter()
          .setTimestamp()
          .build()
        return interaction.editReply({ embeds: [empty] })
      }

      // Build podium lines
      const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
      const podiumLines = winners.map(w => {
        const medal = MEDALS[w.placement] ?? `**#${w.placement}**`
        const tag = w.team.tag ? ` [${w.team.tag}]` : ''
        return `${medal} **${w.team.name}${tag}**`
      })

      const champion = winners.find(w => w.placement === 1)
      const runnerUp  = winners.find(w => w.placement === 2)
      const third     = winners.find(w => w.placement === 3)

      const completedDate = tournament.completedAt
        ? discordTs(tournament.completedAt, 'd')
        : '—'

      const embed = new ShadowEmbed()
        .setKind('tournament')
        .setTitle('🏆', 'CHAMPIONS', tournament.name)
        .setGameThumbnail(tournament.game)
        .setDescription(
          [
            `**${gameLabel(tournament.game)} Grand Finale** • Concluded ${completedDate}`,
            '',
            podiumLines.join('\n'),
          ].join('\n'),
        )

      if (champion || runnerUp || third) {
        embed.addInlineFields([
          { name: '🥈 RUNNER-UP',  value: runnerUp?.team.name ?? '—' },
          { name: '🥇 CHAMPION',   value: champion?.team.name ?? '—' },
          { name: '🥉 THIRD PLACE',value: third?.team.name    ?? '—' },
        ])
      }

      embed.setFooter().setTimestamp()

      const resultsBtn = new ButtonBuilder()
        .setLabel('View Full Results on Dashboard →')
        .setStyle(ButtonStyle.Link)
        .setURL(`${WEB_BASE}/servers/${guildId}/tournaments/${tournamentId}/results`)
        .setEmoji('📊')

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(resultsBtn)

      return interaction.editReply({ embeds: [embed.build()], components: [row] })
    } catch (err) {
      this.container.logger.error(`winners error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }
}
