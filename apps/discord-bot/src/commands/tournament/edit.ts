import { Command } from '@sapphire/framework'
import { PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js'
import { infoEmbed } from '../../utils/responses'

export class TournamentEditCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'edit',
      description: 'Edit an existing tournament.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('edit')
        .setDescription('Edit an existing tournament.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
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
          '✏️ Tournament Edit',
          `Tournament editing via Discord is coming soon! For now, visit the dashboard to edit tournament **${id}**.\n\n🌐 **https://legendary-esports.gg/dashboard/tournaments/${id}/edit**`,
        ),
      ],
      ephemeral: true,
    })
  }
}
