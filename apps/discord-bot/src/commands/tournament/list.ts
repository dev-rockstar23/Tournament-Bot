import { Command } from '@sapphire/framework'
import type { ChatInputCommandInteraction } from 'discord.js'
import { infoEmbed } from '../../utils/responses'

export class TournamentListCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'list',
      description: 'List tournaments for this server.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('list')
        .setDescription('List tournaments for this server.')
        .addStringOption(opt =>
          opt
            .setName('status')
            .setDescription('Filter by tournament status')
            .setRequired(false)
            .addChoices(
              { name: 'Draft',              value: 'DRAFT'              },
              { name: 'Registration Open',  value: 'REGISTRATION_OPEN'  },
              { name: 'Live',               value: 'LIVE'               },
              { name: 'Completed',          value: 'COMPLETED'          },
            ),
        ),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    return interaction.reply({
      embeds: [
        infoEmbed(
          '📋 Tournament List',
          'Tournament listing is coming in the next update! Check the dashboard for all tournaments.\n\n🌐 **https://legendary-esports.gg/dashboard/tournaments**',
        ),
      ],
      ephemeral: true,
    })
  }
}
