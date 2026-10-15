import { Command } from '@sapphire/framework'
import type { ChatInputCommandInteraction } from 'discord.js'
import { infoEmbed } from '../utils/responses'

export class RegisterCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'register',
      description: 'Register for a tournament.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('register')
        .setDescription('Register for a tournament.')
        .addStringOption(opt =>
          opt
            .setName('tournament')
            .setDescription('Tournament ID')
            .setRequired(true),
        ),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const tournament = interaction.options.getString('tournament', true)
    return interaction.reply({
      embeds: [
        infoEmbed(
          '✍️ Tournament Registration',
          `Registration for tournament **${tournament}** is coming soon! Registration will open when the tournament admin publishes it — you will be notified in the announcement channel.`,
        ),
      ],
      ephemeral: true,
    })
  }
}
