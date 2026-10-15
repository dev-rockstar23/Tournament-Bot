import { Command } from '@sapphire/framework'
import type { ChatInputCommandInteraction } from 'discord.js'
import { infoEmbed } from '../../utils/responses'

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
    const id = interaction.options.getString('id', true)
    return interaction.reply({
      embeds: [
        infoEmbed(
          '📊 Tournament Standings',
          `Live standings for tournament **${id}** are coming in the next update!\n\n🌐 **https://legendary-esports.gg/dashboard/tournaments/${id}/standings**`,
        ),
      ],
      ephemeral: true,
    })
  }
}
