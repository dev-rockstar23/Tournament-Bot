import { Command } from '@sapphire/framework'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ChatInputCommandInteraction,
  type TextChannel,
} from 'discord.js'
import prisma from '@esports/database'
import { AppRole, resolveUserRole, roleAtLeast } from '@esports/permissions'
import {
  assertTournamentTransition,
  delayTournament,
  MaxDelayExceededError,
  InvalidDelayError,
  InvalidTransitionError,
} from '@esports/tournament-engine'
import { computeTournamentStandings } from '@esports/scoring'
import {
  successEmbed,
  errorEmbed,
  notFoundEmbed,
  genericErrorEmbed,
  permissionDeniedEmbed,
  legendaryTournamentEmbed,
  legendaryStandingsEmbed,
  slotMatrixEmbed,
  noResultsEmbed,
  infoEmbed,
} from '../utils/responses'
import { ShadowEmbed } from '../utils/embed-builder'
import { WEB_BASE } from '../utils/constants'
import { discordTs, countdown, formatINR } from '../utils/time'
import { e } from '../utils/emojis'

const PAGE_SIZE = 8

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Build a paginated component row with prev/next buttons. */
function paginationRow(page: number, totalPages: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('t_prev')
      .setLabel('◀ Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId('t_next')
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1),
  )
}

// ─── Command ─────────────────────────────────────────────────────────────────

