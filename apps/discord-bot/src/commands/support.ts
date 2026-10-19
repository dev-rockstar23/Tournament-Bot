import { Command } from '@sapphire/framework'
import { type ChatInputCommandInteraction } from 'discord.js'
import { ShadowEmbed } from '../utils/embed-builder'
import { e } from '../utils/emojis'
import { WEB_BASE } from '../utils/constants'
import { genericErrorEmbed } from '../utils/responses'

export class SupportCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'support',
      description: 'Show SHADØW TOURNAMENTS support links and contact information.',
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('support')
        .setDescription('Show SHADØW TOURNAMENTS support links and contact information.'),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    try {
      const supportServerUrl = process.env['SUPPORT_SERVER_URL'] ?? 'Coming soon'

      const embed = new ShadowEmbed()
        .setKind('info')
        .setTitle(e('support'), 'SHADØW TOURNAMENTS — Support')
        .setDescription(
          [
            'Welcome to SHADØW TOURNAMENTS support. Find everything you need below.',
            '',
          ].join('\n'),
        )
        .addField(
          `${e('link')} Documentation`,
          `[View the full docs](${WEB_BASE}/docs)`,
          false,
        )
        .addField(
          `${e('chart')} Dashboard`,
          `[Open your dashboard](${WEB_BASE})`,
          false,
        )
        .addField(
          `${e('users')} Support Server`,
          supportServerUrl.startsWith('http')
            ? `[Join the support server](${supportServerUrl})`
            : supportServerUrl,
          false,
        )
        .addField(
          `${e('warning')} Bug Reports`,
          [
            'Found a bug? Please report it with:',
            '• The command you ran',
            '• What you expected to happen',
            '• What actually happened',
            '• Any error messages shown',
            '',
            supportServerUrl.startsWith('http')
              ? `Report in the support server: [#bug-reports](${supportServerUrl})`
              : 'Use the support server once it is available.',
          ].join('\n'),
          false,
        )
        .addField(
          `${e('lightning')} Feature Requests`,
          [
            'Have an idea to improve SHADØW TOURNAMENTS?',
            '• Describe the feature clearly',
            '• Explain who it would benefit',
            '• Include any similar examples',
            '',
            supportServerUrl.startsWith('http')
              ? `Submit in the support server: [#feature-requests](${supportServerUrl})`
              : 'Use the support server once it is available.',
          ].join('\n'),
          false,
        )
        .setFooter()
        .setTimestamp()
        .build()

      return interaction.editReply({ embeds: [embed] })
    } catch (err) {
      this.container.logger.error(`support command error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }
}
