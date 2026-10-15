import { Command } from '@sapphire/framework'
import {
  PermissionFlagsBits,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ActionRowBuilder,
  ComponentType,
  type ChatInputCommandInteraction,
} from 'discord.js'
import {
  buildTimezonePromptEmbed,
  buildTimezoneSelectMenu,
} from '../../utils/embeds'
import {
  permissionDeniedEmbed,
  successEmbed,
  infoEmbed,
  loadingEmbed,
  genericErrorEmbed,
} from '../../utils/responses'
import { e } from '../../utils/emojis'
import prisma from '@esports/database'

export class ServerSetupCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'setup',
      description: 'Run the server setup wizard to configure Legendary Esports Bot.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('setup')
        .setDescription('Run the server setup wizard to configure Legendary Esports Bot.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    // Permission check
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ embeds: [permissionDeniedEmbed()], ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })

    // -----------------------------------------------------------------------
    // STEP 1 — Timezone
    // -----------------------------------------------------------------------
    const settings = await prisma.serverSettings.findUnique({
      where: { guildId: interaction.guildId! },
    })

    if (!settings?.timezoneConfigured) {
      const tzRow = await interaction.editReply({
        embeds:     [buildTimezonePromptEmbed()],
        components: [buildTimezoneSelectMenu()],
      })

      try {
        const tzInteraction = await tzRow.awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          filter:        i => i.customId === 'setup_timezone' && i.user.id === interaction.user.id,
          time:          60_000,
        })

        const selectedTz = tzInteraction.values[0]

        await prisma.serverSettings.upsert({
          where:  { guildId: interaction.guildId! },
          update: { timezone: selectedTz, timezoneConfigured: true },
          create: { guildId: interaction.guildId!, timezone: selectedTz, timezoneConfigured: true },
        })

        await tzInteraction.update({
          embeds:     [successEmbed('Timezone Saved', `Timezone set to **${selectedTz}**. Moving on to channel configuration…`)],
          components: [],
        })
      } catch {
        await interaction.editReply({
          embeds:     [infoEmbed(`${e('warning')} Timed Out`, 'Setup timed out waiting for timezone selection. Run `/setup` again to continue.')],
          components: [],
        })
        return
      }
    }

    // -----------------------------------------------------------------------
    // STEP 2 — Channel configuration
    // -----------------------------------------------------------------------
    const channelFields: Array<{ label: string; customId: string; dbField: string }> = [
      { label: 'Announcement Channel',  customId: 'setup_ch_announcement', dbField: 'announcementChannelId'  },
      { label: 'Match Updates Channel', customId: 'setup_ch_match',        dbField: 'matchChannelId'         },
      { label: 'Results Channel',       customId: 'setup_ch_results',      dbField: 'resultsChannelId'       },
      { label: 'Disputes Channel',      customId: 'setup_ch_disputes',     dbField: 'disputesChannelId'      },
      { label: 'Admin Channel',         customId: 'setup_ch_admin',        dbField: 'adminChannelId'         },
    ]

    const channelRows = channelFields.map(f =>
      new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId(f.customId)
          .setPlaceholder(`Pick ${f.label}…`),
      ),
    )

    const chMessage = await interaction.editReply({
      embeds: [
        infoEmbed(
          `${e('bot')} Step 2 — Channel Configuration`,
          'Select the channels where Legendary Esports Bot will post its messages. You can leave any of these and configure them later via `/setup`.',
        ),
      ],
      components: channelRows,
    })

    // Collect all five channel selections within 2 minutes
    const channelUpdates: Record<string, string> = {}
    const collector = chMessage.createMessageComponentCollector({
      componentType: ComponentType.ChannelSelect,
      filter:        i => i.user.id === interaction.user.id,
      time:          120_000,
    })

    await new Promise<void>(resolve => {
      collector.on('collect', async i => {
        channelUpdates[i.customId] = i.values[0]
        await i.deferUpdate()
        if (Object.keys(channelUpdates).length === channelFields.length) {
          collector.stop('done')
        }
      })
      collector.on('end', () => resolve())
    })

    // Map customId → dbField
    const dbUpdate: Record<string, string> = {}
    for (const field of channelFields) {
      if (channelUpdates[field.customId]) {
        dbUpdate[field.dbField] = channelUpdates[field.customId]
      }
    }

    if (Object.keys(dbUpdate).length > 0) {
      await prisma.serverSettings.update({
        where: { guildId: interaction.guildId! },
        data:  dbUpdate,
      })
    }

    // -----------------------------------------------------------------------
    // STEP 3 — Role binding (simplified)
    // -----------------------------------------------------------------------
    const roleRows = [
      new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
        new RoleSelectMenuBuilder()
          .setCustomId('setup_role_manager')
          .setPlaceholder('Pick the Tournament Manager role…'),
      ),
      new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
        new RoleSelectMenuBuilder()
          .setCustomId('setup_role_referee')
          .setPlaceholder('Pick the Referee role…'),
      ),
    ]

    const roleMessage = await interaction.editReply({
      embeds: [
        infoEmbed(
          `${e('crown')} Step 3 — Role Binding`,
          'Map your Discord roles to Legendary Esports app roles. Members with these roles will automatically get the matching permissions.',
        ),
      ],
      components: roleRows,
    })

    const roleUpdates: Record<string, string> = {}
    const roleCollector = roleMessage.createMessageComponentCollector({
      componentType: ComponentType.RoleSelect,
      filter:        i => i.user.id === interaction.user.id,
      time:          120_000,
    })

    await new Promise<void>(resolve => {
      roleCollector.on('collect', async i => {
        roleUpdates[i.customId] = i.values[0]
        await i.deferUpdate()
        if (Object.keys(roleUpdates).length === 2) {
          roleCollector.stop('done')
        }
      })
      roleCollector.on('end', () => resolve())
    })

    // Persist role bindings
    const bindingEntries: Array<{ customId: string; appRole: 'TOURNAMENT_MANAGER' | 'REFEREE' }> = [
      { customId: 'setup_role_manager',  appRole: 'TOURNAMENT_MANAGER' },
      { customId: 'setup_role_referee',  appRole: 'REFEREE'            },
    ]

    for (const entry of bindingEntries) {
      const roleId = roleUpdates[entry.customId]
      if (!roleId) continue

      const guildRole = interaction.guild?.roles.cache.get(roleId)
      if (!guildRole) continue

      try {
        await prisma.serverRoleBinding.upsert({
          where:  { guildId_discordRoleId: { guildId: interaction.guildId!, discordRoleId: roleId } },
          update: { appRole: entry.appRole, discordRoleName: guildRole.name },
          create: {
            guildId:        interaction.guildId!,
            discordRoleId:  roleId,
            discordRoleName: guildRole.name,
            appRole:        entry.appRole,
            createdBy:      interaction.user.id,
          },
        })
      } catch (err) {
        this.container.logger.error(`Failed to upsert role binding: ${err}`)
      }
    }

    // -----------------------------------------------------------------------
    // Done
    // -----------------------------------------------------------------------
    try {
      await interaction.editReply({
        embeds: [
          successEmbed(
            'Setup Complete!',
            [
              `${e('trophy')} Your server is configured and ready for tournaments!`,
              '',
              '**Next steps:**',
              '• Use `/tournament create` to set up your first tournament',
              '• Use `/server status` to check system health',
              '• Visit the dashboard for advanced settings: **https://legendary-esports.gg**',
            ].join('\n'),
          ),
        ],
        components: [],
      })
    } catch {
      await interaction.editReply({ embeds: [genericErrorEmbed()], components: [] })
    }
  }
}
