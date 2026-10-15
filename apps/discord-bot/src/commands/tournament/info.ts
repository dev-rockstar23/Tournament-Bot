import { Command } from '@sapphire/framework'
import type { ChatInputCommandInteraction } from 'discord.js'
import { infoEmbed } from '../../utils/responses'

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
    const id = interaction.options.getString('id', true)
    return interaction.reply({
      embeds: [
        infoEmbed(
          'ℹ️ Tournament Info',
          `Tournament info cards are coming soon! Check the dashboard for detailed tournament **${id}** info.\n\n🌐 **https://legendary-esports.gg/dashboard/tournaments/${id}**`,
        ),
      ],
      ephemeral: true,
    })
  }
}
