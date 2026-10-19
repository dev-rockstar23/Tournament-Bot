import { Command } from '@sapphire/framework'
import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ChatInputCommandInteraction,
} from 'discord.js'
import prisma from '@esports/database'
import { successEmbed, errorEmbed, genericErrorEmbed, notFoundEmbed } from '../utils/responses'
import { ShadowEmbed } from '../utils/embed-builder'
import { e } from '../utils/emojis'

export class RegisterCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'register',
      description: 'Register for a tournament.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('register')
        .setDescription('Register for a tournament.')
        .addStringOption(opt =>
          opt
            .setName('tournament')
            .setDescription('Tournament ID')
            .setRequired(true),
        ),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const tournamentId = interaction.options.getString('tournament', true)
    const guildId = interaction.guildId!
    const userId = interaction.user.id

    // Fetch tournament info before showing modal
    const tournament = await prisma.tournament.findFirst({
      where: { id: tournamentId, guildId },
      select: {
        id: true,
        name: true,
        game: true,
        status: true,
        teamCapacity: true,
        acceptedCount: true,
        autoApprove: true,
        registrationFormat: true,
        rosterMin: true,
        rosterMax: true,
        waitlistEnabled: true,
      },
    })

    if (!tournament) {
      return interaction.reply({ embeds: [notFoundEmbed('tournament')], ephemeral: true })
    }

    if (tournament.status !== 'REGISTRATION_OPEN') {
      return interaction.reply({
        embeds: [errorEmbed(`Registration is not currently open for **${tournament.name}** (status: **${tournament.status}**).`)],
        ephemeral: true,
      })
    }

    // Build and show registration modal
    const modal = new ModalBuilder()
      .setCustomId(`register_modal:${tournamentId}`)
      .setTitle(`Register — ${tournament.name}`)

    const teamNameInput = new TextInputBuilder()
      .setCustomId('reg_teamname')
      .setLabel('Team Name')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(80)
      .setPlaceholder('Enter your team name')

    const inGameNamesInput = new TextInputBuilder()
      .setCustomId('reg_igns')
      .setLabel('In-Game Names (one per line)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setPlaceholder(
        `Enter each player's in-game name on a new line (min ${tournament.rosterMin}, max ${tournament.rosterMax} players)`,
      )

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(teamNameInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inGameNamesInput),
    )

    await interaction.showModal(modal)

    try {
      const modalSubmit = await interaction.awaitModalSubmit({
        filter: i => i.customId === `register_modal:${tournamentId}` && i.user.id === userId,
        time: 300_000,
      })

      await modalSubmit.deferReply({ ephemeral: true })

      const teamName = modalSubmit.fields.getTextInputValue('reg_teamname').trim()
      const rawIgNs = modalSubmit.fields.getTextInputValue('reg_igns')
      const igns = rawIgNs
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)

      if (igns.length < tournament.rosterMin || igns.length > tournament.rosterMax) {
        return modalSubmit.editReply({
          embeds: [
            errorEmbed(
              `Roster must have ${tournament.rosterMin}–${tournament.rosterMax} players. You entered ${igns.length}.`,
            ),
          ],
        })
      }

      // Look up or create the DB user
      const dbUser = await prisma.user.findFirst({
        where: { discordId: userId },
        select: { id: true },
      })

      if (!dbUser) {
        return modalSubmit.editReply({
          embeds: [errorEmbed('Your user profile was not found. Please ensure you have joined the platform first.')],
        })
      }

      // Find or create the team for this captain in this guild
      let team = await prisma.team.findFirst({
        where: { guildId, captainId: dbUser.id },
        select: { id: true },
      })

      if (!team) {
        team = await prisma.team.create({
          data: { guildId, name: teamName, captainId: dbUser.id },
          select: { id: true },
        })
      } else {
        // Update team name if different
        await prisma.team.update({
          where: { id: team.id },
          data: { name: teamName },
        })
      }

      // Check for existing registration
      const existing = await prisma.registration.findFirst({
        where: { tournamentId, teamId: team.id },
        select: { id: true, status: true },
      })

      if (existing) {
        return modalSubmit.editReply({
          embeds: [errorEmbed(`Your team is already registered for **${tournament.name}** (status: **${existing.status}**).`)],
        })
      }

      // Atomic slot reservation
      let registration: { id: string; status: string; slotNumber: number | null }
      try {
        registration = await prisma.$transaction(async tx => {
          const rows = await tx.$queryRaw<
            Array<{
              id: string
              team_capacity: number
              accepted_count: number
              auto_approve: boolean
              waitlist_enabled: boolean
              status: string
            }>
          >`SELECT id, team_capacity, accepted_count, auto_approve, waitlist_enabled, status FROM tournaments WHERE id = ${tournamentId} AND guild_id = ${guildId} FOR UPDATE`

          const row = rows[0]
          if (!row) throw Object.assign(new Error('not_found'), { code: 'not_found' })
          if (row.status !== 'REGISTRATION_OPEN') throw Object.assign(new Error('not_open'), { code: 'not_open' })

          const { team_capacity, accepted_count, auto_approve, waitlist_enabled } = row

          let regStatus: 'APPROVED' | 'PENDING' | 'WAITLISTED'
          let slotNumber: number | null = null
          let outboxType: string

          if (accepted_count < team_capacity) {
            if (auto_approve) {
              regStatus = 'APPROVED'
              slotNumber = accepted_count + 1
              outboxType = 'REGISTRATION_AUTO_APPROVED'
              await tx.tournament.update({
                where: { id: tournamentId },
                data: { acceptedCount: { increment: 1 } },
              })
            } else {
              regStatus = 'PENDING'
              outboxType = 'REGISTRATION_SUBMITTED'
            }
          } else if (waitlist_enabled) {
            regStatus = 'WAITLISTED'
            outboxType = 'REGISTRATION_WAITLISTED'
          } else {
            throw Object.assign(new Error('slots_full'), { code: 'slots_full' })
          }

          const reg = await tx.registration.create({
            data: {
              tournamentId,
              guildId,
              teamId: team!.id,
              status: regStatus,
              slotNumber,
              submittedRaw: JSON.stringify({ teamName, igns }),
            },
            select: { id: true, status: true, slotNumber: true },
          })

          await tx.outboxEvent.create({
            data: {
              guildId,
              type: outboxType,
              payloadJson: { tournamentId, registrationId: reg.id, teamId: team!.id },
              status: 'PENDING',
            },
          })

          return reg
        })
      } catch (txErr: unknown) {
        const code = (txErr as { code?: string }).code
        if (code === 'slots_full') {
          return modalSubmit.editReply({ embeds: [errorEmbed('Tournament is full and the waitlist is disabled.')] })
        }
        if (code === 'not_open') {
          return modalSubmit.editReply({ embeds: [errorEmbed('Registration is no longer open for this tournament.')] })
        }
        throw txErr
      }

      const isAutoApproved = registration.status === 'APPROVED'
      const isWaitlisted = registration.status === 'WAITLISTED'

      let replyEmbed
      if (isAutoApproved) {
        replyEmbed = new ShadowEmbed()
          .setKind('success')
          .setTitle(e('success'), 'registered', tournament.name)
          .setDescription(
            `Your team **${teamName}** has been approved for **${tournament.name}**.\nSlot **#${registration.slotNumber}** is confirmed!`,
          )
          .setFooter()
          .setTimestamp()
          .build()
      } else if (isWaitlisted) {
        replyEmbed = new ShadowEmbed()
          .setKind('info')
          .setTitle(e('waitlist'), 'waitlisted', tournament.name)
          .setDescription(
            `Your team **${teamName}** has been added to the waitlist for **${tournament.name}**.\nYou'll be notified if a slot opens up.`,
          )
          .setFooter()
          .setTimestamp()
          .build()
      } else {
        replyEmbed = new ShadowEmbed()
          .setKind('info')
          .setTitle(e('pending'), 'registration submitted', tournament.name)
          .setDescription(
            `Your team **${teamName}** has been registered for **${tournament.name}**.\nWaiting for admin approval.`,
          )
          .setFooter()
          .setTimestamp()
          .build()
      }

      return modalSubmit.editReply({ embeds: [replyEmbed] })

    } catch (err: unknown) {
      this.container.logger.error(`register error: ${err}`)
      // Modal likely timed out — no-op
    }
  }
}
