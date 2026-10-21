/**
 * Channel-based registration system.
 *
 * Flow:
 * 1. Player posts their registration in the configured registrationChannelId
 * 2. Bot validates the message (mentions, roster size, duplicates)
 * 3. On valid: React ✅, save Registration to DB, post to approvedRegChannelId,
 *    assign to a group, send DMs to captain + all members
 * 4. On invalid: React ❌, reply with reason (auto-deleted after 20s)
 */

import { Listener, Events } from '@sapphire/framework'
import {
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  type Message,
  type TextChannel,
  type Guild,
} from 'discord.js'
import prisma from '@esports/database'

// Regex to extract Discord user mentions (<@123456789> or <@!123456789>)
const MENTION_RE = /<@!?(\d{17,20})>/g

// How long (ms) to keep rejection reason messages before auto-deleting
const REJECT_MESSAGE_TTL = 20_000

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Format a Date as IST string */
function toIST(date: Date | string | null): string {
  if (!date) return 'TBD'
  try {
    return new Date(date).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return String(date)
  }
}

/** Build a progress bar string: ██████░░░░ */
function progressBar(filled: number, total: number, width = 10): string {
  const pct = total > 0 ? Math.min(filled / total, 1) : 0
  const blocks = Math.round(pct * width)
  return '█'.repeat(blocks) + '░'.repeat(width - blocks)
}

/**
 * Post or edit the pinned group roster embed in the group's Discord channel.
 */
async function updateGroupRosterEmbed(
  guild: Guild,
  group: {
    id: string
    groupNumber: number
    maxTeams: number
    discordChannelId: string | null
    rosterMessageId: string | null
  },
  tournamentName: string,
  tournamentCode: string | null,
): Promise<void> {
  if (!group.discordChannelId) return

  try {
    const channel = await guild.channels.fetch(group.discordChannelId).catch(() => null)
    if (!channel || !channel.isTextBased()) return
    const textChannel = channel as TextChannel

    // Fetch all active assignments for this group with team data
    const assignments = await prisma.groupTeamAssignment.findMany({
      where: { groupId: group.id, isActive: true },
      include: {
        team: {
          include: {
            captain: { select: { discordId: true } },
            members: { include: { user: { select: { discordId: true } } } },
          },
        },
      },
      orderBy: { assignedAt: 'asc' },
    })

    const codeTag = tournamentCode ? ` (#${tournamentCode})` : ''
    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle(`📋 GROUP ${group.groupNumber} — ${tournamentName}${codeTag}`)
      .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      .setTimestamp()

    if (assignments.length === 0) {
      embed.addFields({ name: 'No Teams Yet', value: 'Waiting for registrations…' })
    } else {
      const teamLines = assignments.map((a, i) => {
        const captainMention = a.team.captain.discordId
          ? `<@${a.team.captain.discordId}>`
          : 'Unknown'
        const memberMentions = a.team.members
          .filter(m => m.user.discordId !== a.team.captain.discordId)
          .map(m => `<@${m.user.discordId}>`)
          .join(', ') || '—'
        return [
          `**${i + 1}. ${a.team.name}**`,
          `   👑 Captain: ${captainMention}`,
          `   👥 Members: ${memberMentions}`,
          `   🎮 Status: REGISTERED`,
        ].join('\n')
      })

      embed.addFields({
        name: `REGISTERED TEAMS (${assignments.length}/${group.maxTeams})`,
        value: teamLines.join('\n\n') || '—',
      })
    }

    const bar = progressBar(assignments.length, group.maxTeams)
    embed.setFooter({ text: `Slots filled: ${bar} ${assignments.length}/${group.maxTeams}` })

    // Try to edit existing pinned message, otherwise send new
    let posted = false
    if (group.rosterMessageId) {
      try {
        const existingMsg = await textChannel.messages.fetch(group.rosterMessageId)
        await existingMsg.edit({ embeds: [embed] })
        posted = true
      } catch {
        // Message may have been deleted; fall through to send new
      }
    }

    if (!posted) {
      const msg = await textChannel.send({ embeds: [embed] })
      await msg.pin().catch(() => null)
      // Store the new message id
      await prisma.tournamentGroup.update({
        where: { id: group.id },
        data: { rosterMessageId: msg.id },
      }).catch(() => null)
    }
  } catch (err) {
    // Non-fatal
    console.error('[RegistrationChannel] updateGroupRosterEmbed error:', err)
  }
}

