import { Command } from '@sapphire/framework'
import { PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js'
import { infoEmbed } from '../../utils/responses'

export class TournamentCancelCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'cancel',
      description: 'Cancel a tournament.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('cancel')
        .setDescription('Cancel a tournament.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(opt =>
          opt
            .setName('id')
            .setDescription('Tournament ID')
            .setRequired(true),
        )
        .addStringOption(opt =>
          opt
            .setName('reason')
            .setDescription('Reason for cancellation (optional)')
            .setRequired(false),
        ),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const id = interaction.options.getString('id', true)
    return interaction.reply({
      embeds: [
        infoEmbed(
          '⚠️ Tournament Cancel',
          `Tournament cancellation via Discord is coming soon! Visit the dashboard for tournament **${id}**.\n\n🌐 **https://legendary-esports.gg/dashboard/tournaments/${id}**`,
        ),
      ],
      ephemeral: true,
    })
  }
}
