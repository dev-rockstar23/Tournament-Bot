import { Command } from '@sapphire/framework'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
} from 'discord.js'
import prisma from '@esports/database'
import { buildTournamentEmbed } from '../../utils/embeds'
import { notFoundEmbed, genericErrorEmbed, brandFooter } from '../../utils/responses'

const WEB_BASE = 'https://legendary-esports.gg'

export class TournamentInfoCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'info',
      description: 'View detailed info about a tournament.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('info')
        .setDescription('View detailed info about a tournament.')
        .addStringOption(opt =>
          opt
            .setName('id')
            .setDescription('Tournament ID')
            .setRequired(true),
        ),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: false })

    const id = interaction.options.getString('id', true)
    const guildId = interaction.guildId!

    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id, guildId },
        include: {
          _count: { select: { registrations: true, stages: true } },
        },
      })

      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      const embed = buildTournamentEmbed({
        id: tournament.id,
        name: tournament.name,
        game: tournament.game,
        status: tournament.status,
        teamCapacity: tournament.teamCapacity,
        acceptedCount: tournament.acceptedCount,
        startAt: tournament.startAt,
        endAt: tournament.endAt,
        registrationOpenAt: tournament.registrationOpenAt,
        registrationCloseAt: tournament.registrationCloseAt,
        bannerUrl: tournament.bannerUrl,
        description: tournament.description,
      })

      // Add registration and stages count fields
      embed.addFields(
        { name: 'Registrations', value: String(tournament._count.registrations), inline: true },
        { name: 'Stages',        value: String(tournament._count.stages),        inline: true },
      )

      brandFooter(embed, interaction.guild?.name ?? 'Legendary Esports')

      const registerBtn = new ButtonBuilder()
        .setLabel('Register')
        .setStyle(ButtonStyle.Link)
        .setURL(`${WEB_BASE}/servers/${guildId}/tournaments/${id}/register`)
        .setEmoji('✍️')

      const dashboardBtn = new ButtonBuilder()
        .setLabel('Dashboard')
        .setStyle(ButtonStyle.Link)
        .setURL(`${WEB_BASE}/servers/${guildId}/tournaments/${id}`)
        .setEmoji('🌐')

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(registerBtn, dashboardBtn)

      return interaction.editReply({ embeds: [embed], components: [row] })
    } catch (err) {
      this.container.logger.error(`tournament info error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }
}
