import { Command } from '@sapphire/framework'
import {
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  EmbedBuilder,
  ComponentType,
  type ChatInputCommandInteraction,
} from 'discord.js'
import { AppRole, APP_ROLE_LABELS, resolveUserRole } from '@esports/permissions'
import prisma from '@esports/database'
import {
  successEmbed,
  errorEmbed,
  infoEmbed,
  permissionDeniedEmbed,
  genericErrorEmbed,
  noResultsEmbed,
} from '../utils/responses'
import { ShadowEmbed } from '../utils/embed-builder'
import { buildHealthEmbed } from '../utils/embeds'
import { e } from '../utils/emojis'

// ---------------------------------------------------------------------------
// App role choices (mirrored from the old roles.ts)
// ---------------------------------------------------------------------------
const APP_ROLE_CHOICES: Array<{ name: string; value: string }> = [
  { name: 'Server Admin',        value: 'SERVER_ADMIN'       },
  { name: 'Tournament Manager',  value: 'TOURNAMENT_MANAGER' },
  { name: 'Referee',             value: 'REFEREE'            },
  { name: 'Player',              value: 'PLAYER'             },
  { name: 'Viewer',              value: 'VIEWER'             },
]

export class ServerCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'server',
      description: 'Server management commands for SHADØW TOURNAMENTS.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('server')
        .setDescription('Server management commands for SHADØW TOURNAMENTS.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        // ---- status ----
        .addSubcommand(sub =>
          sub
            .setName('status')
            .setDescription('Show system health and configuration status for this server.'),
        )
        // ---- branding ----
        .addSubcommand(sub =>
          sub
            .setName('branding')
            .setDescription('Configure server branding (logo, accent color, banner).')
            .addStringOption(opt =>
              opt
                .setName('logo_url')
                .setDescription('URL of the server logo image.')
                .setRequired(false),
            )
            .addStringOption(opt =>
              opt
                .setName('accent_color')
                .setDescription('Hex accent color, e.g. #7c3aed')
                .setRequired(false),
            )
            .addStringOption(opt =>
              opt
                .setName('banner_url')
                .setDescription('URL of the server banner image.')
                .setRequired(false),
            ),
        )
        // ---- roles group ----
        .addSubcommandGroup(group =>
          group
            .setName('roles')
            .setDescription('Manage Discord role → app role bindings.')
            .addSubcommand(sub =>
              sub
                .setName('list')
                .setDescription('Show all current role bindings for this server.'),
            )
            .addSubcommand(sub =>
              sub
                .setName('add')
                .setDescription('Bind a Discord role to an app permission level.'),
            )
            .addSubcommand(sub =>
              sub
                .setName('remove')
                .setDescription('Remove an existing role binding.'),
            )
            .addSubcommand(sub =>
              sub
                .setName('members')
                .setDescription('List member counts per app role.'),
            ),
        ),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ embeds: [permissionDeniedEmbed()], ephemeral: true })
    }

    const group = interaction.options.getSubcommandGroup(false)
    const sub   = interaction.options.getSubcommand()

    if (group === 'roles') {
      switch (sub) {
        case 'list':    return this.handleRolesList(interaction)
        case 'add':     return this.handleRolesAdd(interaction)
        case 'remove':  return this.handleRolesRemove(interaction)
        case 'members': return this.handleRolesMembers(interaction)
        default:
          return interaction.reply({ embeds: [errorEmbed('Unknown roles subcommand.')], ephemeral: true })
      }
    }

    switch (sub) {
      case 'status':   return this.handleStatus(interaction)
      case 'branding': return this.handleBranding(interaction)
      default:
        return interaction.reply({ embeds: [errorEmbed('Unknown subcommand.')], ephemeral: true })
    }
  }

  // -------------------------------------------------------------------------
  // status
  // -------------------------------------------------------------------------
  private async handleStatus(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    try {
      const role = await resolveUserRole({
        prisma,
        userId:   interaction.user.id,
        guildId:  interaction.guildId!,
        botToken: process.env['DISCORD_BOT_TOKEN']!,
      })

      if (role < AppRole.TOURNAMENT_MANAGER) {
        return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
      }

      const outboxBacklog = await prisma.outboxEvent.count({
        where: { status: 'PENDING', guildId: interaction.guildId! },
      })

      const embed = buildHealthEmbed({
        database:     'connected',
        redis:        'connected',
        outboxBacklog,
        lastSync:     null,
      })

      return interaction.editReply({ embeds: [embed] })
    } catch (err) {
      this.container.logger.error(`server status error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // -------------------------------------------------------------------------
  // branding
  // -------------------------------------------------------------------------
  private async handleBranding(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const logoUrl     = interaction.options.getString('logo_url')     ?? null
    const accentColor = interaction.options.getString('accent_color') ?? null
    const bannerUrl   = interaction.options.getString('banner_url')   ?? null

    if (!logoUrl && !accentColor && !bannerUrl) {
      return interaction.editReply({
        embeds: [infoEmbed(
          `${e('design')} Server Branding`,
          'Provide at least one of `logo_url`, `accent_color`, or `banner_url` to update branding.',
        )],
      })
    }

    try {
      const data: Record<string, string | null> = {}
      if (logoUrl     !== null) data['logoUrl']     = logoUrl
      if (accentColor !== null) data['accentColor'] = accentColor
      if (bannerUrl   !== null) data['bannerUrl']   = bannerUrl

      await prisma.serverSettings.upsert({
        where:  { guildId: interaction.guildId! },
        update: data,
        create: { guildId: interaction.guildId!, ...data },
      })

      const previewBuilder = new ShadowEmbed()
        .setKind('success')
        .setTitle(e('design'), 'BRANDING UPDATED')
        .setDescription('Server branding has been updated successfully.')
        .setFooter()
        .setTimestamp()

      if (logoUrl)   previewBuilder.setThumbnail(logoUrl)
      if (bannerUrl) previewBuilder.setBanner(bannerUrl)

      // Show field summary of what changed
      if (logoUrl)     previewBuilder.addField('Logo URL',     logoUrl,     false)
      if (accentColor) previewBuilder.addField('Accent Color', accentColor, true)
      if (bannerUrl)   previewBuilder.addField('Banner URL',   bannerUrl,   false)

      return interaction.editReply({ embeds: [previewBuilder.build()] })
    } catch (err) {
      this.container.logger.error(`server branding error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // -------------------------------------------------------------------------
  // roles list
  // -------------------------------------------------------------------------
  private async handleRolesList(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    try {
      const bindings = await prisma.serverRoleBinding.findMany({
        where:   { guildId: interaction.guildId! },
        orderBy: { appRole: 'asc' },
      })

      if (bindings.length === 0) {
        return interaction.editReply({ embeds: [noResultsEmbed()] })
      }

      const rows = bindings.map(
        b => `<@&${b.discordRoleId}> → **${APP_ROLE_LABELS[AppRole[b.appRole as keyof typeof AppRole]]}**`,
      )

      const embed = new ShadowEmbed()
        .setKind('info')
        .setTitle(e('crown'), 'ROLE BINDINGS')
        .setDescription(rows.join('\n'))
        .setFooter()
        .setTimestamp()
        .build()

      return interaction.editReply({ embeds: [embed] })
    } catch (err) {
      this.container.logger.error(`server roles list error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // -------------------------------------------------------------------------
  // roles add
  // -------------------------------------------------------------------------
  private async handleRolesAdd(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    // Step 1: pick the Discord role
    const roleRow = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('roles_add_discord')
        .setPlaceholder('Select the Discord role to bind…'),
    )

    const msg = await interaction.editReply({
      embeds:     [infoEmbed(`${e('crown')} Add Role Binding`, 'Select the Discord role you want to map to an app permission level.')],
      components: [roleRow],
    })

    let discordRoleId   = ''
    let discordRoleName = ''

    try {
      const ri = await msg.awaitMessageComponent({
        componentType: ComponentType.RoleSelect,
        filter:        i => i.customId === 'roles_add_discord' && i.user.id === interaction.user.id,
        time:          60_000,
      })
      discordRoleId   = ri.values[0]!
      discordRoleName = interaction.guild?.roles.cache.get(discordRoleId)?.name ?? discordRoleId
      await ri.deferUpdate()
    } catch {
      return interaction.editReply({
        embeds:     [infoEmbed(`${e('warning')} Timed Out`, 'No role selected. Run `/server roles add` again.')],
        components: [],
      })
    }

    // Step 2: pick the app role
    const appRoleRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('roles_add_approle')
        .setPlaceholder('Select the app permission level…')
        .addOptions(
          APP_ROLE_CHOICES.map(c =>
            new StringSelectMenuOptionBuilder().setLabel(c.name).setValue(c.value),
          ),
        ),
    )

    const msg2 = await interaction.editReply({
      embeds:     [infoEmbed(`${e('crown')} Add Role Binding`, `Now pick the app role for **${discordRoleName}**.`)],
      components: [appRoleRow],
    })

    let appRole = ''
    try {
      const ai = await msg2.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        filter:        i => i.customId === 'roles_add_approle' && i.user.id === interaction.user.id,
        time:          60_000,
      })
      appRole = ai.values[0]!
      await ai.deferUpdate()
    } catch {
      return interaction.editReply({
        embeds:     [infoEmbed(`${e('warning')} Timed Out`, 'No app role selected. Run `/server roles add` again.')],
        components: [],
      })
    }

    try {
      await prisma.serverRoleBinding.upsert({
        where:  { guildId_discordRoleId: { guildId: interaction.guildId!, discordRoleId } },
        update: { appRole: appRole as Parameters<typeof prisma.serverRoleBinding.upsert>[0]['update']['appRole'], discordRoleName },
        create: {
          guildId:        interaction.guildId!,
          discordRoleId,
          discordRoleName,
          appRole:        appRole as Parameters<typeof prisma.serverRoleBinding.create>[0]['data']['appRole'],
          createdBy:      interaction.user.id,
        },
      })

      return interaction.editReply({
        embeds:     [successEmbed('Role Binding Saved', `<@&${discordRoleId}> is now bound to **${appRole.replace(/_/g, ' ')}**.`)],
        components: [],
      })
    } catch (err) {
      this.container.logger.error(`server roles add error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()], components: [] })
    }
  }

  // -------------------------------------------------------------------------
  // roles remove
  // -------------------------------------------------------------------------
  private async handleRolesRemove(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    let bindings
    try {
      bindings = await prisma.serverRoleBinding.findMany({
        where: { guildId: interaction.guildId! },
      })
    } catch (err) {
      this.container.logger.error(`server roles remove fetch error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }

    if (bindings.length === 0) {
      return interaction.editReply({ embeds: [noResultsEmbed()] })
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId('roles_remove_select')
      .setPlaceholder('Select a binding to remove…')
      .addOptions(
        bindings.map(b =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`${b.discordRoleName} → ${b.appRole}`)
            .setValue(b.id),
        ),
      )

    const msg = await interaction.editReply({
      embeds:     [infoEmbed(`${e('warning')} Remove Role Binding`, 'Select the binding you want to remove.')],
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
    })

    try {
      const si = await msg.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        filter:        i => i.customId === 'roles_remove_select' && i.user.id === interaction.user.id,
        time:          60_000,
      })
      const bindingId = si.values[0]!
      await si.deferUpdate()

      await prisma.serverRoleBinding.delete({ where: { id: bindingId } })

      return interaction.editReply({
        embeds:     [successEmbed('Binding Removed', 'The role binding has been removed successfully.')],
        components: [],
      })
    } catch {
      return interaction.editReply({
        embeds:     [infoEmbed(`${e('warning')} Timed Out`, 'No selection made. Run `/server roles remove` again.')],
        components: [],
      })
    }
  }

  // -------------------------------------------------------------------------
  // roles members
  // -------------------------------------------------------------------------
  private async handleRolesMembers(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    let bindings
    try {
      bindings = await prisma.serverRoleBinding.findMany({
        where: { guildId: interaction.guildId! },
      })
    } catch (err) {
      this.container.logger.error(`server roles members fetch error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }

    if (bindings.length === 0) {
      return interaction.editReply({
        embeds: [infoEmbed(`${e('crown')} Role Members`, 'No role bindings configured yet. Use `/server roles add` to set them up.')],
      })
    }

    const lines: string[] = []
    for (const binding of bindings) {
      const role   = interaction.guild?.roles.cache.get(binding.discordRoleId)
      const count  = role?.members.size ?? 0
      const appLbl = APP_ROLE_LABELS[AppRole[binding.appRole as keyof typeof AppRole]] ?? binding.appRole
      lines.push(`<@&${binding.discordRoleId}> (${appLbl}) — **${count}** member(s)`)
    }

    const embed = new ShadowEmbed()
      .setKind('info')
      .setTitle(e('crown'), 'MEMBERS BY ROLE')
      .setDescription(lines.join('\n'))
      .setFooter()
      .setTimestamp()
      .build()

    return interaction.editReply({ embeds: [embed] })
  }
}