export class TournamentCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'tournament',
      description: 'Manage tournaments for this server.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('tournament')
        .setDescription('Manage tournaments for this server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        // ── create ──────────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('create')
            .setDescription('Launch the tournament creation wizard (modal).'),
        )
        // ── edit ────────────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('edit')
            .setDescription('Edit a tournament via the dashboard or quick-edit modal.')
            .addStringOption(opt =>
              opt.setName('id').setDescription('Tournament ID').setRequired(true),
            ),
        )
        // ── publish ─────────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('publish')
            .setDescription('Publish a DRAFT tournament and open registration.')
            .addStringOption(opt =>
              opt.setName('id').setDescription('Tournament ID').setRequired(true),
            ),
        )
        // ── cancel ──────────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('cancel')
            .setDescription('Cancel a tournament.')
            .addStringOption(opt =>
              opt.setName('id').setDescription('Tournament ID').setRequired(true),
            )
            .addStringOption(opt =>
              opt
                .setName('reason')
                .setDescription('Reason for cancellation')
                .setRequired(false),
            ),
        )
        // ── delete ──────────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('delete')
            .setDescription('Soft-delete a DRAFT tournament.')
            .addStringOption(opt =>
              opt.setName('id').setDescription('Tournament ID').setRequired(true),
            ),
        )
        // ── list ────────────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('list')
            .setDescription('List tournaments for this server.')
            .addStringOption(opt =>
              opt
                .setName('game')
                .setDescription('Filter by game')
                .setRequired(false)
                .addChoices(
                  { name: 'BGMI',       value: 'BGMI'       },
                  { name: 'Free Fire',  value: 'FREE_FIRE'  },
                  { name: 'COD Mobile', value: 'COD_MOBILE' },
                ),
            )
            .addStringOption(opt =>
              opt
                .setName('status')
                .setDescription('Filter by status')
                .setRequired(false)
                .addChoices(
                  { name: 'Draft',               value: 'DRAFT'               },
                  { name: 'Registration Open',   value: 'REGISTRATION_OPEN'   },
                  { name: 'Registration Closed', value: 'REGISTRATION_CLOSED' },
                  { name: 'Check-in',            value: 'CHECK_IN'            },
                  { name: 'Live',                value: 'LIVE'                },
                  { name: 'Completed',           value: 'COMPLETED'           },
                  { name: 'Cancelled',           value: 'CANCELLED'           },
                ),
            )
            .addIntegerOption(opt =>
              opt.setName('page').setDescription('Page number').setRequired(false).setMinValue(1),
            ),
        )
        // ── info ────────────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('info')
            .setDescription('View detailed info about a tournament.')
            .addStringOption(opt =>
              opt.setName('id').setDescription('Tournament ID').setRequired(true),
            ),
        )
        // ── participants ────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('participants')
            .setDescription('View participants for a tournament.')
            .addStringOption(opt =>
              opt.setName('id').setDescription('Tournament ID').setRequired(true),
            )
            .addStringOption(opt =>
              opt
                .setName('status')
                .setDescription('Filter by registration status')
                .setRequired(false)
                .addChoices(
                  { name: 'Pending',    value: 'PENDING'    },
                  { name: 'Approved',   value: 'APPROVED'   },
                  { name: 'Waitlisted', value: 'WAITLISTED' },
                ),
            )
            .addIntegerOption(opt =>
              opt.setName('page').setDescription('Page number').setRequired(false).setMinValue(1),
            ),
        )
        // ── standings ───────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('standings')
            .setDescription('View live standings for a tournament.')
            .addStringOption(opt =>
              opt.setName('id').setDescription('Tournament ID').setRequired(true),
            ),
        )
        // ── delay ───────────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('delay')
            .setDescription('Delay a tournament and re-open registration.')
            .addStringOption(opt =>
              opt.setName('id').setDescription('Tournament ID').setRequired(true),
            )
            .addStringOption(opt =>
              opt.setName('reason').setDescription('Reason for delay').setRequired(true),
            )
            .addIntegerOption(opt =>
              opt
                .setName('delay_hours')
                .setDescription('Hours to delay (1–72)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(72),
            ),
        )
        // ── reopen ──────────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('reopen')
            .setDescription('Re-open a cancelled or completed tournament for registration.')
            .addStringOption(opt =>
              opt.setName('id').setDescription('Tournament ID').setRequired(true),
            )
            .addStringOption(opt =>
              opt
                .setName('new_deadline')
                .setDescription('New registration close datetime (ISO 8601)')
                .setRequired(false),
            )
            .addIntegerOption(opt =>
              opt
                .setName('additional_slots')
                .setDescription('Extra team slots to add')
                .setRequired(false)
                .setMinValue(1),
            ),
        )
        // ── extend ──────────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('extend')
            .setDescription('Extend a DRAFT tournament timeline by N days.')
            .addStringOption(opt =>
              opt.setName('id').setDescription('Tournament ID').setRequired(true),
            )
            .addIntegerOption(opt =>
              opt
                .setName('days')
                .setDescription('Days to extend (1–30)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(30),
            ),
        )
        // ── slots ───────────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('slots')
            .setDescription('View the slot matrix for a tournament.')
            .addStringOption(opt =>
              opt.setName('id').setDescription('Tournament ID').setRequired(true),
            ),
        )
        // ── finalize ────────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('finalize')
            .setDescription('Finalize a LIVE tournament — lock results and record winners.')
            .addStringOption(opt =>
              opt.setName('id').setDescription('Tournament ID').setRequired(true),
            ),
        )
        // ── archive ─────────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('archive')
            .setDescription('Archive a COMPLETED tournament.')
            .addStringOption(opt =>
              opt.setName('id').setDescription('Tournament ID').setRequired(true),
            ),
        ),
    )
  }

  // ─── Dispatch ─────────────────────────────────────────────────────────────

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand()
    switch (sub) {
      case 'create':       return this.handleCreate(interaction)
      case 'edit':         return this.handleEdit(interaction)
      case 'publish':      return this.handlePublish(interaction)
      case 'cancel':       return this.handleCancel(interaction)
      case 'delete':       return this.handleDelete(interaction)
      case 'list':         return this.handleList(interaction)
      case 'info':         return this.handleInfo(interaction)
      case 'participants': return this.handleParticipants(interaction)
      case 'standings':    return this.handleStandings(interaction)
      case 'delay':        return this.handleDelay(interaction)
      case 'reopen':       return this.handleReopen(interaction)
      case 'extend':       return this.handleExtend(interaction)
      case 'slots':        return this.handleSlots(interaction)
      case 'finalize':     return this.handleFinalize(interaction)
      case 'archive':      return this.handleArchive(interaction)
      default:
        return interaction.reply({ embeds: [errorEmbed('Unknown subcommand.')], ephemeral: true })
    }
  }

  // ─── handleCreate ─────────────────────────────────────────────────────────

  private async handleCreate(interaction: ChatInputCommandInteraction) {
    const modal = new ModalBuilder()
      .setCustomId('tcreate_modal')
      .setTitle('Create Tournament')

    const nameInput = new TextInputBuilder()
      .setCustomId('tcreate_name')
      .setLabel('Tournament Name')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100)
      .setPlaceholder('e.g. Season 5 BGMI Championship')

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput))
    await interaction.showModal(modal)

    let tournamentName = ''
    try {
      const modalSubmit = await interaction.awaitModalSubmit({
        filter: i => i.customId === 'tcreate_modal' && i.user.id === interaction.user.id,
        time: 120_000,
      })
      tournamentName = modalSubmit.fields.getTextInputValue('tcreate_name').trim()
      await modalSubmit.deferReply({ ephemeral: true })

      // Game selection menu
      const gameMenu = new StringSelectMenuBuilder()
        .setCustomId('tcreate_game')
        .setPlaceholder('Select the game…')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel('BGMI').setValue('BGMI').setEmoji('🎮'),
          new StringSelectMenuOptionBuilder().setLabel('Free Fire').setValue('FREE_FIRE').setEmoji('🔥'),
          new StringSelectMenuOptionBuilder().setLabel('COD Mobile').setValue('COD_MOBILE').setEmoji('🎯'),
        )

      const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(gameMenu)
      const msg = await modalSubmit.editReply({
        embeds: [infoEmbed('🎮 Select Game', `Select the game for **${tournamentName}**:`)],
        components: [menuRow],
      })

      let selectedGame = ''
      try {
        const sel = await msg.awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          filter: i => i.customId === 'tcreate_game' && i.user.id === interaction.user.id,
          time: 60_000,
        })
        selectedGame = sel.values[0] ?? 'BGMI'
        await sel.deferUpdate()
      } catch {
        await modalSubmit.editReply({
          embeds: [infoEmbed('⚠️ Timed Out', 'No game selected. Run `/tournament create` again.')],
          components: [],
        })
        return
      }

      const guildId = interaction.guildId!
      try {
        const tournament = await prisma.tournament.create({
          data: {
            guildId,
            name: tournamentName,
            game: selectedGame as 'BGMI' | 'FREE_FIRE' | 'COD_MOBILE',
            mode: 'BATTLE_ROYALE',
            status: 'DRAFT',
            teamCapacity: 16,
          },
        })

        const dashBtn = new ButtonBuilder()
          .setLabel('Open Dashboard')
          .setStyle(ButtonStyle.Link)
          .setURL(`${WEB_BASE}/servers/${guildId}/tournaments/${tournament.id}`)
          .setEmoji('🌐')

        await modalSubmit.editReply({
          embeds: [legendaryTournamentEmbed({ ...tournament, acceptedCount: 0 })],
          components: [new ActionRowBuilder<ButtonBuilder>().addComponents(dashBtn)],
        })
      } catch (err) {
        this.container.logger.error(`tournament create DB error: ${err}`)
        await modalSubmit.editReply({ embeds: [genericErrorEmbed()], components: [] })
      }
    } catch {
      // Modal timed out — no interaction to reply to
    }
  }

  // ─── handleEdit ───────────────────────────────────────────────────────────

  private async handleEdit(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const id      = interaction.options.getString('id', true)
    const guildId = interaction.guildId!

    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id, guildId },
        select: { id: true, name: true, status: true, teamCapacity: true },
      })

      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      const dashBtn = new ButtonBuilder()
        .setLabel('Edit on Dashboard')
        .setStyle(ButtonStyle.Link)
        .setURL(`${WEB_BASE}/servers/${guildId}/tournaments/${id}/edit`)
        .setEmoji('✏️')

      const embed = new ShadowEmbed()
        .setKind('info')
        .setTitle('✏️', 'edit tournament', tournament.name)
        .setDescription(
          tournament.status === 'DRAFT'
            ? `You can quick-edit this DRAFT tournament below, or visit the dashboard for full editing.`
            : `This tournament is **${tournament.status}** and can only be edited via the dashboard.`,
        )
        .addField('Tournament ID', `\`${tournament.id}\``, true)
        .addField('Status', tournament.status, true)
        .setFooter()
        .build()

      if (tournament.status !== 'DRAFT') {
        return interaction.editReply({
          embeds: [embed],
          components: [new ActionRowBuilder<ButtonBuilder>().addComponents(dashBtn)],
        })
      }

      // Quick-edit modal for DRAFT tournaments
      const quickEditBtn = new ButtonBuilder()
        .setCustomId('tedit_quick')
        .setLabel('Quick Edit')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('✏️')

      const msg = await interaction.editReply({
        embeds: [embed],
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(quickEditBtn, dashBtn),
        ],
      })

      let clicked = false
      try {
        const btn = await msg.awaitMessageComponent({
          componentType: ComponentType.Button,
          filter: i => i.customId === 'tedit_quick' && i.user.id === interaction.user.id,
          time: 30_000,
        })
        clicked = true

        const qModal = new ModalBuilder()
          .setCustomId('tedit_modal')
          .setTitle('Quick Edit Tournament')

        qModal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('tedit_name')
              .setLabel('Tournament Name')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setValue(tournament.name)
              .setMaxLength(100),
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('tedit_capacity')
              .setLabel('Team Capacity')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setValue(String(tournament.teamCapacity)),
          ),
        )

        await btn.showModal(qModal)

        const ms = await btn.awaitModalSubmit({
          filter: i => i.customId === 'tedit_modal' && i.user.id === interaction.user.id,
          time: 120_000,
        })

        const newName     = ms.fields.getTextInputValue('tedit_name').trim()
        const newCapacity = parseInt(ms.fields.getTextInputValue('tedit_capacity'), 10)

        if (!newName || isNaN(newCapacity) || newCapacity < 2) {
          await ms.reply({ embeds: [errorEmbed('Invalid input. Name must not be empty and capacity must be ≥ 2.')], ephemeral: true })
          return
        }

        await prisma.tournament.update({
          where: { id },
          data: { name: newName, teamCapacity: newCapacity },
        })

        await prisma.auditLog.create({
          data: {
            guildId,
            actorId: interaction.user.id,
            action: 'TOURNAMENT_EDITED',
            targetType: 'TOURNAMENT',
            targetId: id,
          },
        })

        await ms.reply({
          embeds: [successEmbed('Tournament Updated', `**${newName}** has been updated.\nCapacity: **${newCapacity}**`)],
          ephemeral: true,
        })
      } catch {
        if (!clicked) {
          // Button collector timed out — nothing to do
        }
      }
    } catch (err) {
      this.container.logger.error(`tournament edit error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ─── handlePublish ────────────────────────────────────────────────────────

  private async handlePublish(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const id      = interaction.options.getString('id', true)
    const guildId = interaction.guildId!

    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id, guildId },
      })

      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      if (tournament.status !== 'DRAFT') {
        return interaction.editReply({
          embeds: [errorEmbed(`Only DRAFT tournaments can be published. Current status: **${tournament.status}**`)],
        })
      }

      assertTournamentTransition('DRAFT', 'REGISTRATION_OPEN')

      const now = new Date()
      const updated = await prisma.$transaction(async tx => {
        const t = await tx.tournament.update({
          where: { id },
          data: {
            status: 'REGISTRATION_OPEN',
            registrationOpenAt: now,
          },
        })

        await tx.outboxEvent.create({
          data: {
            guildId,
            type: 'TOURNAMENT_PUBLISHED',
            payloadJson: { tournamentId: id },
            status: 'PENDING',
          },
        })

        await tx.auditLog.create({
          data: {
            guildId,
            actorId: interaction.user.id,
            action: 'TOURNAMENT_PUBLISHED',
            targetType: 'TOURNAMENT',
            targetId: id,
          },
        })

        return t
      })

      const dashBtn = new ButtonBuilder()
        .setLabel('View Dashboard')
        .setStyle(ButtonStyle.Link)
        .setURL(`${WEB_BASE}/servers/${guildId}/tournaments/${id}`)
        .setEmoji('🌐')

      return interaction.editReply({
        embeds: [legendaryTournamentEmbed({ ...updated, acceptedCount: updated.acceptedCount })],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(dashBtn)],
      })
    } catch (err) {
      if (err instanceof InvalidTransitionError) {
        return interaction.editReply({ embeds: [errorEmbed(err.message)] })
      }
      this.container.logger.error(`tournament publish error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ─── handleCancel ─────────────────────────────────────────────────────────

  private async handleCancel(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const id      = interaction.options.getString('id', true)
    const reason  = interaction.options.getString('reason') ?? undefined
    const guildId = interaction.guildId!

    // Require TOURNAMENT_MANAGER+
    const userRole = await resolveUserRole({
      prisma,
      userId: interaction.user.id,
      guildId,
      botToken: process.env['DISCORD_BOT_TOKEN']!,
    })

    if (!roleAtLeast(userRole, AppRole.TOURNAMENT_MANAGER)) {
      return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
    }

    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id, guildId },
      })

      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      assertTournamentTransition(tournament.status, 'CANCELLED')

      const now = new Date()
      await prisma.$transaction(async tx => {
        await tx.tournament.update({
          where: { id },
          data: { status: 'CANCELLED', cancelledAt: now },
        })

        await tx.outboxEvent.create({
          data: {
            guildId,
            type: 'TOURNAMENT_CANCELLED',
            payloadJson: { tournamentId: id, reason: reason ?? null },
            status: 'PENDING',
          },
        })

        await tx.auditLog.create({
          data: {
            guildId,
            actorId: interaction.user.id,
            action: 'TOURNAMENT_CANCELLED',
            targetType: 'TOURNAMENT',
            targetId: id,
            reason: reason,
          },
        })
      })

      return interaction.editReply({
        embeds: [
          successEmbed(
            'Tournament Cancelled',
            [
              `**${tournament.name}** has been cancelled.`,
              reason ? `\n**Reason:** ${reason}` : '',
            ].join(''),
          ),
        ],
      })
    } catch (err) {
      if (err instanceof InvalidTransitionError) {
        return interaction.editReply({ embeds: [errorEmbed(err.message)] })
      }
      this.container.logger.error(`tournament cancel error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ─── handleDelete ─────────────────────────────────────────────────────────

  private async handleDelete(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const id      = interaction.options.getString('id', true)
    const guildId = interaction.guildId!

    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id, guildId },
        select: { id: true, name: true, status: true },
      })

      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      if (tournament.status !== 'DRAFT') {
        return interaction.editReply({
          embeds: [errorEmbed('Only DRAFT tournaments can be deleted.')],
        })
      }

      const now = new Date()
      await prisma.$transaction(async tx => {
        await tx.tournament.update({
          where: { id },
          data: { status: 'CANCELLED', cancelledAt: now },
        })

        await tx.auditLog.create({
          data: {
            guildId,
            actorId: interaction.user.id,
            action: 'TOURNAMENT_DELETED',
            targetType: 'TOURNAMENT',
            targetId: id,
            reason: 'Draft deleted by admin.',
          },
        })
      })

      return interaction.editReply({
        embeds: [successEmbed('Tournament Deleted', `**${tournament.name}** has been deleted.`)],
      })
    } catch (err) {
      this.container.logger.error(`tournament delete error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ─── handleList ───────────────────────────────────────────────────────────

  private async handleList(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const guildId      = interaction.guildId!
    const gameFilter   = interaction.options.getString('game')
    const statusFilter = interaction.options.getString('status')
    const startPage    = Math.max(0, (interaction.options.getInteger('page') ?? 1) - 1)

    const where: Record<string, unknown> = {
      guildId,
      ...(gameFilter ? { game: gameFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : { status: { not: 'ARCHIVED' } }),
    }

    try {
      const tournaments = await prisma.tournament.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          name: true,
          game: true,
          status: true,
          teamCapacity: true,
          acceptedCount: true,
          startAt: true,
          endAt: true,
          registrationOpenAt: true,
          registrationCloseAt: true,
          bannerUrl: true,
          description: true,
          entryPrice: true,
          mode: true,
          registrationFormat: true,
        },
      })

      if (tournaments.length === 0) {
        return interaction.editReply({ embeds: [noResultsEmbed()] })
      }

      const totalPages = Math.ceil(tournaments.length / PAGE_SIZE)
      let page         = Math.min(startPage, totalPages - 1)

      const buildPage = (p: number) => {
        const slice = tournaments.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE)
        const rows  = slice.map(t => {
          const icon  = statusIcon(String(t.status))
          const start = t.startAt ? discordTs(t.startAt, 'F') : '—'
          return `${icon} **${t.name}** \`${t.id}\`\n> ${String(t.game).replace(/_/g, ' ')} • ${t.acceptedCount}/${t.teamCapacity} teams • Starts: ${start}`
        })

        const embed = new ShadowEmbed()
          .setKind('tournament')
          .setTitle(e('trophy'), 'tournaments', `Page ${p + 1}/${totalPages}`)
          .setDescription(rows.join('\n\n'))
          .setFooter()
          .setTimestamp()
          .build()

        return {
          embeds: [embed],
          components: totalPages > 1 ? [paginationRow(p, totalPages)] : [],
        }
      }

      const msg = await interaction.editReply(buildPage(page))

      if (totalPages <= 1) return

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i =>
          (i.customId === 't_prev' || i.customId === 't_next') &&
          i.user.id === interaction.user.id,
        time: 120_000,
      })

      collector.on('collect', async i => {
        if (i.customId === 't_prev' && page > 0) page--
        else if (i.customId === 't_next' && page < totalPages - 1) page++
        await i.update(buildPage(page))
      })

      collector.on('end', async () => {
        const { embeds, components } = buildPage(page)
        components.forEach(row =>
          row.components.forEach(btn => (btn as ButtonBuilder).setDisabled(true)),
        )
        await interaction.editReply({ embeds, components }).catch(() => null)
      })
    } catch (err) {
      this.container.logger.error(`tournament list error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ─── handleInfo ───────────────────────────────────────────────────────────

  private async handleInfo(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: false })

    const id      = interaction.options.getString('id', true)
    const guildId = interaction.guildId!

    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id, guildId },
        include: {
          _count: { select: { registrations: true, stages: true } },
        },
      })

      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      const embed = legendaryTournamentEmbed({
        id:                   tournament.id,
        name:                 tournament.name,
        game:                 tournament.game,
        status:               tournament.status,
        teamCapacity:         tournament.teamCapacity,
        acceptedCount:        tournament.acceptedCount,
        startAt:              tournament.startAt,
        endAt:                tournament.endAt,
        registrationOpenAt:   tournament.registrationOpenAt,
        registrationCloseAt:  tournament.registrationCloseAt,
        bannerUrl:            tournament.bannerUrl,
        description:          tournament.description,
        entryPrice:           tournament.entryPrice ? formatINR(tournament.entryPrice) : null,
        mode:                 tournament.mode,
        registrationFormat:   tournament.registrationFormat,
      })

      // Add extra fields
      embed.addFields(
        { name: 'Registrations', value: String(tournament._count.registrations), inline: true },
        { name: 'Stages',        value: String(tournament._count.stages),        inline: true },
      )

      if (tournament.entryPrice) {
        embed.addFields({ name: 'Entry Fee', value: formatINR(tournament.entryPrice), inline: true })
      }

      const registerBtn = new ButtonBuilder()
        .setLabel('Register')
        .setStyle(ButtonStyle.Link)
        .setURL(`${WEB_BASE}/servers/${guildId}/tournaments/${id}/register`)
        .setEmoji('✍️')

      const dashBtn = new ButtonBuilder()
        .setLabel('Dashboard')
        .setStyle(ButtonStyle.Link)
        .setURL(`${WEB_BASE}/servers/${guildId}/tournaments/${id}`)
        .setEmoji('🌐')

      return interaction.editReply({
        embeds: [embed],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(registerBtn, dashBtn)],
      })
    } catch (err) {
      this.container.logger.error(`tournament info error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ─── handleParticipants ───────────────────────────────────────────────────

  private async handleParticipants(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const id           = interaction.options.getString('id', true)
    const statusFilter = interaction.options.getString('status')
    const startPage    = Math.max(0, (interaction.options.getInteger('page') ?? 1) - 1)
    const guildId      = interaction.guildId!

    // Require REFEREE+
    const userRole = await resolveUserRole({
      prisma,
      userId: interaction.user.id,
      guildId,
      botToken: process.env['DISCORD_BOT_TOKEN']!,
    })

    if (!roleAtLeast(userRole, AppRole.REFEREE)) {
      return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
    }

    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id, guildId },
        select: { id: true, name: true },
      })

      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      const registrations = await prisma.registration.findMany({
        where: {
          tournamentId: id,
          guildId,
          ...(statusFilter ? { status: statusFilter as 'PENDING' | 'APPROVED' | 'WAITLISTED' } : {}),
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          status: true,
          slotNumber: true,
          createdAt: true,
          team: { select: { name: true, tag: true } },
          _count: { select: { members: true } },
        },
      })

      if (registrations.length === 0) {
        return interaction.editReply({ embeds: [noResultsEmbed()] })
      }

      const totalPages = Math.ceil(registrations.length / PAGE_SIZE)
      let page         = Math.min(startPage, totalPages - 1)

      const buildPage = (p: number) => {
        const slice = registrations.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE)

        const rows = slice.map(r => {
          const icon  = regStatusIcon(r.status)
          const tag   = r.team.tag ? ` [${r.team.tag}]` : ''
          const slot  = r.slotNumber ? ` • Slot #${r.slotNumber}` : ''
          return `${icon} **${r.team.name}${tag}**${slot} — ${r._count.members} member(s)\n> \`${r.id}\``
        })

        const embed = new ShadowEmbed()
          .setKind('tournament')
          .setTitle(e('users'), 'participants', `${tournament.name} (${p + 1}/${totalPages})`)
          .setDescription(rows.join('\n\n'))
          .setFooter()
          .setTimestamp()
          .build()

        return { embeds: [embed], components: totalPages > 1 ? [paginationRow(p, totalPages)] : [] }
      }

      const msg = await interaction.editReply(buildPage(page))

      if (totalPages <= 1) return

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i =>
          (i.customId === 't_prev' || i.customId === 't_next') &&
          i.user.id === interaction.user.id,
        time: 120_000,
      })

      collector.on('collect', async i => {
        if (i.customId === 't_prev' && page > 0) page--
        else if (i.customId === 't_next' && page < totalPages - 1) page++
        await i.update(buildPage(page))
      })

      collector.on('end', async () => {
        const { embeds, components } = buildPage(page)
        components.forEach(row =>
          row.components.forEach(btn => (btn as ButtonBuilder).setDisabled(true)),
        )
        await interaction.editReply({ embeds, components }).catch(() => null)
      })
    } catch (err) {
      this.container.logger.error(`tournament participants error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ─── handleStandings ──────────────────────────────────────────────────────

  private async handleStandings(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: false })

    const id      = interaction.options.getString('id', true)
    const guildId = interaction.guildId!

    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id, guildId },
        select: { id: true, name: true },
      })

      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      const rawStandings = await computeTournamentStandings(prisma, id, guildId)

      if (rawStandings.length === 0) {
        return interaction.editReply({
          embeds: [noResultsEmbed()],
        })
      }

      // Join team names
      const teamIds  = rawStandings.map(s => s.teamId)
      const teams    = await prisma.team.findMany({
        where: { id: { in: teamIds } },
        select: { id: true, name: true },
      })
      const nameMap  = new Map(teams.map(t => [t.id, t.name]))

      const standings = rawStandings.map(s => ({
        rank:     s.rank,
        teamName: nameMap.get(s.teamId) ?? s.teamId,
        points:   s.totalPoints,
        kills:    s.totalKills,
      }))

      const dashBtn = new ButtonBuilder()
        .setLabel('Full PT on Dashboard')
        .setStyle(ButtonStyle.Link)
        .setURL(`${WEB_BASE}/servers/${guildId}/tournaments/${id}/standings`)
        .setEmoji('🔗')

      return interaction.editReply({
        embeds: [legendaryStandingsEmbed(tournament.name, standings)],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(dashBtn)],
      })
    } catch (err) {
      this.container.logger.error(`tournament standings error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ─── handleDelay ──────────────────────────────────────────────────────────

  private async handleDelay(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const id          = interaction.options.getString('id', true)
    const reason      = interaction.options.getString('reason', true)
    const delayHours  = interaction.options.getInteger('delay_hours', true)
    const guildId     = interaction.guildId!

    // Require TOURNAMENT_MANAGER+
    const userRole = await resolveUserRole({
      prisma,
      userId: interaction.user.id,
      guildId,
      botToken: process.env['DISCORD_BOT_TOKEN']!,
    })

    if (!roleAtLeast(userRole, AppRole.TOURNAMENT_MANAGER)) {
      return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
    }

    const delayDays = Math.max(1, Math.ceil(delayHours / 24))

    try {
      await delayTournament(id, delayDays, interaction.user.id)

      // Fetch updated tournament for display
      const updated = await prisma.tournament.findFirst({
        where: { id, guildId },
        select: { name: true, startAt: true, registrationCloseAt: true },
      })

      // Post announcement to announcement channel if configured
      const settings = await prisma.serverSettings.findUnique({ where: { guildId } })
      if (settings?.announcementChannelId) {
        try {
          const channel = await interaction.client.channels.fetch(settings.announcementChannelId)
          if (channel?.isTextBased()) {
            const annEmbed = new ShadowEmbed()
              .setKind('warning')
              .setTitle('⚠️', 'tournament delayed', updated?.name ?? id)
              .setDescription(
                [
                  `This tournament has been delayed by **${delayDays} day(s)**.`,
                  `**Reason:** ${reason}`,
                  updated?.startAt
                    ? `\n**New Start:** ${discordTs(updated.startAt, 'F')} (${countdown(updated.startAt)})`
                    : '',
                  updated?.registrationCloseAt
                    ? `**Reg. Closes:** ${discordTs(updated.registrationCloseAt, 'F')}`
                    : '',
                ]
                  .filter(Boolean)
                  .join('\n'),
              )
              .setFooter()
              .setTimestamp()
              .build()

            await (channel as TextChannel).send({ embeds: [annEmbed] })
          }
        } catch {
          // Announcement failure is non-fatal
        }
      }

      return interaction.editReply({
        embeds: [
          successEmbed(
            'Tournament Delayed',
            [
              `**${updated?.name ?? id}** delayed by **${delayDays} day(s)**.`,
              `**Reason:** ${reason}`,
              updated?.startAt
                ? `\n**New Start:** ${discordTs(updated.startAt, 'F')} (${countdown(updated.startAt)})`
                : '',
              updated?.registrationCloseAt
                ? `**Reg. Closes:** ${discordTs(updated.registrationCloseAt, 'F')}`
                : '',
            ]
              .filter(Boolean)
              .join('\n'),
          ),
        ],
      })
    } catch (err) {
      if (err instanceof MaxDelayExceededError || err instanceof InvalidDelayError) {
        return interaction.editReply({ embeds: [errorEmbed(err.message)] })
      }
      this.container.logger.error(`tournament delay error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ─── handleReopen ─────────────────────────────────────────────────────────

  private async handleReopen(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const id               = interaction.options.getString('id', true)
    const newDeadlineStr   = interaction.options.getString('new_deadline')
    const additionalSlots  = interaction.options.getInteger('additional_slots')
    const guildId          = interaction.guildId!

    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id, guildId },
      })

      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      if (tournament.status !== 'CANCELLED' && tournament.status !== 'COMPLETED') {
        return interaction.editReply({
          embeds: [errorEmbed(`Only CANCELLED or COMPLETED tournaments can be reopened. Current status: **${tournament.status}**`)],
        })
      }

      let parsedDeadline: Date | null = null
      if (newDeadlineStr) {
        parsedDeadline = new Date(newDeadlineStr)
        if (isNaN(parsedDeadline.getTime())) {
          return interaction.editReply({
            embeds: [errorEmbed('Invalid `new_deadline` format. Please use ISO 8601, e.g. `2025-12-31T18:00:00Z`.')],
          })
        }
      }

      const now = new Date()
      await prisma.$transaction(async tx => {
        await tx.tournament.update({
          where: { id },
          data: {
            status: 'REGISTRATION_OPEN',
            registrationPhase: 'REOPENED',
            registrationOpenAt: now,
            ...(parsedDeadline ? { registrationCloseAt: parsedDeadline } : {}),
            ...(additionalSlots ? { teamCapacity: { increment: additionalSlots } } : {}),
          },
        })

        await tx.outboxEvent.create({
          data: {
            guildId,
            type: 'TOURNAMENT_REOPENED',
            payloadJson: { tournamentId: id },
            status: 'PENDING',
          },
        })

        await tx.auditLog.create({
          data: {
            guildId,
            actorId: interaction.user.id,
            action: 'TOURNAMENT_REOPENED',
            targetType: 'TOURNAMENT',
            targetId: id,
          },
        })
      })

      return interaction.editReply({
        embeds: [
          successEmbed(
            'Tournament Reopened',
            [
              `**${tournament.name}** is now open for registration again.`,
              parsedDeadline ? `\n**New Deadline:** ${discordTs(parsedDeadline, 'F')}` : '',
              additionalSlots ? `**Additional Slots:** +${additionalSlots}` : '',
            ]
              .filter(Boolean)
              .join('\n'),
          ),
        ],
      })
    } catch (err) {
      this.container.logger.error(`tournament reopen error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ─── handleExtend ─────────────────────────────────────────────────────────

  private async handleExtend(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const id      = interaction.options.getString('id', true)
    const days    = interaction.options.getInteger('days', true)
    const guildId = interaction.guildId!

    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id, guildId },
      })

      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      if (tournament.status !== 'DRAFT') {
        return interaction.editReply({
          embeds: [errorEmbed(`Only DRAFT tournaments can be extended. Current status: **${tournament.status}**`)],
        })
      }

      const settings = await prisma.serverSettings.findUnique({ where: { guildId } })
      const maxDelay  = settings?.maxDelayDays ?? 90

      if (tournament.extensionCount >= maxDelay) {
        return interaction.editReply({
          embeds: [errorEmbed(`Maximum extension limit (${maxDelay}) reached for this tournament.`)],
        })
      }

      const shiftMs = days * 24 * 60 * 60 * 1000

      const newStartAt           = tournament.startAt           ? new Date(tournament.startAt.getTime() + shiftMs)           : null
      const newEndAt             = tournament.endAt             ? new Date(tournament.endAt.getTime() + shiftMs)             : null
      const newRegistrationClose = tournament.registrationCloseAt ? new Date(tournament.registrationCloseAt.getTime() + shiftMs) : null

      await prisma.$transaction(async tx => {
        await tx.tournament.update({
          where: { id },
          data: {
            extensionCount: { increment: 1 },
            ...(newStartAt           ? { startAt: newStartAt }                     : {}),
            ...(newEndAt             ? { endAt: newEndAt }                         : {}),
            ...(newRegistrationClose ? { registrationCloseAt: newRegistrationClose } : {}),
          },
        })

        await tx.auditLog.create({
          data: {
            guildId,
            actorId: interaction.user.id,
            action: 'TOURNAMENT_EXTENDED',
            targetType: 'TOURNAMENT',
            targetId: id,
            reason: `Extended by ${days} day(s).`,
          },
        })
      })

      return interaction.editReply({
        embeds: [
          successEmbed(
            'Tournament Extended',
            [
              `**${tournament.name}** extended by **${days} day(s)**.`,
              newStartAt           ? `\n**New Start:** ${discordTs(newStartAt, 'F')}`           : '',
              newRegistrationClose ? `**Reg. Closes:** ${discordTs(newRegistrationClose, 'F')}` : '',
            ]
              .filter(Boolean)
              .join('\n'),
          ),
        ],
      })
    } catch (err) {
      this.container.logger.error(`tournament extend error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ─── handleSlots ──────────────────────────────────────────────────────────

  private async handleSlots(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const id      = interaction.options.getString('id', true)
    const guildId = interaction.guildId!

    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id, guildId },
        select: { id: true, name: true, teamCapacity: true, acceptedCount: true },
      })

      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      const registrations = await prisma.registration.findMany({
        where: { tournamentId: id, guildId },
        orderBy: { slotNumber: 'asc' },
        select: {
          slotNumber: true,
          status: true,
          team: { select: { name: true } },
        },
      })

      const slotRows = registrations.map((r, idx) => ({
        slot:     r.slotNumber ?? idx + 1,
        teamName: r.team.name,
        status:   r.status,
      }))

      return interaction.editReply({
        embeds: [slotMatrixEmbed({ ...tournament }, slotRows)],
      })
    } catch (err) {
      this.container.logger.error(`tournament slots error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ─── handleFinalize ───────────────────────────────────────────────────────

  private async handleFinalize(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const id      = interaction.options.getString('id', true)
    const guildId = interaction.guildId!

    // Require TOURNAMENT_MANAGER+
    const userRole = await resolveUserRole({
      prisma,
      userId: interaction.user.id,
      guildId,
      botToken: process.env['DISCORD_BOT_TOKEN']!,
    })

    if (!roleAtLeast(userRole, AppRole.TOURNAMENT_MANAGER)) {
      return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
    }

    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id, guildId },
        include: { stages: { include: { matches: true } } },
      })

      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      if (tournament.status !== 'LIVE') {
        return interaction.editReply({
          embeds: [errorEmbed(`Only LIVE tournaments can be finalized. Current status: **${tournament.status}**`)],
        })
      }

      // Validate all matches are COMPLETED
      const allMatches     = tournament.stages.flatMap(s => s.matches)
      const incompleteCount = allMatches.filter(m => m.status !== 'COMPLETED' && m.status !== 'CANCELLED').length

      if (incompleteCount > 0) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              `Cannot finalize: **${incompleteCount}** match(es) are not yet completed. Resolve all matches before finalizing.`,
            ),
          ],
        })
      }

      // Compute standings
      const rawStandings = await computeTournamentStandings(prisma, id, guildId)

      if (rawStandings.length === 0) {
        return interaction.editReply({
          embeds: [errorEmbed('No scoring data found. Cannot finalize without match results.')],
        })
      }

      const teamIds = rawStandings.map(s => s.teamId)
      const teams   = await prisma.team.findMany({
        where: { id: { in: teamIds } },
        select: { id: true, name: true },
      })
      const nameMap = new Map(teams.map(t => [t.id, t.name]))

      const standings = rawStandings.map(s => ({
        rank:     s.rank,
        teamName: nameMap.get(s.teamId) ?? s.teamId,
        teamId:   s.teamId,
        points:   s.totalPoints,
        kills:    s.totalKills,
      }))

      const now = new Date()

      await prisma.$transaction(async tx => {
        // Create WinnerRecord rows for top 3
        const placements: Array<{ rank: number; awardType: 'CHAMPION' | 'RUNNER_UP' | 'THIRD_PLACE' }> = [
          { rank: 1, awardType: 'CHAMPION'    },
          { rank: 2, awardType: 'RUNNER_UP'   },
          { rank: 3, awardType: 'THIRD_PLACE' },
        ]

        for (const { rank, awardType } of placements) {
          const entry = standings.find(s => s.rank === rank)
          if (!entry) continue

          const team = teams.find(t => t.id === entry.teamId)
          await tx.winnerRecord.create({
            data: {
              tournamentId:   id,
              teamId:         entry.teamId,
              placement:      rank,
              awardType,
              rosterSnapshot: team ? { teamId: team.id, name: team.name } : {},
            },
          })
        }

        // Update tournament
        await tx.tournament.update({
          where: { id },
          data: {
            status:        'COMPLETED',
            completedAt:   now,
            resultsLocked: true,
          },
        })

        await tx.outboxEvent.create({
          data: {
            guildId,
            type:        'TOURNAMENT_FINALIZED',
            payloadJson: { tournamentId: id },
            status:      'PENDING',
          },
        })

        await tx.auditLog.create({
          data: {
            guildId,
            actorId:    interaction.user.id,
            action:     'TOURNAMENT_FINALIZED',
            targetType: 'TOURNAMENT',
            targetId:   id,
          },
        })
      })

      return interaction.editReply({
        embeds: [legendaryStandingsEmbed(tournament.name, standings)],
      })
    } catch (err) {
      this.container.logger.error(`tournament finalize error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ─── handleArchive ────────────────────────────────────────────────────────

  private async handleArchive(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const id      = interaction.options.getString('id', true)
    const guildId = interaction.guildId!

    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id, guildId },
        select: { id: true, name: true, status: true },
      })

      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      if (tournament.status !== 'COMPLETED') {
        return interaction.editReply({
          embeds: [errorEmbed(`Only COMPLETED tournaments can be archived. Current status: **${tournament.status}**`)],
        })
      }

      assertTournamentTransition('COMPLETED', 'ARCHIVED')

      const now = new Date()
      await prisma.$transaction(async tx => {
        await tx.tournament.update({
          where: { id },
          data: { status: 'ARCHIVED', archivedAt: now },
        })

        await tx.auditLog.create({
          data: {
            guildId,
            actorId:    interaction.user.id,
            action:     'TOURNAMENT_ARCHIVED',
            targetType: 'TOURNAMENT',
            targetId:   id,
          },
        })
      })

      return interaction.editReply({
        embeds: [
          successEmbed('Tournament Archived', `**${tournament.name}** has been archived successfully.`),
        ],
      })
    } catch (err) {
      if (err instanceof InvalidTransitionError) {
        return interaction.editReply({ embeds: [errorEmbed(err.message)] })
      }
      this.container.logger.error(`tournament archive error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }
}

// ─── Module-level helpers ─────────────────────────────────────────────────────

function statusIcon(status: string): string {
  const map: Record<string, string> = {
    DRAFT:               '📝',
    REGISTRATION_OPEN:   '✍️',
    REGISTRATION_CLOSED: '🕐',
    CHECK_IN:            '☑️',
    LIVE:                '🔴',
    COMPLETED:           '✅',
    CANCELLED:           '❌',
    ARCHIVED:            '📦',
  }
  return map[status] ?? '•'
}

function regStatusIcon(status: string): string {
  const map: Record<string, string> = {
    PENDING:      '🟡',
    APPROVED:     '✅',
    REJECTED:     '❌',
    DISQUALIFIED: '🚫',
    WAITLISTED:   '📋',
  }
  return map[status] ?? '•'
}
