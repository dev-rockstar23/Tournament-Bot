import { Command } from '@sapphire/framework'
import type { ChatInputCommandInteraction } from 'discord.js'
import { infoEmbed } from '../../utils/responses'

export class TournamentParticipantsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'participants',
      description: 'View registered participants for a tournament.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('participants')
        .setDescription('View registered participants for a tournament.')
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
          '👥 Tournament Participants',
          `Participant list for tournament **${id}** is coming soon!\n\n🌐 **https://legendary-esports.gg/dashboard/tournaments/${id}/participants**`,
        ),
      ],
      ephemeral: true,
    })
  }
}
