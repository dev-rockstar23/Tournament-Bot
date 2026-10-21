/**
 * /group — Group management commands for tournament organizers.
 *
 * Subcommands:
 *   /group remove  — Remove a team from a group and auto-promote from waitlist
 *   /group qualify — Select which teams advance to the next stage
 */

import { Command } from '@sapphire/framework'
import {
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type TextChannel,
  type Guild,
} from 'discord.js'
import prisma from '@esports/database'
import {
  successEmbed,
  errorEmbed,
  notFoundEmbed,
} from '../utils/responses'

// Number emoji map for reactions (1–10)
const NUMBER_EMOJIS = [
  '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣',
  '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟',
]

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
      embed.addFields({ name: 'No Teams', value: 'All teams have been removed from this group.' })
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

    let posted = false
    if (group.rosterMessageId) {
      try {
        const existingMsg = await textChannel.messages.fetch(group.rosterMessageId)
        await existingMsg.edit({ embeds: [embed] })
        posted = true
      } catch { /* fall through */ }
    }

    if (!posted) {
      const msg = await textChannel.send({ embeds: [embed] })
      await msg.pin().catch(() => null)
      await prisma.tournamentGroup.update({
        where: { id: group.id },
        data: { rosterMessageId: msg.id },
      }).catch(() => null)
    }
  } catch (err) {
    console.error('[GroupCommand] updateGroupRosterEmbed error:', err)
  }
}

/**
 * Check if a guild member has TOURNAMENT_MANAGER or SERVER_ADMIN role binding.
 */
async function isManagerOrAdmin(
  guildId: string,
  memberRoleIds: string[],
): Promise<boolean> {
  const bindings = await prisma.serverRoleBinding.findMany({
    where: {
      guildId,
      appRole: { in: ['TOURNAMENT_MANAGER', 'SERVER_ADMIN'] },
      discordRoleId: { in: memberRoleIds },
    },
    select: { id: true },
  })
  return bindings.length > 0
}

// ─── Command ─────────────────────────────────────────────────────────────────

