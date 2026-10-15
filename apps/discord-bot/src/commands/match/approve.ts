import { Command } from '@sapphire/framework'
import { PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js'
import { infoEmbed } from '../../utils/responses'

export class MatchApproveCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'approve',
      description: 'Approve submitted match results.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('approve')
        .setDescription('Approve submitted match results.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
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
          '✅ Result Approval',
          `Result approval for match **${match}** is coming soon! Referees will be able to review submitted scorecards and approve or reject them directly in Discord.`,
        ),
      ],
      ephemeral: true,
    })
  }
}
