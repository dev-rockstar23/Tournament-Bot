import { Command } from '@sapphire/framework'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js'
import prisma from '@esports/database'
import { AppRole, roleAtLeast, resolveUserRole } from '@esports/permissions'
import {
  notFoundEmbed,
  genericErrorEmbed,
  permissionDeniedEmbed,
  brandFooter,
  noResultsEmbed,
} from '../../utils/responses'

const BRAND_COLOR = 0x7c3aed
const PAGE_SIZE = 5

export class TournamentParticipantsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'participants',
      description: 'View registered participants for a tournament.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('participants')
        .setDescription('View and manage participants for a tournament.')
        .addStringOption(opt =>
          opt
            .setName('id')
            .setDescription('Tournament ID')
            .setRequired(true),
        ),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const guildId = interaction.guildId!
    const id = interaction.options.getString('id', true)

    // Check REFEREE+ permission
    const userRole = await resolveUserRole({
      prisma,
      userId: interaction.user.id,
      guildId,
      botToken: process.env.DISCORD_BOT_TOKEN!,
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
        where: { tournamentId: id, guildId },
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
      let page = 0

      const buildPage = (p: number) => {
        const slice = registrations.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE)

        const embed = new EmbedBuilder()
          .setColor(BRAND_COLOR)
          .setTitle(`👥 Participants — ${tournament.name} (${p + 1}/${totalPages})`)
          .setTimestamp()

        const rows = slice.map((r, idx) => {
          const statusEmoji = statusEmoji_(r.status)
          const tag = r.team.tag ? ` [${r.team.tag}]` : ''
          const slot = r.slotNumber ? ` • Slot #${r.slotNumber}` : ''
          const memberCount = r._count.members
          return `${statusEmoji} **${r.team.name}${tag}**${slot} — ${memberCount} member(s)\n> ID: \`${r.id}\``
        })

        embed.setDescription(rows.join('\n\n'))
        brandFooter(embed, 'Legendary Esports')

        // Build approve/reject buttons for PENDING registrations on this page
        const buttons: ButtonBuilder[] = []
        slice.forEach(r => {
          if (r.status === 'PENDING') {
            buttons.push(
              new ButtonBuilder()
                .setCustomId(`reg:approve:${r.id}`)
                .setLabel(`✅ Approve ${r.team.name}`)
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(`reg:reject:${r.id}`)
                .setLabel(`❌ Reject ${r.team.name}`)
                .setStyle(ButtonStyle.Danger),
            )
          }
        })

        const components: ActionRowBuilder<ButtonBuilder>[] = []

        // Pagination row
        const prev = new ButtonBuilder()
          .setCustomId('part_prev')
          .setLabel('◀ Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(p === 0)
        const next = new ButtonBuilder()
          .setCustomId('part_next')
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(p >= totalPages - 1)
        components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(prev, next))

        // Up to 5 action buttons per row (max 5 rows total in Discord)
        for (let i = 0; i < buttons.length && i < 8 && components.length < 5; i += 4) {
          components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons.slice(i, i + 4)))
        }

        return { embeds: [embed], components }
      }

      const msg = await interaction.editReply(buildPage(page))

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i => i.user.id === interaction.user.id,
        time: 180_000,
      })

      collector.on('collect', async i => {
        if (i.customId === 'part_prev' && page > 0) {
          page--
          await i.update(buildPage(page))
          return
        }
        if (i.customId === 'part_next' && page < totalPages - 1) {
          page++
          await i.update(buildPage(page))
          return
        }

        // Approve/reject buttons
        if (i.customId.startsWith('reg:approve:') || i.customId.startsWith('reg:reject:')) {
          const [, action, registrationId] = i.customId.split(':')
          await i.deferUpdate()

          try {
            const registration = await prisma.registration.findFirst({
              where: { id: registrationId, guildId },
              include: {
                tournament: { select: { id: true, teamCapacity: true, acceptedCount: true } },
              },
            })

            if (!registration) {
              await interaction.followUp({ content: '⚠️ Registration not found.', ephemeral: true })
              return
            }

            if (action === 'approve') {
              // Inline approval logic (same as web API route)
              await prisma.$transaction(async tx => {
                const rows = await tx.$queryRaw<
                  Array<{ id: string; team_capacity: number; accepted_count: number }>
                >`SELECT id, team_capacity, accepted_count FROM tournaments WHERE id = ${registration.tournament.id} AND guild_id = ${guildId} FOR UPDATE`

                const row = rows[0]
                if (!row) throw new Error('Tournament not found')
                if (row.accepted_count >= row.team_capacity) {
                  throw Object.assign(new Error('slots_full'), { code: 'slots_full' })
                }

                const slotNumber = row.accepted_count + 1

                await tx.registration.update({
                  where: { id: registrationId },
                  data: {
                    status: 'APPROVED',
                    slotNumber,
                    approvedBy: interaction.user.id,
                    approvedAt: new Date(),
                  },
                })

                await tx.tournament.update({
                  where: { id: registration.tournament.id },
                  data: { acceptedCount: { increment: 1 } },
                })

                await tx.auditLog.create({
                  data: {
                    guildId,
                    actorId: interaction.user.id,
                    action: 'REGISTRATION_APPROVED',
                    targetType: 'Registration',
                    targetId: registrationId,
                  },
                })

                await tx.outboxEvent.create({
                  data: {
                    guildId,
                    type: 'REGISTRATION_APPROVED',
                    payloadJson: { registrationId, teamId: registration.teamId },
                    status: 'PENDING',
                  },
                })
              })

              await interaction.followUp({ content: `✅ Registration **${registrationId}** approved.`, ephemeral: true })
            } else {
              // Reject
              await prisma.$transaction(async tx => {
                await tx.registration.update({
                  where: { id: registrationId },
                  data: {
                    status: 'REJECTED',
                    rejectedBy: interaction.user.id,
                    rejectedAt: new Date(),
                  },
                })

                await tx.auditLog.create({
                  data: {
                    guildId,
                    actorId: interaction.user.id,
                    action: 'REGISTRATION_REJECTED',
                    targetType: 'Registration',
                    targetId: registrationId,
                  },
                })

                await tx.outboxEvent.create({
                  data: {
                    guildId,
                    type: 'REGISTRATION_REJECTED',
                    payloadJson: { registrationId, teamId: registration.teamId },
                    status: 'PENDING',
                  },
                })
              })

              await interaction.followUp({ content: `❌ Registration **${registrationId}** rejected.`, ephemeral: true })
            }

            // Refresh the registration list and re-render
            const updated = await prisma.registration.findMany({
              where: { tournamentId: id, guildId },
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
            // Patch the local array in place
            registrations.splice(0, registrations.length, ...updated)
            await interaction.editReply(buildPage(page))
          } catch (err: unknown) {
            const e = err as { code?: string }
            if (e.code === 'slots_full') {
              await interaction.followUp({ content: '⚠️ Tournament is full — no slots available.', ephemeral: true })
            } else {
              await interaction.followUp({ content: '⚠️ Something went wrong. Please try again.', ephemeral: true })
            }
          }
        }
      })

      collector.on('end', async () => {
        const { embeds, components } = buildPage(page)
        components.forEach(row => row.components.forEach(c => (c as ButtonBuilder).setDisabled(true)))
        await interaction.editReply({ embeds, components }).catch(() => null)
      })
    } catch (err) {
      this.container.logger.error(`tournament participants error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }
}

function statusEmoji_(status: string): string {
  const map: Record<string, string> = {
    PENDING: '🕐',
    APPROVED: '✅',
    REJECTED: '❌',
    DISQUALIFIED: '🚫',
    WAITLISTED: '📋',
  }
  return map[status] ?? '•'
}
