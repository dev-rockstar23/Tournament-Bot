import { Command } from '@sapphire/framework'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from 'discord.js'
import prisma from '@esports/database'
import { AppRole, resolveUserRole, roleAtLeast } from '@esports/permissions'
import {
  genericErrorEmbed,
  notFoundEmbed,
  successEmbed,
  comingPhase4Embed,
  permissionDeniedEmbed,
} from '../utils/responses'
import { ShadowEmbed } from '../utils/embed-builder'
import { e } from '../utils/emojis'
import { formatINR, gameLabel } from '../utils/time'
import { WEB_BASE } from '../utils/constants'

const GAME_CHOICES = [
  { name: 'BGMI',       value: 'BGMI'       },
  { name: 'Free Fire',  value: 'FREE_FIRE'  },
  { name: 'COD Mobile', value: 'COD_MOBILE' },
] as const

export class PtCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'pt',
      description: 'Prize template (PT) store and licensing.',
      preconditions: ['GuildOnly', 'TournamentManagerOrAdmin'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('pt')
        .setDescription('Prize template (PT) store and licensing.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        // store — browse active PT designs
        .addSubcommand(sub =>
          sub
            .setName('store')
            .setDescription('Browse available prize template designs.')
            .addStringOption(opt =>
              opt
                .setName('game')
                .setDescription('Filter by game (optional)')
                .setRequired(false)
                .addChoices(...GAME_CHOICES),
            ),
        )
        // view — current PT license for a tournament
        .addSubcommand(sub =>
          sub
            .setName('view')
            .setDescription("View a tournament's current prize template license.")
            .addStringOption(opt =>
              opt.setName('tournament').setDescription('Tournament ID').setRequired(true),
            ),
        )
        // setup — configure PT design + license for tournament
        .addSubcommand(sub =>
          sub
            .setName('setup')
            .setDescription('Set up a prize template design for a tournament.')
            .addStringOption(opt =>
              opt.setName('tournament').setDescription('Tournament ID').setRequired(true),
            )
            .addStringOption(opt =>
              opt.setName('design').setDescription('Design name').setRequired(true),
            )
            .addNumberOption(opt =>
              opt.setName('price').setDescription('Price in INR (optional)').setRequired(false),
            ),
        )
        // assign — bind a design to a tournament
        .addSubcommand(sub =>
          sub
            .setName('assign')
            .setDescription('Assign a PT design to a tournament.')
            .addStringOption(opt =>
              opt.setName('tournament').setDescription('Tournament ID').setRequired(true),
            )
            .addStringOption(opt =>
              opt.setName('design').setDescription('Design name').setRequired(true),
            ),
        )
        // buy — start purchase flow
        .addSubcommand(sub =>
          sub
            .setName('buy')
            .setDescription('Purchase a PT design license.')
            .addStringOption(opt =>
              opt.setName('design').setDescription('Design name').setRequired(true),
            ),
        )
        // verify — admin mark license active / order paid
        .addSubcommand(sub =>
          sub
            .setName('verify')
            .setDescription('Verify and activate a PT license (admin).')
            .addStringOption(opt =>
              opt.setName('tournament').setDescription('Tournament ID').setRequired(true),
            )
            .addStringOption(opt =>
              opt.setName('order').setDescription('Order ID (optional)').setRequired(false),
            ),
        )
        // licenses — list licenses for tournament
        .addSubcommand(sub =>
          sub
            .setName('licenses')
            .setDescription('List all PT licenses for a tournament.')
            .addStringOption(opt =>
              opt.setName('tournament').setDescription('Tournament ID').setRequired(true),
            ),
        )
        // revoke — revoke a license
        .addSubcommand(sub =>
          sub
            .setName('revoke')
            .setDescription('Revoke a PT license.')
            .addStringOption(opt =>
              opt.setName('tournament').setDescription('Tournament ID').setRequired(true),
            )
            .addStringOption(opt =>
              opt.setName('reason').setDescription('Reason for revocation').setRequired(true),
            ),
        )
        // preview — STUBBED Phase 4
        .addSubcommand(sub =>
          sub
            .setName('preview')
            .setDescription('Preview a generated prize template (Phase 4).')
            .addStringOption(opt =>
              opt.setName('tournament').setDescription('Tournament ID').setRequired(true),
            ),
        )
        // generate — STUBBED Phase 4
        .addSubcommand(sub =>
          sub
            .setName('generate')
            .setDescription('Generate prize template images (Phase 4).')
            .addStringOption(opt =>
              opt.setName('tournament').setDescription('Tournament ID').setRequired(true),
            ),
        )
        // update — refresh PT design metadata
        .addSubcommand(sub =>
          sub
            .setName('update')
            .setDescription('Refresh prize template metadata for a tournament.')
            .addStringOption(opt =>
              opt.setName('tournament').setDescription('Tournament ID').setRequired(true),
            ),
        )
        // post — STUBBED Phase 4
        .addSubcommand(sub =>
          sub
            .setName('post')
            .setDescription('Post prize template to channels (Phase 4).')
            .addStringOption(opt =>
              opt.setName('tournament').setDescription('Tournament ID').setRequired(true),
            ),
        ),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand(true)
    switch (sub) {
      case 'store':    return this.handleStore(interaction)
      case 'view':     return this.handleView(interaction)
      case 'setup':    return this.handleSetup(interaction)
      case 'assign':   return this.handleAssign(interaction)
      case 'buy':      return this.handleBuy(interaction)
      case 'verify':   return this.handleVerify(interaction)
      case 'licenses': return this.handleLicenses(interaction)
      case 'revoke':   return this.handleRevoke(interaction)
      case 'update':   return this.handleUpdate(interaction)
      // Phase 4 stubs
      case 'preview':  return this.handlePreview(interaction)
      case 'generate': return this.handleGenerate(interaction)
      case 'post':     return this.handlePost(interaction)
    }
  }

  // ---------------------------------------------------------------------------
  // handleStore — list active PT designs
  // ---------------------------------------------------------------------------
  private async handleStore(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: false })

    const guildId = interaction.guildId!
    const game = interaction.options.getString('game', false) as string | null

    try {
      const gameFilter = game ? { game: game as 'BGMI' | 'FREE_FIRE' | 'COD_MOBILE' } : {}

      const designs = await prisma.ptDesign.findMany({
        where: { guildId, isActive: true, ...gameFilter },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })

      if (designs.length === 0) {
        const empty = new ShadowEmbed()
          .setKind('info')
          .setTitle(e('store'), 'PT Store')
          .setDescription('No active prize template designs found.')
          .setFooter()
          .build()
        return interaction.editReply({ embeds: [empty] })
      }

      const embed = new ShadowEmbed()
        .setKind('tournament')
        .setTitle(e('store'), 'PT Store', game ? gameLabel(game) : 'All Games')
        .setFooter()
        .setTimestamp()

      for (const d of designs) {
        const priceStr = d.price ? formatINR(d.price) : 'Free'
        const preview = d.previewUrl ? `[Preview](${d.previewUrl})` : 'No preview'
        embed.addField(
          `${e('design')} ${d.name}`,
          `${e('money')} **${priceStr}** • ${gameLabel(d.game)} • By **${d.designerName}**\n${preview}`,
          false,
        )
      }

      const buttons: ButtonBuilder[] = []
      for (const d of designs.slice(0, 3)) {
        if (d.previewUrl) {
          buttons.push(
            new ButtonBuilder()
              .setLabel(`Preview: ${d.name}`)
              .setStyle(ButtonStyle.Link)
              .setURL(d.previewUrl),
          )
        }
        const unlockPrice = d.price ? formatINR(d.price) : '₹299'
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`pt_buy:${d.id}`)
            .setLabel(`Unlock ${unlockPrice}`)
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔑'),
        )
      }

      const rows: ActionRowBuilder<ButtonBuilder>[] = []
      // Discord limits to 5 buttons per row, 5 rows max
      for (let i = 0; i < buttons.length; i += 5) {
        rows.push(
          new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons.slice(i, i + 5)),
        )
      }

      return interaction.editReply({
        embeds:     [embed.build()],
        components: rows.slice(0, 5),
      })
    } catch (err) {
      this.container.logger.error(`pt store error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ---------------------------------------------------------------------------
  // handleView — show tournament's PT license
  // ---------------------------------------------------------------------------
  private async handleView(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const tournamentId = interaction.options.getString('tournament', true)
    const guildId = interaction.guildId!

    try {
      const license = await prisma.ptLicense.findFirst({
        where: { tournamentId, guildId },
        include: {
          design:     true,
          tournament: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      if (!license) {
        return interaction.editReply({ embeds: [notFoundEmbed('PT license')] })
      }

      const d = license.design

      const embed = new ShadowEmbed()
        .setKind('info')
        .setTitle(e('licenseIcon'), 'PT License', license.tournament.name)
        .addInlineFields([
          { name: 'Design',   value: d.name          },
          { name: 'Game',     value: gameLabel(d.game) },
          { name: 'Status',   value: license.status   },
          { name: 'Price',    value: d.price ? formatINR(d.price) : 'Free' },
          { name: 'Designer', value: d.designerName   },
          { name: 'Granted By', value: license.grantedBy ?? '—' },
        ])
        .setFooter()
        .setTimestamp()
        .build()

      return interaction.editReply({ embeds: [embed] })
    } catch (err) {
      this.container.logger.error(`pt view error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ---------------------------------------------------------------------------
  // handleSetup — upsert PtDesign + create/activate PtLicense
  // ---------------------------------------------------------------------------
  private async handleSetup(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const tournamentId = interaction.options.getString('tournament', true)
    const designName   = interaction.options.getString('design', true)
    const price        = interaction.options.getNumber('price', false)
    const guildId      = interaction.guildId!
    const userId       = interaction.user.id

    try {
      const userRole = await resolveUserRole({
        prisma,
        userId,
        guildId,
        botToken: process.env['DISCORD_BOT_TOKEN']!,
      })
      if (!roleAtLeast(userRole, AppRole.TOURNAMENT_MANAGER)) {
        return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
      }

      const tournament = await prisma.tournament.findFirst({
        where: { id: tournamentId, guildId },
        select: { id: true, name: true, game: true },
      })
      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      // Upsert PtDesign for this guild + name
      const design = await prisma.ptDesign.upsert({
        where: {
          // We use a findFirst then create pattern since there's no unique on guild+name
          // Use id placeholder — real upsert on name+guild
          id: 'nonexistent',
        },
        update: {},
        create: {
          guildId,
          name:        designName,
          game:        tournament.game,
          designerName: interaction.user.username,
          price:       price ?? null,
          isActive:    true,
        },
      }).catch(async () => {
        // Fallback: find existing or create
        const existing = await prisma.ptDesign.findFirst({
          where: { guildId, name: designName },
        })
        if (existing) {
          return prisma.ptDesign.update({
            where: { id: existing.id },
            data:  { price: price ?? existing.price, isActive: true },
          })
        }
        return prisma.ptDesign.create({
          data: {
            guildId,
            name:        designName,
            game:        tournament.game,
            designerName: interaction.user.username,
            price:       price ?? null,
            isActive:    true,
          },
        })
      })

      // Create or update license for this tournament+design
      await prisma.ptLicense.upsert({
        where: {
          tournamentId_designId: { tournamentId, designId: design.id },
        },
        update: {
          status:    'ACTIVE',
          grantedBy: userId,
          grantedAt: new Date(),
        },
        create: {
          tournamentId,
          designId:  design.id,
          guildId,
          status:    'ACTIVE',
          grantedBy: userId,
          grantedAt: new Date(),
        },
      })

      // Audit log
      await prisma.auditLog.create({
        data: {
          guildId,
          actorId:    userId,
          action:     'PT_SETUP',
          targetType: 'tournament',
          targetId:   tournamentId,
          reason:     `Design: ${designName}`,
        },
      }).catch(() => { /* non-critical */ })

      return interaction.editReply({
        embeds: [successEmbed('PT Setup Complete', `Design **${designName}** has been configured and activated for **${tournament.name}**.`)],
      })
    } catch (err) {
      this.container.logger.error(`pt setup error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ---------------------------------------------------------------------------
  // handleAssign — set PtLicense ACTIVE for design+tournament
  // ---------------------------------------------------------------------------
  private async handleAssign(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const tournamentId = interaction.options.getString('tournament', true)
    const designName   = interaction.options.getString('design', true)
    const guildId      = interaction.guildId!
    const userId       = interaction.user.id

    try {
      const userRole = await resolveUserRole({
        prisma,
        userId,
        guildId,
        botToken: process.env['DISCORD_BOT_TOKEN']!,
      })
      if (!roleAtLeast(userRole, AppRole.TOURNAMENT_MANAGER)) {
        return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
      }

      const design = await prisma.ptDesign.findFirst({
        where: { guildId, name: designName },
      })
      if (!design) {
        return interaction.editReply({ embeds: [notFoundEmbed('PT design')] })
      }

      const tournament = await prisma.tournament.findFirst({
        where: { id: tournamentId, guildId },
        select: { id: true, name: true },
      })
      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      await prisma.ptLicense.upsert({
        where: {
          tournamentId_designId: { tournamentId, designId: design.id },
        },
        update: {
          status:    'ACTIVE',
          grantedBy: userId,
          grantedAt: new Date(),
        },
        create: {
          tournamentId,
          designId:  design.id,
          guildId,
          status:    'ACTIVE',
          grantedBy: userId,
          grantedAt: new Date(),
        },
      })

      await prisma.auditLog.create({
        data: {
          guildId,
          actorId:    userId,
          action:     'PT_ASSIGN',
          targetType: 'tournament',
          targetId:   tournamentId,
          reason:     `Design: ${designName}`,
        },
      }).catch(() => { /* non-critical */ })

      return interaction.editReply({
        embeds: [successEmbed('PT Assigned', `Design **${designName}** has been assigned to **${tournament.name}**.`)],
      })
    } catch (err) {
      this.container.logger.error(`pt assign error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ---------------------------------------------------------------------------
  // handleBuy — create Order + OutboxEvent for PT purchase
  // ---------------------------------------------------------------------------
  private async handleBuy(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const designName = interaction.options.getString('design', true)
    const guildId    = interaction.guildId!
    const userId     = interaction.user.id

    try {
      const design = await prisma.ptDesign.findFirst({
        where: { guildId, name: designName, isActive: true },
      })
      if (!design) {
        return interaction.editReply({ embeds: [notFoundEmbed('PT design')] })
      }

      // Create outbox event to initiate purchase flow
      const outbox = await prisma.outboxEvent.create({
        data: {
          guildId,
          type:        'PT_PURCHASE_INITIATED',
          payloadJson: { designId: design.id, designName, buyerId: userId },
          status:      'PENDING',
        },
      })

      const priceStr = design.price ? formatINR(design.price) : '₹299'
      const checkoutUrl = `${WEB_BASE}/pt/checkout/${outbox.id}`

      const embed = new ShadowEmbed()
        .setKind('info')
        .setTitle(e('cart'), 'PT Purchase', designName)
        .setDescription(
          `Your purchase of **${designName}** (${priceStr}) has been initiated.\nClick the button below to complete checkout.`,
        )
        .setFooter()
        .setTimestamp()
        .build()

      const checkoutBtn = new ButtonBuilder()
        .setLabel('Complete Checkout →')
        .setStyle(ButtonStyle.Link)
        .setURL(checkoutUrl)
        .setEmoji('🛒')

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(checkoutBtn)

      return interaction.editReply({ embeds: [embed], components: [row] })
    } catch (err) {
      this.container.logger.error(`pt buy error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ---------------------------------------------------------------------------
  // handleVerify — mark PtLicense ACTIVE / Order PAID
  // ---------------------------------------------------------------------------
  private async handleVerify(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const tournamentId = interaction.options.getString('tournament', true)
    const orderId      = interaction.options.getString('order', false)
    const guildId      = interaction.guildId!
    const userId       = interaction.user.id

    try {
      const userRole = await resolveUserRole({
        prisma,
        userId,
        guildId,
        botToken: process.env['DISCORD_BOT_TOKEN']!,
      })
      if (!roleAtLeast(userRole, AppRole.TOURNAMENT_MANAGER)) {
        return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
      }

      const license = await prisma.ptLicense.findFirst({
        where: { tournamentId, guildId },
        orderBy: { createdAt: 'desc' },
      })
      if (!license) {
        return interaction.editReply({ embeds: [notFoundEmbed('PT license')] })
      }

      await prisma.ptLicense.update({
        where: { id: license.id },
        data:  { status: 'ACTIVE', grantedBy: userId, grantedAt: new Date() },
      })

      if (orderId) {
        await prisma.outboxEvent.create({
          data: {
            guildId,
            type:        'PT_ORDER_PAID',
            payloadJson: { orderId, licenseId: license.id, tournamentId },
            status:      'PENDING',
          },
        })
      }

      await prisma.auditLog.create({
        data: {
          guildId,
          actorId:    userId,
          action:     'PT_VERIFY',
          targetType: 'pt_license',
          targetId:   license.id,
        },
      }).catch(() => { /* non-critical */ })

      return interaction.editReply({
        embeds: [successEmbed('PT Verified', `License for tournament \`${tournamentId}\` has been marked active.`)],
      })
    } catch (err) {
      this.container.logger.error(`pt verify error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ---------------------------------------------------------------------------
  // handleLicenses — list PtLicense rows for a tournament
  // ---------------------------------------------------------------------------
  private async handleLicenses(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const tournamentId = interaction.options.getString('tournament', true)
    const guildId      = interaction.guildId!

    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id: tournamentId, guildId },
        select: { id: true, name: true },
      })
      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      const licenses = await prisma.ptLicense.findMany({
        where: { tournamentId, guildId },
        include: { design: { select: { name: true, price: true } } },
        orderBy: { createdAt: 'desc' },
      })

      if (licenses.length === 0) {
        return interaction.editReply({
          embeds: [
            new ShadowEmbed()
              .setKind('info')
              .setTitle(e('licenseIcon'), 'PT Licenses', tournament.name)
              .setDescription('No licenses found for this tournament.')
              .setFooter()
              .build(),
          ],
        })
      }

      const rows = licenses.map((l, i) => {
        const price = l.design.price ? formatINR(l.design.price) : 'Free'
        return `**${i + 1}.** ${l.design.name} • **${l.status}** • ${price} • ID: \`${l.id}\``
      })

      const embed = new ShadowEmbed()
        .setKind('info')
        .setTitle(e('licenseIcon'), 'PT Licenses', tournament.name)
        .setDescription(rows.join('\n'))
        .setFooter()
        .setTimestamp()
        .build()

      return interaction.editReply({ embeds: [embed] })
    } catch (err) {
      this.container.logger.error(`pt licenses error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ---------------------------------------------------------------------------
  // handleRevoke — set PtLicense REVOKED
  // ---------------------------------------------------------------------------
  private async handleRevoke(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const tournamentId = interaction.options.getString('tournament', true)
    const reason       = interaction.options.getString('reason', true)
    const guildId      = interaction.guildId!
    const userId       = interaction.user.id

    try {
      const userRole = await resolveUserRole({
        prisma,
        userId,
        guildId,
        botToken: process.env['DISCORD_BOT_TOKEN']!,
      })
      if (!roleAtLeast(userRole, AppRole.TOURNAMENT_MANAGER)) {
        return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
      }

      const license = await prisma.ptLicense.findFirst({
        where: { tournamentId, guildId },
        orderBy: { createdAt: 'desc' },
      })
      if (!license) {
        return interaction.editReply({ embeds: [notFoundEmbed('PT license')] })
      }

      await prisma.ptLicense.update({
        where: { id: license.id },
        data: {
          status:        'REVOKED',
          revokedBy:     userId,
          revokedAt:     new Date(),
          revokedReason: reason,
        },
      })

      await prisma.auditLog.create({
        data: {
          guildId,
          actorId:    userId,
          action:     'PT_REVOKE',
          targetType: 'pt_license',
          targetId:   license.id,
          reason,
        },
      }).catch(() => { /* non-critical */ })

      return interaction.editReply({
        embeds: [successEmbed('PT License Revoked', `License \`${license.id}\` has been revoked.\nReason: ${reason}`)],
      })
    } catch (err) {
      this.container.logger.error(`pt revoke error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ---------------------------------------------------------------------------
  // handleUpdate — refresh PtDesign metadata for tournament
  // ---------------------------------------------------------------------------
  private async handleUpdate(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const tournamentId = interaction.options.getString('tournament', true)
    const guildId      = interaction.guildId!
    const userId       = interaction.user.id

    try {
      const userRole = await resolveUserRole({
        prisma,
        userId,
        guildId,
        botToken: process.env['DISCORD_BOT_TOKEN']!,
      })
      if (!roleAtLeast(userRole, AppRole.TOURNAMENT_MANAGER)) {
        return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
      }

      const license = await prisma.ptLicense.findFirst({
        where: { tournamentId, guildId },
        include: { design: true },
        orderBy: { createdAt: 'desc' },
      })
      if (!license) {
        return interaction.editReply({ embeds: [notFoundEmbed('PT license')] })
      }

      // Touch updatedAt on the design so any downstream caches know it changed
      await prisma.ptDesign.update({
        where: { id: license.designId },
        data:  { updatedAt: new Date() },
      })

      await prisma.auditLog.create({
        data: {
          guildId,
          actorId:    userId,
          action:     'PT_UPDATE',
          targetType: 'pt_design',
          targetId:   license.designId,
        },
      }).catch(() => { /* non-critical */ })

      return interaction.editReply({
        embeds: [successEmbed('PT Updated', `Prize template metadata for design **${license.design.name}** has been refreshed.`)],
      })
    } catch (err) {
      this.container.logger.error(`pt update error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 4 stubs
  // ---------------------------------------------------------------------------
  private async handlePreview(interaction: ChatInputCommandInteraction) {
    return interaction.reply({ embeds: [comingPhase4Embed('PT Preview')], ephemeral: true })
  }

  private async handleGenerate(interaction: ChatInputCommandInteraction) {
    return interaction.reply({ embeds: [comingPhase4Embed('PT Generate')], ephemeral: true })
  }

  private async handlePost(interaction: ChatInputCommandInteraction) {
    return interaction.reply({ embeds: [comingPhase4Embed('PT Post')], ephemeral: true })
  }
}
