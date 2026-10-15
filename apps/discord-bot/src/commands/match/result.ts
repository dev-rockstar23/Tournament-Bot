import { Command } from '@sapphire/framework'
import type { ChatInputCommandInteraction } from 'discord.js'
import { infoEmbed } from '../../utils/responses'

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
    const match = interaction.options.getString('match', true)
    return interaction.reply({
      embeds: [
        infoEmbed(
          '📋 Match Result',
          `Result submission for match **${match}** is coming soon! You will be able to upload a scorecard screenshot and enter kill counts directly in Discord.`,
        ),
      ],
      ephemeral: true,
    })
  }
}
