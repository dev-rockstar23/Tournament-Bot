import { Command } from '@sapphire/framework'
import { PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js'
import { infoEmbed } from '../../utils/responses'

export class MatchScheduleCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'schedule',
      description: 'Schedule matches for a tournament.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('schedule')
        .setDescription('Schedule matches for a tournament.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
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
          '🗓️ Match Schedule',
          `Match scheduling for tournament **${tournament}** is coming soon!\n\n🌐 **https://legendary-esports.gg/dashboard/tournaments/${tournament}/matches**`,
        ),
      ],
      ephemeral: true,
    })
  }
}