/**
 * Assign a team to the next available group (or create one) for the tournament.
 * Returns the group number assigned, or null on failure.
 */
async function assignToGroup(
  guildId: string,
  tournamentId: string,
  registrationId: string,
  teamId: string,
  guild: Guild,
  tournamentName: string,
  tournamentCode: string | null,
): Promise<number | null> {
  try {
    // Find groups for qualifier stage (stageId IS NULL) that still have room
    const existingGroups = await prisma.tournamentGroup.findMany({
      where: { tournamentId, stageId: null, isLocked: false },
      include: { _count: { select: { assignments: { where: { isActive: true } } } } },
      orderBy: { groupNumber: 'asc' },
    })

    let targetGroup = existingGroups.find(g => g._count.assignments < g.maxTeams) ?? null

    if (!targetGroup) {
      // Need a new group
      const maxGroupNumber = existingGroups.length > 0
        ? Math.max(...existingGroups.map(g => g.groupNumber))
        : 0
      const newGroupNumber = maxGroupNumber + 1

      // Find or create category
      const categoryName = `${tournamentName} — Groups`
      let category = guild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && c.name === categoryName
      )
      if (!category) {
        category = await guild.channels.create({
          name: categoryName,
          type: ChannelType.GuildCategory,
        })
      }

      // Create the private text channel
      const newChannel = await guild.channels.create({
        name: `group-${newGroupNumber}`,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        ],
      })

      // Create the DB record
      const created = await prisma.tournamentGroup.create({
        data: {
          tournamentId,
          guildId,
          groupNumber: newGroupNumber,
          name: `Group ${newGroupNumber}`,
          discordChannelId: newChannel.id,
          discordCategoryId: category.id,
          maxTeams: 12,
        },
        include: { _count: { select: { assignments: { where: { isActive: true } } } } },
      })
      targetGroup = created

      // Add TOURNAMENT_MANAGER / SERVER_ADMIN role overrides
      const roleBindings = await prisma.serverRoleBinding.findMany({
        where: { guildId, appRole: { in: ['TOURNAMENT_MANAGER', 'SERVER_ADMIN'] } },
        select: { discordRoleId: true },
      })
      for (const binding of roleBindings) {
        await newChannel.permissionOverwrites.create(binding.discordRoleId, {
          ViewChannel: true,
          SendMessages: true,
          ManageMessages: true,
        }).catch(() => null)
      }
    }

    // Add team member permission overrides to the channel
    if (targetGroup.discordChannelId) {
      const channel = await guild.channels.fetch(targetGroup.discordChannelId).catch(() => null)
      if (channel && channel.isTextBased()) {
        const textChannel = channel as TextChannel
        const teamMembers = await prisma.teamMember.findMany({
          where: { teamId },
          include: { user: { select: { discordId: true } } },
        })
        for (const member of teamMembers) {
          if (member.user.discordId) {
            await textChannel.permissionOverwrites.create(member.user.discordId, {
              ViewChannel: true,
              SendMessages: true,
              ReadMessageHistory: true,
            }).catch(() => null)
          }
        }
        // Also add the captain (team captain may not always be in teamMember table)
        const team = await prisma.team.findUnique({
          where: { id: teamId },
          include: { captain: { select: { discordId: true } } },
        })
        if (team?.captain.discordId) {
          await textChannel.permissionOverwrites.create(team.captain.discordId, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
          }).catch(() => null)
        }
      }
    }

    // Create the assignment
    await prisma.groupTeamAssignment.create({
      data: { groupId: targetGroup.id, teamId, registrationId },
    })

    // Update the group roster embed
    await updateGroupRosterEmbed(guild, targetGroup, tournamentName, tournamentCode)

    return targetGroup.groupNumber
  } catch (err) {
    console.error('[RegistrationChannel] assignToGroup error:', err)
    return null
  }
}

// ── Listener ────────────────────────────────────────────────────────────────

