import { Command } from '@sapphire/framework'
import type { ChatInputCommandInteraction } from 'discord.js'
import { infoEmbed } from '../utils/responses'

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
    const tournament = interaction.options.getString('tournament', true)
    return interaction.reply({
      embeds: [
        infoEmbed(
          '🏆 Tournament Winners',
          `Winners for tournament **${tournament}** will be announced here when results are finalized! 🥇🥈🥉\n\nCheck the results channel for live updates.`,
        ),
      ],
      ephemeral: true,
    })
  }
}
