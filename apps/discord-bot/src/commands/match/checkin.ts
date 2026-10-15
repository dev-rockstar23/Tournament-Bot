import { Command } from '@sapphire/framework'
import type { ChatInputCommandInteraction } from 'discord.js'
import { infoEmbed } from '../../utils/responses'

export class MatchCheckinCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'checkin',
      description: 'Check in for an upcoming match.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('checkin')
        .setDescription('Check in for an upcoming match.')
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
          '✅ Match Check-in',
          `Check-in for match **${match}** is coming soon! Check-in will open automatically before match time and you will be pinged in the match channel.`,
        ),
      ],
      ephemeral: true,
    })
  }
}