export class GroupCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'group',
      description: 'Manage tournament groups.',
      preconditions: ['GuildOnly', 'TournamentManagerOrAdmin'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('group')
        .setDescription('Manage tournament groups.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        // ── remove ──────────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('remove')
            .setDescription('Remove a team from a group and auto-promote from waitlist.')
            .addStringOption(opt =>
              opt
                .setName('tournament')
                .setDescription('Tournament code (e.g. A42) or ID')
                .setRequired(true),
            )
            .addStringOption(opt =>
              opt
                .setName('team')
                .setDescription('Team name to remove')
                .setRequired(true),
            )
            .addStringOption(opt =>
              opt
                .setName('reason')
                .setDescription('Reason for removal')
                .setRequired(false),
            ),
        )
        // ── qualify ─────────────────────────────────────────────────────────
        .addSubcommand(sub =>
          sub
            .setName('qualify')
            .setDescription('Select teams that advance to the next stage.')
            .addStringOption(opt =>
              opt
                .setName('tournament')
                .setDescription('Tournament code (e.g. A42) or ID')
                .setRequired(true),
            )
            .addIntegerOption(opt =>
              opt
                .setName('group')
                .setDescription('Group number')
                .setRequired(true)
                .setMinValue(1),
            ),
        ),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand()
    switch (sub) {
      case 'remove': return this.handleRemove(interaction)
      case 'qualify': return this.handleQualify(interaction)
      default:
        return interaction.reply({ embeds: [errorEmbed('Unknown subcommand.')], ephemeral: true })
    }
  }

  // ─── handleRemove ────────────────────────────────────────────────────────

  private async handleRemove(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const tournamentInput = interaction.options.getString('tournament', true)
    const teamName = interaction.options.getString('team', true)
    const reason = interaction.options.getString('reason', false) ?? 'Does not meet requirements'
    const guildId = interaction.guildId!

    try {
      // Resolve tournament by code or ID
      const tournament = await prisma.tournament.findFirst({
        where: {
          guildId,
          OR: [{ id: tournamentInput }, { tournamentCode: tournamentInput }],
        },
        select: { id: true, name: true, tournamentCode: true },
      })

      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      // Find active group assignment for this team
      const assignment = await prisma.groupTeamAssignment.findFirst({
        where: {
          isActive: true,
          group: { tournamentId: tournament.id },
          team: { name: { equals: teamName, mode: 'insensitive' }, guildId },
        },
        include: {
          group: {
            select: {
              id: true,
              groupNumber: true,
              maxTeams: true,
              discordChannelId: true,
              rosterMessageId: true,
            },
          },
          team: {
            include: {
              captain: { select: { discordId: true } },
              members: { include: { user: { select: { discordId: true } } } },
            },
          },
        },
      })

      if (!assignment) {
        return interaction.editReply({
          embeds: [errorEmbed(`No active group assignment found for team **${teamName}** in this tournament.`)],
        })
      }

      // Deactivate the assignment
      await prisma.groupTeamAssignment.update({
        where: { id: assignment.id },
        data: { isActive: false, removedAt: new Date() },
      })

      // Remove member Discord permission overrides from group channel
      if (assignment.group.discordChannelId) {
        const channel = await interaction.guild!.channels
          .fetch(assignment.group.discordChannelId)
          .catch(() => null)
        if (channel && channel.isTextBased()) {
          const textChannel = channel as TextChannel
          const allMemberIds = new Set<string>()
          if (assignment.team.captain.discordId) {
            allMemberIds.add(assignment.team.captain.discordId)
          }
          for (const m of assignment.team.members) {
            if (m.user.discordId) allMemberIds.add(m.user.discordId)
          }
          for (const discordId of allMemberIds) {
            await textChannel.permissionOverwrites.delete(discordId).catch(() => null)
          }
        }
      }

      // Update roster embed
      await updateGroupRosterEmbed(
        interaction.guild!,
        assignment.group,
        tournament.name,
        tournament.tournamentCode,
      )

      // DM the removed team's captain
      if (assignment.team.captain.discordId) {
        const captainUser = await interaction.client.users
          .fetch(assignment.team.captain.discordId)
          .catch(() => null)
        if (captainUser) {
          const dmEmbed = new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle('⚠️ Removed from Group')
            .setDescription(
              [
                `Your team **${assignment.team.name}** has been removed from Group ${assignment.group.groupNumber} in **${tournament.name}**.`,
                ``,
                `**Reason:** ${reason}`,
                ``,
                `Contact the tournament organizers if you believe this is an error.`,
              ].join('\n'),
            )
            .setTimestamp()
          await captainUser.send({ embeds: [dmEmbed] }).catch(() => null)
        }
      }

      // Auto-promote oldest waitlisted registration
      const waitlisted = await prisma.registration.findFirst({
        where: { tournamentId: tournament.id, status: 'WAITLISTED' },
        orderBy: { createdAt: 'asc' },
        include: {
          team: {
            include: {
              captain: { select: { discordId: true } },
            },
          },
        },
      })

      if (waitlisted) {
        await prisma.registration.update({
          where: { id: waitlisted.id },
          data: { status: 'APPROVED', approvedAt: new Date() },
        })

        // Assign to group (same group that was freed)
        try {
          await prisma.groupTeamAssignment.create({
            data: {
              groupId: assignment.group.id,
              teamId: waitlisted.teamId,
              registrationId: waitlisted.id,
            },
          })
          await updateGroupRosterEmbed(
            interaction.guild!,
            assignment.group,
            tournament.name,
            tournament.tournamentCode,
          )
        } catch { /* group might be full */ }

        // DM promoted captain
        if (waitlisted.team.captain.discordId) {
          const promotedUser = await interaction.client.users
            .fetch(waitlisted.team.captain.discordId)
            .catch(() => null)
          if (promotedUser) {
            const promoteEmbed = new EmbedBuilder()
              .setColor(0x22c55e)
              .setTitle('✅ Promoted from Waitlist!')
              .setDescription(
                [
                  `🎉 Your team **${waitlisted.team.name}** has been promoted from the waitlist!`,
                  ``,
                  `You are now assigned to **Group ${assignment.group.groupNumber}** in **${tournament.name}**.`,
                ].join('\n'),
              )
              .setTimestamp()
            await promotedUser.send({ embeds: [promoteEmbed] }).catch(() => null)
          }
        }
      }

      return interaction.editReply({
        embeds: [
          successEmbed(
            'Team Removed',
            `**${assignment.team.name}** has been removed from Group ${assignment.group.groupNumber}.${waitlisted ? ` Waitlisted team **${waitlisted.team.name}** has been promoted.` : ''}`,
          ),
        ],
      })
    } catch (err) {
      this.container.logger.error(`[GroupCommand] handleRemove error: ${err}`)
      return interaction.editReply({ embeds: [errorEmbed('An error occurred while removing the team.')] })
    }
  }

  // ─── handleQualify ───────────────────────────────────────────────────────

  private async handleQualify(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const tournamentInput = interaction.options.getString('tournament', true)
    const groupNumber = interaction.options.getInteger('group', true)
    const guildId = interaction.guildId!

    try {
      // Resolve tournament
      const tournament = await prisma.tournament.findFirst({
        where: {
          guildId,
          OR: [{ id: tournamentInput }, { tournamentCode: tournamentInput }],
        },
        select: { id: true, name: true, tournamentCode: true },
      })

      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      // Find the group
      const group = await prisma.tournamentGroup.findFirst({
        where: { tournamentId: tournament.id, groupNumber, isLocked: false },
        include: {
          assignments: {
            where: { isActive: true },
            include: {
              team: {
                include: {
                  captain: { select: { discordId: true } },
                  members: { include: { user: { select: { discordId: true } } } },
                },
              },
              registration: { select: { id: true } },
            },
            orderBy: { assignedAt: 'asc' },
          },
        },
      })

      if (!group) {
        return interaction.editReply({
          embeds: [errorEmbed(`Group ${groupNumber} not found or already locked.`)],
        })
      }

      if (group.assignments.length === 0) {
        return interaction.editReply({
          embeds: [errorEmbed(`Group ${groupNumber} has no active teams.`)],
        })
      }

      // Get group channel
      if (!group.discordChannelId) {
        return interaction.editReply({
          embeds: [errorEmbed(`Group ${groupNumber} has no associated Discord channel.`)],
        })
      }

      const groupChannel = await interaction.guild!.channels
        .fetch(group.discordChannelId)
        .catch(() => null)

      if (!groupChannel || !groupChannel.isTextBased()) {
        return interaction.editReply({
          embeds: [errorEmbed(`Cannot access the channel for Group ${groupNumber}.`)],
        })
      }

      const textChannel = groupChannel as TextChannel

      // Build qualification embed
      const teamListLines = group.assignments.map((a, i) => {
        const emoji = i < NUMBER_EMOJIS.length ? NUMBER_EMOJIS[i] : `${i + 1}.`
        return `${emoji} **${a.team.name}**`
      })

      const qualEmbed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle(`🏆 QUALIFICATION — Group ${groupNumber} | ${tournament.name}`)
        .setDescription(
          [
            `React with the number(s) corresponding to the team(s) that qualify for the next stage.`,
            `Only Tournament Managers and Admins may react.`,
            `Voting closes in **10 minutes**.`,
            ``,
            ...teamListLines,
          ].join('\n'),
        )
        .setFooter({ text: 'SHADØW TOURNAMENTS • Qualification Round' })
        .setTimestamp()

      const qualMsg = await textChannel.send({ embeds: [qualEmbed] })

      // Immediately post a follow-up so the state is visible even if the interaction token expires
      await textChannel.send({
        content: `⏳ Qualification voting for Group ${groupNumber} is now open for 10 minutes. Only Tournament Managers and Admins can vote.`,
      }).catch(() => null)

      // Add reactions for each team
      const validEmojis = NUMBER_EMOJIS.slice(0, group.assignments.length)
      for (const emoji of validEmojis) {
        await qualMsg.react(emoji).catch(() => null)
      }

      // Collect reactions for 10 minutes
      let collected: import('discord.js').Collection<string, import('discord.js').MessageReaction>
      try {
        collected = await qualMsg.awaitReactions({
          filter: async (reaction, user) => {
            if (user.bot) return false
            if (!validEmojis.includes(reaction.emoji.name ?? '')) return false
            // Check if this user has a manager role
            const member = await interaction.guild!.members.fetch(user.id).catch(() => null)
            if (!member) return false
            const memberRoleIds = [...member.roles.cache.keys()]
            return isManagerOrAdmin(guildId, memberRoleIds)
          },
          dispose: true,
          time: 600_000,
        })
      } catch {
        // Timed out — use whatever was collected
        collected = qualMsg.reactions.cache
      }

      // Determine which teams qualified based on reactions
      const qualifiedIndices = new Set<number>()
      for (const [, reaction] of collected) {
        const emojiIdx = validEmojis.indexOf(reaction.emoji.name ?? '')
        if (emojiIdx !== -1) {
          // Check if any manager reacted
          const users = await reaction.users.fetch()
          for (const [, u] of users) {
            if (u.bot) continue
            const member = await interaction.guild!.members.fetch(u.id).catch(() => null)
            if (!member) continue
            const memberRoleIds = [...member.roles.cache.keys()]
            if (await isManagerOrAdmin(guildId, memberRoleIds)) {
              qualifiedIndices.add(emojiIdx)
              break
            }
          }
        }
      }

      if (qualifiedIndices.size === 0) {
        await textChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xfbbf24)
              .setTitle('⚠️ No Teams Selected')
              .setDescription('No teams were selected for qualification. The round remains open.')
              .setTimestamp(),
          ],
        }).catch(() => null)
        return interaction.editReply({
          embeds: [errorEmbed('No teams were qualified (no valid manager reactions collected).')],
        })
      }

      // Find or create the next stage
      const stages = await prisma.stage.findMany({
        where: { tournamentId: tournament.id },
        orderBy: { order: 'asc' },
      })

      const currentStage = group.stageId
        ? stages.find(s => s.id === group.stageId)
        : null

      const currentOrder = currentStage?.order ?? 0
      let nextStage = stages.find(s => s.order === currentOrder + 1) ?? null

      if (!nextStage) {
        // Create next stage automatically
        nextStage = await prisma.stage.create({
          data: {
            tournamentId: tournament.id,
            name: `Stage ${currentOrder + 2}`,
            type: 'GROUP_STAGE',
            stageType: 'GROUP_STAGE',
            order: currentOrder + 2,
            status: 'pending',
          },
        })
      }

      // Find the next available group in next stage, or create one
      const nextStageGroups = await prisma.tournamentGroup.findMany({
        where: { tournamentId: tournament.id, stageId: nextStage.id },
        include: { _count: { select: { assignments: { where: { isActive: true } } } } },
        orderBy: { groupNumber: 'asc' },
      })

      let nextGroup = nextStageGroups.find(g => g._count.assignments < g.maxTeams) ?? null

      if (!nextGroup) {
        const maxGroupNum = nextStageGroups.length > 0
          ? Math.max(...nextStageGroups.map(g => g.groupNumber))
          : 0
        const newGroupNum = maxGroupNum + 1

        // Find/create category
        const categoryName = `${tournament.name} — Stage ${nextStage.order}`
        let category = interaction.guild!.channels.cache.find(
          c => c.type === ChannelType.GuildCategory && c.name === categoryName
        )
        if (!category) {
          category = await interaction.guild!.channels.create({
            name: categoryName,
            type: ChannelType.GuildCategory,
          })
        }

        // Create group channel
        const newChannel = await interaction.guild!.channels.create({
          name: `group-${newGroupNum}`,
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: [
            { id: interaction.guild!.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
          ],
        })

        // Add manager role overrides
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

        const createdGroup = await prisma.tournamentGroup.create({
          data: {
            tournamentId: tournament.id,
            stageId: nextStage.id,
            guildId,
            groupNumber: newGroupNum,
            name: `Group ${newGroupNum}`,
            discordChannelId: newChannel.id,
            discordCategoryId: category.id,
            maxTeams: 12,
          },
          include: { _count: { select: { assignments: { where: { isActive: true } } } } },
        })
        nextGroup = createdGroup
      }

      // Process each qualified team
      const qualifiedTeamNames: string[] = []
      for (const idx of qualifiedIndices) {
        const assignment = group.assignments[idx]
        if (!assignment) continue

        qualifiedTeamNames.push(assignment.team.name)

        // Create assignment in next stage group
        await prisma.groupTeamAssignment.create({
          data: {
            groupId: nextGroup.id,
            teamId: assignment.teamId,
            registrationId: assignment.registration.id,
          },
        }).catch(() => null)

        // Add member permissions to next stage group channel
        if (nextGroup.discordChannelId) {
          const nextChannel = await interaction.guild!.channels
            .fetch(nextGroup.discordChannelId)
            .catch(() => null)
          if (nextChannel && nextChannel.isTextBased()) {
            const nextTextChannel = nextChannel as TextChannel
            const allMemberIds = new Set<string>()
            if (assignment.team.captain.discordId) {
              allMemberIds.add(assignment.team.captain.discordId)
            }
            for (const m of assignment.team.members) {
              if (m.user.discordId) allMemberIds.add(m.user.discordId)
            }
            for (const discordId of allMemberIds) {
              await nextTextChannel.permissionOverwrites.create(discordId, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
              }).catch(() => null)
            }

            // Post in next stage channel about qualification
            const qualNotifyEmbed = new EmbedBuilder()
              .setColor(0x22c55e)
              .setTitle('🏆 New Team Qualified!')
              .setDescription(`**${assignment.team.name}** has qualified from Group ${groupNumber} and joined this stage.`)
              .setTimestamp()
            await nextTextChannel.send({ embeds: [qualNotifyEmbed] }).catch(() => null)
          }
        }

        // DM captain
        if (assignment.team.captain.discordId) {
          const captainUser = await interaction.client.users
            .fetch(assignment.team.captain.discordId)
            .catch(() => null)
          if (captainUser) {
            const dmEmbed = new EmbedBuilder()
              .setColor(0x22c55e)
              .setTitle('🏆 Congratulations! You Qualified!')
              .setDescription(
                [
                  `Your team **${assignment.team.name}** has qualified for the next stage in **${tournament.name}**!`,
                  ``,
                  `You have been assigned to **${nextGroup.name}** in ${nextStage.name}.`,
                ].join('\n'),
              )
              .setTimestamp()
            await captainUser.send({ embeds: [dmEmbed] }).catch(() => null)
          }
        }
      }

      // Update the next group roster embed
      await updateGroupRosterEmbed(
        interaction.guild!,
        nextGroup,
        tournament.name,
        tournament.tournamentCode,
      )

      // Archive current group channel (make read-only for members)
      await textChannel.permissionOverwrites.set([
        { id: interaction.guild!.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
      ]).catch(() => null)
      await textChannel.setName(`group-${groupNumber}-archived`).catch(() => null)

      // Lock the group in DB
      await prisma.tournamentGroup.update({
        where: { id: group.id },
        data: { isLocked: true },
      })

      // Post summary in group channel
      const summaryEmbed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle(`✅ Qualification Complete — Group ${groupNumber}`)
        .setDescription(
          qualifiedTeamNames.length > 0
            ? `The following teams have advanced to **${nextStage.name}**:\n\n${qualifiedTeamNames.map(n => `• **${n}**`).join('\n')}`
            : 'No teams were qualified.',
        )
        .setFooter({ text: 'This channel has been archived.' })
        .setTimestamp()
      await textChannel.send({ embeds: [summaryEmbed] }).catch(() => null)

      return interaction.editReply({
        embeds: [
          successEmbed(
            'Qualification Complete',
            `${qualifiedTeamNames.length} team(s) advanced to **${nextStage.name}**:\n${qualifiedTeamNames.map(n => `• ${n}`).join('\n')}`,
          ),
        ],
      })
    } catch (err) {
      this.container.logger.error(`[GroupCommand] handleQualify error: ${err}`)
      return interaction.editReply({ embeds: [errorEmbed('An error occurred during qualification.')] })
    }
  }
}
