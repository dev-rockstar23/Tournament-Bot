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
import { AppRole, APP_ROLE_LABELS } from '@esports/permissions'
import prisma from '@esports/database'
import {
  successEmbed,
  errorEmbed,
  infoEmbed,
  permissionDeniedEmbed,
  genericErrorEmbed,
  noResultsEmbed,
} from '../../utils/responses'
import { e } from '../../utils/emojis'

const APP_ROLE_CHOICES: Array<{ name: string; value: string }> = [
  { name: 'Server Admin',        value: 'SERVER_ADMIN'       },
  { name: 'Tournament Manager',  value: 'TOURNAMENT_MANAGER' },
  { name: 'Referee',             value: 'REFEREE'            },
  { name: 'Player',              value: 'PLAYER'             },
  { name: 'Viewer',              value: 'VIEWER'             },
]

export class ServerRolesCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'roles',
      description: 'Manage Discord role → app role bindings for this server.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('roles')
        .setDescription('Manage Discord role → app role bindings for this server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(opt =>
          opt
            .setName('subcommand')
            .setDescription('Action to perform')
            .setRequired(true)
            .addChoices(
              { name: 'list    — Show all current role bindings',     value: 'list'    },
              { name: 'add     — Bind a Discord role to an app role', value: 'add'     },
              { name: 'remove  — Remove an existing binding',         value: 'remove'  },
              { name: 'members — List members per app role',          value: 'members' },
            ),
        ),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ embeds: [permissionDeniedEmbed()], ephemeral: true })
    }

    const sub = interaction.options.getString('subcommand', true)

    switch (sub) {
      case 'list':    return this.handleList(interaction)
      case 'add':     return this.handleAdd(interaction)
      case 'remove':  return this.handleRemove(interaction)
      case 'members': return this.handleMembers(interaction)
      default:
        return interaction.reply({ embeds: [errorEmbed('Unknown subcommand.')], ephemeral: true })
    }
  }

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------
  private async handleList(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

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

    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle(`${e('crown')} Role Bindings`)
      .setDescription(rows.join('\n'))

    return interaction.editReply({ embeds: [embed] })
  }

  // -------------------------------------------------------------------------
  // add
  // -------------------------------------------------------------------------
  private async handleAdd(interaction: ChatInputCommandInteraction) {
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
      discordRoleId   = ri.values[0]
      discordRoleName = interaction.guild?.roles.cache.get(discordRoleId)?.name ?? discordRoleId
      await ri.deferUpdate()
    } catch {
      return interaction.editReply({ embeds: [infoEmbed(`${e('warning')} Timed Out`, 'No role selected. Run `/roles add` again.')], components: [] })
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
      appRole = ai.values[0]
      await ai.deferUpdate()
    } catch {
      return interaction.editReply({ embeds: [infoEmbed(`${e('warning')} Timed Out`, 'No app role selected. Run `/roles add` again.')], components: [] })
    }

    try {
      await prisma.serverRoleBinding.upsert({
        where:  { guildId_discordRoleId: { guildId: interaction.guildId!, discordRoleId } },
        update: { appRole: appRole as any, discordRoleName },
        create: {
          guildId:        interaction.guildId!,
          discordRoleId,
          discordRoleName,
          appRole:        appRole as any,
          createdBy:      interaction.user.id,
        },
      })

      return interaction.editReply({
        embeds:     [successEmbed('Role Binding Saved', `<@&${discordRoleId}> is now bound to **${appRole.replace(/_/g, ' ')}**.`)],
        components: [],
      })
    } catch (err) {
      this.container.logger.error(`roles add error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()], components: [] })
    }
  }

  // -------------------------------------------------------------------------
  // remove
  // -------------------------------------------------------------------------
  private async handleRemove(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const bindings = await prisma.serverRoleBinding.findMany({
      where: { guildId: interaction.guildId! },
    })

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
      const bindingId = si.values[0]
      await si.deferUpdate()

      await prisma.serverRoleBinding.delete({ where: { id: bindingId } })

      return interaction.editReply({
        embeds:     [successEmbed('Binding Removed', 'The role binding has been removed successfully.')],
        components: [],
      })
    } catch {
      return interaction.editReply({
        embeds:     [infoEmbed(`${e('warning')} Timed Out`, 'No selection made. Run `/roles remove` again.')],
        components: [],
      })
    }
  }

  // -------------------------------------------------------------------------
  // members
  // -------------------------------------------------------------------------
  private async handleMembers(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const bindings = await prisma.serverRoleBinding.findMany({
      where: { guildId: interaction.guildId! },
    })

    if (bindings.length === 0) {
      return interaction.editReply({
        embeds: [infoEmbed(`${e('crown')} Role Members`, 'No role bindings configured yet. Use `/roles add` to set them up.')],
      })
    }

    const lines: string[] = []
    for (const binding of bindings) {
      const role   = interaction.guild?.roles.cache.get(binding.discordRoleId)
      const count  = role?.members.size ?? 0
      const appLbl = APP_ROLE_LABELS[AppRole[binding.appRole as keyof typeof AppRole]] ?? binding.appRole
      lines.push(`<@&${binding.discordRoleId}> (${appLbl}) — **${count}** member(s)`)
    }

    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle(`${e('crown')} Members by Role`)
      .setDescription(lines.join('\n'))

    return interaction.editReply({ embeds: [embed] })
  }
}
