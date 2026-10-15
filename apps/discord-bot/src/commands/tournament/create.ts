import { Command } from '@sapphire/framework'
import { PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js'
import { infoEmbed } from '../../utils/responses'

export class TournamentCreateCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'create',
      description: 'Launch the tournament creation wizard.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('create')
        .setDescription('Launch the tournament creation wizard.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    return interaction.reply({
      embeds: [
        infoEmbed(
          '🏆 Tournament Creation',
          [
            'Tournament creation is launching soon! For now, head to the dashboard to set up tournaments.',
            '',
            '🌐 **https://legendary-esports.gg/dashboard/tournaments/new**',
            '',
            'The full in-Discord wizard is coming in our next update. ⚡',
          ].join('\n'),
        ),
      ],
      ephemeral: true,
    })
  }
}
