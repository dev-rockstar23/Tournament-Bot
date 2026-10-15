import { Command } from '@sapphire/framework'
import type { ChatInputCommandInteraction } from 'discord.js'
import { infoEmbed } from '../../utils/responses'

export class MatchRoomCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'room',
      description: 'Get room credentials for a match.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('room')
        .setDescription('Get room credentials for a match.')
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
          '🔑 Match Room',
          `Room credentials for match **${match}** will be posted here automatically before match time! Make sure you have checked in and watch the match channel for the room ID and password.`,
        ),
      ],
      ephemeral: true,
    })
  }
}
