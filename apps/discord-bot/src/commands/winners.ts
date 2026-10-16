import { Command } from '@sapphire/framework'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js'
import prisma from '@esports/database'
import { notFoundEmbed, genericErrorEmbed, brandFooter } from '../utils/responses'
import { e } from '../utils/emojis'

const BRAND_COLOR = 0x7c3aed
const WEB_BASE = 'https://legendary-esports.gg'

export class WinnersCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'winners',
      description: 'View the winners of a tournament.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('winners')
        .setDescription('View the winners of a tournament.')
        .addStringOption(opt =>
          opt
            .setName('tournament')
            .setDescription('Tournament ID')
            .setRequired(true),
        ),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: false })

    const tournamentId = interaction.options.getString('tournament', true)
    const guildId = interaction.guildId!

    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id: tournamentId, guildId },
        select: { id: true, name: true, game: true },
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

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle(`${e('trophy')} Winners — ${tournament.name}`)
        .setTimestamp()

      brandFooter(embed, interaction.guild?.name ?? 'Legendary Esports')

      if (winners.length === 0) {
        embed.setDescription('No winners have been recorded for this tournament yet.')
        return interaction.editReply({ embeds: [embed] })
      }

      const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

      const rows = winners.map(w => {
        const medal = medals[w.placement] ?? `**#${w.placement}**`
        const tag = w.team.tag ? ` [${w.team.tag}]` : ''
        return `${medal} **${w.team.name}${tag}**`
      })

      embed.setDescription(rows.join('\n'))

      const resultsBtn = new ButtonBuilder()
        .setLabel('View Full Results')
        .setStyle(ButtonStyle.Link)
        .setURL(`${WEB_BASE}/servers/${guildId}/tournaments/${tournamentId}/results`)
        .setEmoji('📊')

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(resultsBtn)

      return interaction.editReply({ embeds: [embed], components: [row] })
    } catch (err) {
      this.container.logger.error(`winners error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }
}
