import { Command } from '@sapphire/framework'
import {
  PermissionFlagsBits,
  ComponentType,
  ChannelSelectMenuBuilder,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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

const TWO_MINUTES = 2 * 60 * 1000

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
        select: {
          timezoneConfigured:    true,
          timezone:              true,
          registrationChannelId: true,
          approvedRegChannelId:  true,
        },
      })
    } catch (err) {
      this.container.logger.error(`setup settings fetch error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }

    let selectedTimezone = settings?.timezone ?? 'UTC'

    if (!settings?.timezoneConfigured) {
      const tzMessage = await interaction.editReply({
        embeds:     [buildTimezonePromptEmbed()],
        components: [buildTimezoneSelectMenu()],
      })

      try {
        const tzInteraction = await tzMessage.awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          filter:        i => i.customId === 'setup_timezone' && i.user.id === interaction.user.id,
          time:          TWO_MINUTES,
        })

        selectedTimezone = tzInteraction.values[0]!

        // Acknowledge immediately — must happen within 3 seconds
        await tzInteraction.deferUpdate()

        try {
          await prisma.serverSettings.upsert({
            where:  { guildId: interaction.guildId! },
            update: { timezone: selectedTimezone, timezoneConfigured: true },
            create: { guildId: interaction.guildId!, timezone: selectedTimezone, timezoneConfigured: true },
          })
        } catch (err) {
          this.container.logger.error(`setup settings upsert error: ${err}`)
        }

      } catch {
        // Timed out — save UTC as default
        selectedTimezone = 'UTC'
        try {
          await prisma.serverSettings.upsert({
            where:  { guildId: interaction.guildId! },
            update: { timezone: 'UTC', timezoneConfigured: true },
            create: { guildId: interaction.guildId!, timezone: 'UTC', timezoneConfigured: true },
          })
        } catch (err) {
          this.container.logger.error(`setup UTC fallback upsert error: ${err}`)
        }
      }
    }

    // -----------------------------------------------------------------------
    // STEP 3 — Registration Channels (only if not already configured)
    // -----------------------------------------------------------------------
    const needsChannelSetup = !settings?.registrationChannelId || !settings?.approvedRegChannelId

    if (needsChannelSetup) {
      const channelPromptEmbed = new ShadowEmbed()
        .setKind('info')
        .setTitle('📋', 'SETUP — Registration Channels')
        .setDescription(
          [
            'The new **channel-based registration system** requires two channels:',
            '',
            '**1️⃣ Registration Channel** — Players post their registrations here',
            '**2️⃣ Approved Channel** — Bot posts approved registrations here',
            '',
            'Click **Setup Channels** below to configure them.',
            'Or click **Skip** to set them up later via `/server branding`.',
          ].join('\n'),
        )
        .setFooter()
        .build()

      const setupBtn = new ButtonBuilder()
        .setCustomId('setup_channels_btn')
        .setLabel('Setup Channels')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📋')

      const skipBtn = new ButtonBuilder()
        .setCustomId('setup_skip_channels')
        .setLabel('Skip for Now')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⏭️')

      const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(setupBtn, skipBtn)

      const channelPromptMsg = await interaction.editReply({
        embeds:     [channelPromptEmbed],
        components: [buttonRow],
      })

      try {
        const btnInteraction = await channelPromptMsg.awaitMessageComponent({
          componentType: ComponentType.Button,
          filter:        i => (i.customId === 'setup_channels_btn' || i.customId === 'setup_skip_channels') && i.user.id === interaction.user.id,
          time:          TWO_MINUTES,
        })

        if (btnInteraction.customId === 'setup_skip_channels') {
          await btnInteraction.deferUpdate()

          const skippedEmbed = new ShadowEmbed()
            .setKind('success')
            .setTitle(e('success'), 'SHADØW TOURNAMENTS — Setup Complete')
            .setDescription(
              [
                `${e('success')} Your server is now configured!`,
                '',
                `**Timezone:** ${selectedTimezone}`,
                '',
                '⚠️ **Registration channels not configured.**',
                'Players cannot register until you set them up via `/server branding`.',
                '',
                '**Next steps**',
                `• \`/server branding\` — Configure registration channels`,
                `• \`/tournament create\` — Create your first tournament`,
                `• \`/server roles add\` — Assign staff roles`,
                '',
                `${e('link')} **Dashboard:** ${WEB_BASE}`,
              ].join('\n'),
            )
            .setFooter()
            .setTimestamp()
            .build()

          return interaction.editReply({ embeds: [skippedEmbed], components: [] })
        }

        // User clicked "Setup Channels" — show channel selectors
        await btnInteraction.deferUpdate()

        // Step 3a: Registration channel selector
        const regChannelMenu = new ChannelSelectMenuBuilder()
          .setCustomId('setup_reg_channel')
          .setPlaceholder('Select the registration channel…')
          .setChannelTypes(ChannelType.GuildText)

        const regChannelRow = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(regChannelMenu)

        const regChannelEmbed = new ShadowEmbed()
          .setKind('info')
          .setTitle('📋', 'Select Registration Channel')
          .setDescription(
            [
              '**1️⃣ Registration Channel**',
              '',
              'This is where players will post their team registrations.',
              'The bot will validate each message and react with ✅ or ❌.',
              '',
              'Select a text channel below:',
            ].join('\n'),
          )
          .setFooter()
          .build()

        await interaction.editReply({
          embeds:     [regChannelEmbed],
          components: [regChannelRow],
        })

        const regChannelInteraction = await channelPromptMsg.awaitMessageComponent({
          componentType: ComponentType.ChannelSelect,
          filter:        i => i.customId === 'setup_reg_channel' && i.user.id === interaction.user.id,
          time:          TWO_MINUTES,
        })

        const regChannelId = regChannelInteraction.values[0]!

        await regChannelInteraction.deferUpdate()

        // Step 3b: Approved channel selector
        const approvedChannelMenu = new ChannelSelectMenuBuilder()
          .setCustomId('setup_approved_channel')
          .setPlaceholder('Select the approved registrations channel…')
          .setChannelTypes(ChannelType.GuildText)

        const approvedChannelRow = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(approvedChannelMenu)

        const approvedChannelEmbed = new ShadowEmbed()
          .setKind('info')
          .setTitle('✅', 'Select Approved Channel')
          .setDescription(
            [
              '**2️⃣ Approved Registrations Channel**',
              '',
              'This is where the bot will post approved team registrations.',
              'Only approved teams will appear here.',
              '',
              'Select a text channel below:',
            ].join('\n'),
          )
          .setFooter()
          .build()

        await interaction.editReply({
          embeds:     [approvedChannelEmbed],
          components: [approvedChannelRow],
        })

        const approvedChannelInteraction = await channelPromptMsg.awaitMessageComponent({
          componentType: ComponentType.ChannelSelect,
          filter:        i => i.customId === 'setup_approved_channel' && i.user.id === interaction.user.id,
          time:          TWO_MINUTES,
        })

        const approvedChannelId = approvedChannelInteraction.values[0]!

        await approvedChannelInteraction.deferUpdate()

        // Save both channels
        try {
          await prisma.serverSettings.upsert({
            where:  { guildId: interaction.guildId! },
            update: {
              registrationChannelId: regChannelId,
              approvedRegChannelId:  approvedChannelId,
            },
            create: {
              guildId:               interaction.guildId!,
              registrationChannelId: regChannelId,
              approvedRegChannelId:  approvedChannelId,
              timezone:              selectedTimezone,
              timezoneConfigured:    true,
            },
          })
        } catch (err) {
          this.container.logger.error(`setup channel save error: ${err}`)
          return interaction.editReply({ embeds: [genericErrorEmbed()], components: [] })
        }

        const finalEmbed = new ShadowEmbed()
          .setKind('success')
          .setTitle(e('success'), 'SHADØW TOURNAMENTS — Setup Complete')
          .setDescription(
            [
              `${e('success')} Your server is now fully configured and ready for competitive play!`,
              '',
              `**Timezone:** ${selectedTimezone}`,
              `**Registration Channel:** <#${regChannelId}>`,
              `**Approved Channel:** <#${approvedChannelId}>`,
              '',
              '**How registration works:**',
              '• Players post their team in the registration channel',
              '• Bot validates format (2–5 Discord @mentions required)',
              '• Bot reacts ✅ if approved, ❌ if rejected',
              '• Approved teams are posted to the approved channel',
              '',
              '**Next steps**',
              `• \`/tournament create\` — Create your first tournament`,
              `• \`/server roles add\` — Assign staff roles`,
              `• \`/register\` — See registration instructions`,
              '',
              `${e('link')} **Dashboard:** ${WEB_BASE}`,
            ].join('\n'),
          )
          .setFooter()
          .setTimestamp()
          .build()

        await interaction.editReply({
          embeds:     [finalEmbed],
          components: [],
        })

      } catch {
        // Channel setup timed out
        const timeoutEmbed = new ShadowEmbed()
          .setKind('info')
          .setTitle(e('warning'), 'Channel Setup Timed Out')
          .setDescription(
            [
              'No channels were selected within 2 minutes.',
              '',
              `**Timezone:** ${selectedTimezone} ✅`,
              '**Registration Channels:** Not configured ⚠️',
              '',
              'Run `/server branding` to configure channels, or run `/setup` again.',
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
            `**Timezone:** ${selectedTimezone}`,
            `**Registration Channel:** ${settings.registrationChannelId ? `<#${settings.registrationChannelId}>` : 'Not set'}`,
            `**Approved Channel:** ${settings.approvedRegChannelId ? `<#${settings.approvedRegChannelId}>` : 'Not set'}`,
            '',
            '**What you can do**',
            `• \`/tournament create\` — Create a new tournament`,
            `• \`/server branding\` — Update channels`,
            `• \`/server roles add\` — Manage role bindings`,
            `• \`/register\` — See registration instructions`,
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
