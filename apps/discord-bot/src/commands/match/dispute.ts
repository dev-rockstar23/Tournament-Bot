import { Command } from '@sapphire/framework'
import type { ChatInputCommandInteraction } from 'discord.js'
import { infoEmbed } from '../../utils/responses'

export class MatchDisputeCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'dispute',
      description: 'File a dispute for a match result.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('dispute')
        .setDescription('File a dispute for a match result.')
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
          '⚠️ Match Dispute',
          `Dispute filing for match **${match}** is coming soon! You will be able to provide evidence and a reason, and a referee will review it within 24 hours.`,
        ),
      ],
      ephemeral: true,
    })
  }
}
