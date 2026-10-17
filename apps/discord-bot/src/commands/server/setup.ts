import { Command } from '@sapphire/framework'
import {
  PermissionFlagsBits,
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
  genericErrorEmbed,
} from '../../utils/responses'
import { e } from '../../utils/emojis'
import prisma from '@esports/database'

const FIVE_MINUTES = 5 * 60 * 1000   // 5 min for timezone
const TWO_MINUTES  = 2 * 60 * 1000   // 2 min for channels/roles

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
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ embeds: [permissionDeniedEmbed()], ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })

    // -----------------------------------------------------------------------
    // STEP 1 — Ensure server record exists
    // -----------------------------------------------------------------------
    await prisma.discordServer.upsert({
      where:  { guildId: interaction.guildId! },
      update: { name: interaction.guild!.name, icon: interaction.guild!.icon, isActive: true },
      create: { guildId: interaction.guildId!, name: interaction.guild!.name, icon: interaction.guild!.icon, ownerId: interaction.guild!.ownerId },
    })

    // -----------------------------------------------------------------------
    // STEP 2 — Timezone
    // -----------------------------------------------------------------------
    const settings = await prisma.serverSettings.findUnique({
      where: { guildId: interaction.guildId! },
    })

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

        const selectedTz = tzInteraction.values[0]

        await prisma.serverSettings.upsert({
          where:  { guildId: interaction.guildId! },
          update: { timezone: selectedTz, timezoneConfigured: true },
          create: { guildId: interaction.guildId!, timezone: selectedTz, timezoneConfigured: true },
        })

        await tzInteraction.update({
          embeds:     [successEmbed('Timezone Saved', `Timezone set to **${selectedTz}**.\n\nYou're all set! Use \`/tournament create\` to start your first tournament.`)],
          components: [],
        })

      } catch {
        // Timed out — save UTC as default and continue
        await prisma.serverSettings.upsert({
          where:  { guildId: interaction.guildId! },
          update: { timezone: 'UTC', timezoneConfigured: true },
          create: { guildId: interaction.guildId!, timezone: 'UTC', timezoneConfigured: true },
        })

        await interaction.editReply({
          embeds: [infoEmbed(
            `${e('warning')} Timezone Not Selected`,
            'No timezone was selected — defaulting to **UTC**.\n\nRun `/setup` again to change it.',
          )],
          components: [],
        })
      }
    } else {
      // Already configured — show current status
      await interaction.editReply({
        embeds: [successEmbed(
          'Setup Complete',
          [
            `${e('success')} Your server is already configured!`,
            '',
            `**Timezone:** ${settings.timezone}`,
            '',
            '**What you can do:**',
            '• `/tournament create` — create a new tournament',
            '• `/status` — check system health',
            '• Run `/setup` again to reconfigure',
          ].join('\n'),
        )],
        components: [],
      })
    }
  }
}
