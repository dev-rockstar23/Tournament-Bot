import { Command } from '@sapphire/framework'
import type { ChatInputCommandInteraction } from 'discord.js'
import { infoEmbed } from '../utils/responses'

export class AnalyticsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'analytics',
      description: 'View server analytics and leaderboards.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('analytics')
        .setDescription('View server analytics and leaderboards.')
        .addStringOption(opt =>
          opt
            .setName('game')
            .setDescription('Filter by game (optional)')
            .setRequired(false)
            .addChoices(
              { name: 'BGMI',       value: 'BGMI'      },
              { name: 'Free Fire',  value: 'FREE_FIRE' },
              { name: 'COD Mobile', value: 'CODM'      },
            ),
        ),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    return interaction.reply({
      embeds: [
        infoEmbed(
          '📊 Analytics',
          'Analytics dashboard is coming soon! Full stats, leaderboards and performance trends are being built.\n\n🌐 **https://legendary-esports.gg/dashboard/analytics**',
        ),
      ],
      ephemeral: true,
    })
  }
}
