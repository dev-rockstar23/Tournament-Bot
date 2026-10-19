import { Command } from '@sapphire/framework'
import {
  PermissionFlagsBits,
  ComponentType,
  type ChatInputCommandInteraction,
} from 'discord.js'
import {
  buildTimezonePromptEmbed,
  buildTimezoneSelectMenu,
} from '../utils/embeds'
import { ShadowEmbed } from '../utils/embed-builder'
import { permissionDeniedEmbed, genericErrorEmbed } from '../utils/responses'
import { e } from '../utils/emojis'
import { WEB_BASE } from '../utils/constants'
import prisma from '@esports/database'

const FIVE_MINUTES = 5 * 60 * 1000

export class SetupCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'setup',
      description: 'Run the SHADØW TOURNAMENTS server setup wizard.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('setup')
        .setDescription('Run the SHADØW TOURNAMENTS server setup wizard.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ embeds: [permissionDeniedEmbed()], ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })

    // -----------------------------------------------------------------------
    // STEP 1 — Ensure server record exists
    // -----------------------------------------------------------------------
    try {
      await prisma.discordServer.upsert({
        where:  { guildId: interaction.guildId! },
        update: { name: interaction.guild!.name, icon: interaction.guild!.icon, isActive: true },
        create: { guildId: interaction.guildId!, name: interaction.guild!.name, icon: interaction.guild!.icon, ownerId: interaction.guild!.ownerId },
      })
    } catch (err) {
      this.container.logger.error(`setup upsert error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }

    // -----------------------------------------------------------------------
    // STEP 2 — Timezone
    // -----------------------------------------------------------------------
    let settings
    try {
      settings = await prisma.serverSettings.findUnique({
        where: { guildId: interaction.guildId! },
      })
    } catch (err) {
      this.container.logger.error(`setup settings fetch error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }

    if (!settings?.timezoneConfigured) {
      const tzMessage = await interaction.editReply({
        embeds:     [buildTimezonePromptEmbed()],
        components: [buildTimezoneSelectMenu()],
      })

      try {
        const tzInteraction = await tzMessage.awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          filter:        i => i.customId === 'setup_timezone' && i.user.id === interaction.user.id,
          time:          FIVE_MINUTES,
        })

        const selectedTz = tzInteraction.values[0]!

        // Acknowledge immediately — must happen within 3 seconds
        await tzInteraction.deferUpdate()

        try {
          await prisma.serverSettings.upsert({
            where:  { guildId: interaction.guildId! },
            update: { timezone: selectedTz, timezoneConfigured: true },
            create: { guildId: interaction.guildId!, timezone: selectedTz, timezoneConfigured: true },
          })
        } catch (err) {
          this.container.logger.error(`setup settings upsert error: ${err}`)
        }

        const successEmbed = new ShadowEmbed()
          .setKind('success')
          .setTitle(e('success'), 'SHADØW TOURNAMENTS — Setup Complete')
          .setDescription(
            [
              `${e('success')} Your server is now configured and ready for competitive play!`,
              '',
              `**Timezone:** ${selectedTz}`,
              '',
              '**Next steps**',
              `• \`/tournament create\` — Create your first tournament`,
              `• \`/server roles add\` — Assign staff roles`,
              `• \`/server status\` — Check system health`,
              '',
              `${e('link')} **Dashboard:** ${WEB_BASE}`,
            ].join('\n'),
          )
          .setFooter()
          .setTimestamp()
          .build()

        // Use editReply on the original interaction since we deferred the component
        await interaction.editReply({
          embeds:     [successEmbed],
          components: [],
        })

      } catch {
        // Timed out — save UTC as default and continue
        try {
          await prisma.serverSettings.upsert({
            where:  { guildId: interaction.guildId! },
            update: { timezone: 'UTC', timezoneConfigured: true },
            create: { guildId: interaction.guildId!, timezone: 'UTC', timezoneConfigured: true },
          })
        } catch (err) {
          this.container.logger.error(`setup UTC fallback upsert error: ${err}`)
        }

        const timeoutEmbed = new ShadowEmbed()
          .setKind('info')
          .setTitle(e('warning'), 'Timezone Not Selected')
          .setDescription(
            [
              'No timezone was selected — defaulting to **UTC**.',
              '',
              'Run `/setup` again to change your timezone.',
              '',
              `${e('link')} **Dashboard:** ${WEB_BASE}`,
            ].join('\n'),
          )
          .setFooter()
          .build()

        await interaction.editReply({
          embeds:     [timeoutEmbed],
          components: [],
        })
      }
    } else {
      // Already configured — show current status
      const alreadyEmbed = new ShadowEmbed()
        .setKind('info')
        .setTitle(e('success'), 'SHADØW TOURNAMENTS — Already Configured')
        .setDescription(
          [
            `${e('success')} Your server is already configured for SHADØW TOURNAMENTS!`,
            '',
            `**Timezone:** ${settings.timezone}`,
            '',
            '**What you can do**',
            `• \`/tournament create\` — Create a new tournament`,
            `• \`/server status\` — Check system health`,
            `• \`/server roles add\` — Manage role bindings`,
            `• Run \`/setup\` again to reconfigure timezone`,
            '',
            `${e('link')} **Dashboard:** ${WEB_BASE}`,
          ].join('\n'),
        )
        .setFooter()
        .setTimestamp()
        .build()

      await interaction.editReply({
        embeds:     [alreadyEmbed],
        components: [],
      })
    }
  }
}
