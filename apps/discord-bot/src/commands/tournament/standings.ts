import { Command } from '@sapphire/framework'
import { type ChatInputCommandInteraction } from 'discord.js'
import prisma from '@esports/database'
import { buildStandingsEmbed } from '../../utils/embeds'
import { notFoundEmbed, genericErrorEmbed, brandFooter } from '../../utils/responses'

export class TournamentStandingsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'standings',
      description: 'View live standings for a tournament.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('standings')
        .setDescription('View live standings for a tournament.')
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
      // Verify tournament exists in this guild
      const tournament = await prisma.tournament.findFirst({
        where: { id, guildId },
        select: { id: true, name: true },
      })

      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      // Aggregate score events by team (same logic as web API standings route)
      const scoreEvents = await prisma.scoreEvent.findMany({
        where: {
          match: {
            stage: {
              tournamentId: id,
              tournament: { guildId },
            },
          },
          status: 'active',
        },
        include: { team: { select: { name: true, tag: true } } },
      })

      const teamMap = new Map<string, {
        teamId: string
        name: string
        totalPoints: number
        totalKills: number
      }>()

      for (const event of scoreEvents) {
        const existing = teamMap.get(event.teamId) ?? {
          teamId: event.teamId,
          name: event.team.name,
          totalPoints: 0,
          totalKills: 0,
        }
        existing.totalPoints += Number(event.points)
        existing.totalKills += event.kills
        teamMap.set(event.teamId, existing)
      }

      const standings = Array.from(teamMap.values())
        .sort((a, b) => b.totalPoints - a.totalPoints || b.totalKills - a.totalKills)
        .slice(0, 10)
        .map((entry, index) => ({
          rank: index + 1,
          teamName: entry.name,
          points: entry.totalPoints,
          kills: entry.totalKills,
        }))

      const embed = buildStandingsEmbed(standings)
      embed.setTitle(`🏆 Standings — ${tournament.name}`)
      brandFooter(embed, interaction.guild?.name ?? 'Legendary Esports')

      return interaction.editReply({ embeds: [embed] })
    } catch (err) {
      this.container.logger.error(`tournament standings error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }
}