export class RegistrationChannelListener extends Listener<typeof Events.MessageCreate> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.MessageCreate })
  }

  public async run(message: Message) {
    // Ignore bots and DMs
    if (message.author.bot) return
    if (!message.guild) return

    const guildId = message.guild.id

    // Find the active tournament for this guild (REGISTRATION_OPEN)
    const activeTournament = await prisma.tournament.findFirst({
      where: { guildId, status: 'REGISTRATION_OPEN' },
      select: {
        id: true,
        name: true,
        rosterMin: true,
        rosterMax: true,
        registrationChannelId: true,
        approvedRegChannelId: true,
        teamCapacity: true,
        acceptedCount: true,
        tournamentCode: true,
        game: true,
        startAt: true,
        registrationCloseAt: true,
        waitlistEnabled: true,
      },
      orderBy: { createdAt: 'desc' },
    }).catch(() => null)

    if (!activeTournament) return

    // Check if this message is in the tournament's registration channel
    if (!activeTournament.registrationChannelId) return
    if (message.channelId !== activeTournament.registrationChannelId) return

    // ── Parse the registration message ──────────────────────────────────────
    const content = message.content.trim()

    if (!content) {
      await this.reject(message, 'Registration message cannot be empty.')
      return
    }

    // Extract all @mentions
    const mentionMatches = [...content.matchAll(MENTION_RE)]
    const mentionedIds = mentionMatches.map(m => m[1]!)

    // Minimum 2, maximum 5 players
    if (mentionedIds.length < 2) {
      await this.reject(
        message,
        `**Too few players.** Minimum **2** Discord mentions required.\n` +
        `You mentioned ${mentionedIds.length} player(s).\n\n` +
        `Format example:\n\`\`\`\nTeam Name\n@Player1 @Player2 @Player3 @Player4\n\`\`\``,
      )
      return
    }

    if (mentionedIds.length > 5) {
      await this.reject(
        message,
        `**Too many players.** Maximum **5** Discord mentions allowed (4 starters + 1 sub).\n` +
        `You mentioned ${mentionedIds.length} players.`,
      )
      return
    }

    // Check for duplicate mentions in this message
    const unique = new Set(mentionedIds)
    if (unique.size !== mentionedIds.length) {
      const dupes = mentionedIds.filter((id, i) => mentionedIds.indexOf(id) !== i)
      const dupeMentions = [...new Set(dupes)].map(id => `<@${id}>`).join(', ')
      await this.reject(
        message,
        `**Duplicate players found.** Each player can only be listed once.\n` +
        `Duplicates: ${dupeMentions}`,
      )
      return
    }

    // Extract team name (first non-empty line that isn't just mentions)
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
    const teamNameLine = lines.find(l => !l.match(/^(<@!?\d+>\s*)+$/))
    const teamName = teamNameLine ?? `${message.author.username}'s Team`

    // ── Check roster min/max against tournament config ──────────────────────
    const rosterMin = activeTournament.rosterMin ?? 2
    const rosterMax = activeTournament.rosterMax ?? 5

    if (mentionedIds.length < rosterMin) {
      await this.reject(
        message,
        `**Too few players.** This tournament requires at least **${rosterMin}** players.\n` +
        `You mentioned ${mentionedIds.length}.`,
      )
      return
    }

    if (mentionedIds.length > rosterMax) {
      await this.reject(
        message,
        `**Too many players.** This tournament allows at most **${rosterMax}** players.\n` +
        `You mentioned ${mentionedIds.length}.`,
      )
      return
    }

    // ── Check for existing registrations (duplicate player check) ────────────
    const existingRegistrations = await prisma.registration.findMany({
      where: {
        tournamentId: activeTournament.id,
        status: { in: ['PENDING', 'APPROVED'] },
      },
      select: { id: true, submittedRaw: true },
    }).catch(() => [])

    const alreadyRegisteredIds: string[] = []
    for (const reg of existingRegistrations) {
      if (!reg.submittedRaw) continue
      try {
        const raw = JSON.parse(reg.submittedRaw as string) as { mentionIds?: string[] }
        if (raw.mentionIds) {
          for (const id of mentionedIds) {
            if (raw.mentionIds.includes(id)) {
              alreadyRegisteredIds.push(id)
            }
          }
        }
      } catch { /* ignore parse errors */ }
    }

    if (alreadyRegisteredIds.length > 0) {
      const dupeList = alreadyRegisteredIds.map(id => `<@${id}>`).join(', ')
      await this.reject(
        message,
        `**Duplicate registration detected.**\n` +
        `The following player(s) are already registered for **${activeTournament.name}**:\n` +
        `${dupeList}\n\n` +
        `Each player can only be in one team per tournament.`,
      )
      return
    }

    const authorAlreadyRegistered = existingRegistrations.some(reg => {
      if (!reg.submittedRaw) return false
      try {
        const raw = JSON.parse(reg.submittedRaw as string) as { authorId?: string }
        return raw.authorId === message.author.id
      } catch { return false }
    })

    if (authorAlreadyRegistered) {
      await this.reject(
        message,
        `**Already registered.** You have already submitted a registration for **${activeTournament.name}**.\n` +
        `Contact an admin if you need to update your registration.`,
      )
      return
    }

    // ── All checks passed — save and approve ─────────────────────────────────
    try {
      // Find or create the captain user record
      let dbUser = await prisma.user.findFirst({
        where: { discordId: message.author.id },
        select: { id: true },
      })

      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            discordId: message.author.id,
            username: message.author.username,
            avatar: message.author.avatar,
          },
          select: { id: true },
        })
      }

      // Find or create team
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
        await prisma.team.update({
          where: { id: team.id },
          data: { name: teamName },
        })
      }

      // Create registration
      const registration = await prisma.registration.create({
        data: {
          tournamentId: activeTournament.id,
          guildId,
          teamId: team.id,
          status: 'PENDING',
          submittedRaw: JSON.stringify({
            authorId: message.author.id,
            teamName,
            mentionIds: mentionedIds,
            messageId: message.id,
            content: content.slice(0, 500),
          }),
        },
        select: { id: true },
      })

      // React ✅
      await message.react('✅').catch(() => null)

      // Count current slot
      const currentTournament = await prisma.tournament.findUnique({
        where: { id: activeTournament.id },
        select: { acceptedCount: true, teamCapacity: true },
      })
      const slotNumber = (currentTournament?.acceptedCount ?? 0) + 1

      // Post to approved registrations channel
      if (activeTournament.approvedRegChannelId) {
        const approvedChannel = await message.guild!.channels
          .fetch(activeTournament.approvedRegChannelId)
          .catch(() => null)

        if (approvedChannel?.isTextBased()) {
          const approvedEmbed = new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle(`✅ Registration Approved — ${activeTournament.name}`)
            .setDescription(
              [
                `**Team Name:** ${teamName}`,
                `**Captain:** <@${message.author.id}>`,
                `**Players (${mentionedIds.length}):**`,
                mentionedIds.map(id => `• <@${id}>`).join('\n'),
              ].join('\n'),
            )
            .addFields(
              { name: 'Registration ID', value: `\`${registration.id}\``, inline: true },
              { name: 'Submitted', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
              { name: 'Tournament', value: activeTournament.name, inline: true },
            )
            .setFooter({ text: `SHADØW TOURNAMENTS • Channel Registration` })
            .setTimestamp()

          await (approvedChannel as TextChannel).send({ embeds: [approvedEmbed] }).catch(() => null)
        }
      }

      // ── Auto-close check ────────────────────────────────────────────────
      const updatedTournament = await prisma.tournament.findUnique({
        where: { id: activeTournament.id },
        select: { acceptedCount: true, teamCapacity: true, approvedRegChannelId: true },
      })
      if (
        updatedTournament &&
        updatedTournament.acceptedCount >= updatedTournament.teamCapacity &&
        !activeTournament.waitlistEnabled
      ) {
        await prisma.tournament.update({
          where: { id: activeTournament.id },
          data: { status: 'REGISTRATION_CLOSED' },
        }).catch(() => null)
        await prisma.outboxEvent.create({
          data: {
            guildId,
            type: 'TOURNAMENT_REGISTRATION_CLOSED',
            payloadJson: { tournamentId: activeTournament.id },
            status: 'PENDING',
          },
        }).catch(() => null)

        if (updatedTournament.approvedRegChannelId) {
          const closedChannel = await message.guild!.channels
            .fetch(updatedTournament.approvedRegChannelId)
            .catch(() => null)
          if (closedChannel?.isTextBased()) {
            const closeEmbed = new EmbedBuilder()
              .setColor(0xef4444)
              .setTitle(`🔒 REGISTRATION CLOSED`)
              .setDescription(
                `All **${updatedTournament.teamCapacity}** slots for **${activeTournament.name}** are now filled!\n` +
                `Registration has been automatically closed.`,
              )
              .setTimestamp()
            await (closedChannel as TextChannel).send({ embeds: [closeEmbed] }).catch(() => null)
          }
        }
      }

      // ── Group assignment ────────────────────────────────────────────────
      let groupNumber: number | null = null
      try {
        groupNumber = await assignToGroup(
          guildId,
          activeTournament.id,
          registration.id,
          team.id,
          message.guild!,
          activeTournament.name,
          activeTournament.tournamentCode,
        )
      } catch (err) {
        this.container.logger.warn(`[RegistrationChannel] Group assignment failed: ${err}`)
      }

      // ── DM notifications ────────────────────────────────────────────────
      const groupChannelMention = groupNumber !== null
        ? ` — assigned to **Group ${groupNumber}**`
        : ''
      const groupLine = groupNumber !== null ? `Group ${groupNumber}` : 'Pending assignment'

      const confirmEmbed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle(`✅ REGISTRATION CONFIRMED`)
        .setDescription(
          [
            `You have been successfully registered for:`,
            `🏆 **${activeTournament.name}**${activeTournament.tournamentCode ? ` (#${activeTournament.tournamentCode})` : ''}`,
          ].join('\n'),
        )
        .addFields(
          { name: 'Team', value: teamName, inline: true },
          { name: 'Your Role', value: 'Captain', inline: true },
          { name: 'Group', value: groupLine, inline: true },
          { name: 'Slot', value: `${slotNumber}/${activeTournament.teamCapacity}`, inline: true },
          { name: 'Game', value: activeTournament.game.replace(/_/g, ' '), inline: true },
          { name: 'Start', value: toIST(activeTournament.startAt), inline: true },
          { name: 'Reg. Closes', value: toIST(activeTournament.registrationCloseAt), inline: true },
        )
        .setFooter({ text: 'Good luck, soldier! 🎯 • SHADØW TOURNAMENTS' })
        .setTimestamp()

      // DM the captain
      await message.author.send({ embeds: [confirmEmbed] }).catch(() => null)

      // DM all team members (excluding the captain)
      for (const memberId of mentionedIds) {
        if (memberId === message.author.id) continue
        try {
          const memberEmbed = new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle(`✅ REGISTRATION CONFIRMED`)
            .setDescription(
              [
                `You have been successfully registered for:`,
                `🏆 **${activeTournament.name}**${activeTournament.tournamentCode ? ` (#${activeTournament.tournamentCode})` : ''}`,
              ].join('\n'),
            )
            .addFields(
              { name: 'Team', value: teamName, inline: true },
              { name: 'Your Role', value: 'Member', inline: true },
              { name: 'Group', value: groupLine, inline: true },
              { name: 'Slot', value: `${slotNumber}/${activeTournament.teamCapacity}`, inline: true },
              { name: 'Game', value: activeTournament.game.replace(/_/g, ' '), inline: true },
              { name: 'Start', value: toIST(activeTournament.startAt), inline: true },
            )
            .setFooter({ text: 'Good luck, soldier! 🎯 • SHADØW TOURNAMENTS' })
            .setTimestamp()

          const memberUser = await message.client.users.fetch(memberId).catch(() => null)
          if (memberUser) {
            await memberUser.send({ embeds: [memberEmbed] }).catch(() => null)
          }
        } catch { /* non-fatal */ }
      }

      if (groupChannelMention) {
        this.container.logger.info(
          `[RegistrationChannel] Team "${teamName}" assigned to group ${groupNumber} in tournament ${activeTournament.id}`,
        )
      }

    } catch (err) {
      this.container.logger.error(`[RegistrationChannel] DB error: ${err}`)
      await this.reject(message, 'An internal error occurred while saving your registration. Please try again.')
    }
  }

  // ── Reject helper — react ❌ and send reason (auto-deleted after 20s) ──────
  private async reject(message: Message, reason: string) {
    await message.react('❌').catch(() => null)

    const rejectEmbed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('❌ Registration Rejected')
      .setDescription(reason)
      .setFooter({ text: 'This message will be deleted in 20 seconds • SHADØW TOURNAMENTS' })
      .setTimestamp()

    const replyMsg = await message.reply({ embeds: [rejectEmbed] }).catch(() => null)

    if (replyMsg) {
      setTimeout(() => {
        replyMsg.delete().catch(() => null)
      }, REJECT_MESSAGE_TTL)
    }

    // DM the captain about the rejection
    const rejectDMEmbed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('❌ REGISTRATION REJECTED')
      .setDescription(reason)
      .setFooter({ text: 'You may re-register after fixing the issue. • SHADØW TOURNAMENTS' })
      .setTimestamp()

    await message.author.send({ embeds: [rejectDMEmbed] }).catch(() => null)
  }
}
