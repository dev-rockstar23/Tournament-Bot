/**
 * Channel-based registration system.
 *
 * Flow:
 * 1. Player posts their registration in the configured registrationChannelId
 * 2. Bot validates the message:
 *    - Must contain 2–5 Discord @mentions
 *    - No duplicate user IDs
 *    - No user ID already registered for an active tournament in this guild
 *    - Must follow the format: Team Name on first line, then mentions
 * 3. On valid:   React ✅, save Registration to DB, post to approvedRegChannelId
 * 4. On invalid: React ❌, reply with reason (ephemeral-style: auto-deleted after 15s)
 */

import { Listener, Events } from '@sapphire/framework'
import {
  EmbedBuilder,
  type Message,
  type TextChannel,
} from 'discord.js'
import prisma from '@esports/database'

// Regex to extract Discord user mentions (<@123456789> or <@!123456789>)
const MENTION_RE = /<@!?(\d{17,20})>/g

// How long (ms) to keep rejection reason messages before auto-deleting
const REJECT_MESSAGE_TTL = 20_000

export class RegistrationChannelListener extends Listener<typeof Events.MessageCreate> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.MessageCreate })
  }

  public async run(message: Message) {
    // Ignore bots and DMs
    if (message.author.bot) return
    if (!message.guild) return

    const guildId = message.guild.id

    // Check if this message is in the configured registration channel
    const settings = await prisma.serverSettings.findUnique({
      where: { guildId },
      select: {
        registrationChannelId: true,
        approvedRegChannelId:  true,
      },
    }).catch(() => null)

    if (!settings?.registrationChannelId) return
    if (message.channelId !== settings.registrationChannelId) return

    // ── Parse the registration message ──────────────────────────────────────
    const content = message.content.trim()

    if (!content) {
      await this.reject(message, 'Registration message cannot be empty.')
      return
    }

    // Extract all @mentions
    const mentionMatches = [...content.matchAll(MENTION_RE)]
    const mentionedIds   = mentionMatches.map(m => m[1]!)

    // Minimum 2, maximum 5 players
    if (mentionedIds.length < 2) {
      await this.reject(
        message,
        `**Too few players.** Minimum **2** Discord mentions required.\n` +
        `You mentioned ${mentionedIds.length} player(s).\n\n` +
        `Format example:\n\`\`\`\nTeam Name\n@Player1 @Player2 @Player3 @Player4\nIGN1 | IGN2 | IGN3 | IGN4\n\`\`\``,
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

    // ── Check for existing registrations (duplicate player check) ────────────
    // Find the active tournament for this guild (REGISTRATION_OPEN)
    const activeTournament = await prisma.tournament.findFirst({
      where: {
        guildId,
        status: 'REGISTRATION_OPEN',
      },
      select: { id: true, name: true, rosterMin: true, rosterMax: true },
      orderBy: { createdAt: 'desc' },
    }).catch(() => null)

    if (!activeTournament) {
      await this.reject(
        message,
        '**No active tournament.** There is no tournament with open registration right now.\n' +
        'Please wait for an admin to open registrations.',
      )
      return
    }

    // Check roster min/max against tournament config
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

    // Check if any mentioned user is already in a pending/approved registration
    // We store mentions in submittedRaw JSON
    const existingRegistrations = await prisma.registration.findMany({
      where: {
        tournamentId: activeTournament.id,
        status: { in: ['PENDING', 'APPROVED'] },
      },
      select: { id: true, submittedRaw: true, teamId: true },
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

    // Check if this author already submitted a registration
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
      // Find or create team
      let dbUser = await prisma.user.findFirst({
        where: { discordId: message.author.id },
        select: { id: true },
      })

      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            discordId: message.author.id,
            username:  message.author.username,
            avatar:    message.author.avatar,
          },
          select: { id: true },
        })
      }

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
          teamId:       team.id,
          status:       'PENDING',
          submittedRaw: JSON.stringify({
            authorId:   message.author.id,
            teamName,
            mentionIds: mentionedIds,
            messageId:  message.id,
            content:    content.slice(0, 500),
          }),
        },
        select: { id: true },
      })

      // React ✅
      await message.react('✅').catch(() => null)

      // Post to approved registrations channel
      if (settings.approvedRegChannelId) {
        const approvedChannel = await message.guild!.channels
          .fetch(settings.approvedRegChannelId)
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
              { name: 'Submitted',       value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
              { name: 'Tournament',      value: activeTournament.name, inline: true },
            )
            .setFooter({ text: `SHADØW TOURNAMENTS • Channel Registration` })
            .setTimestamp()

          await (approvedChannel as TextChannel).send({ embeds: [approvedEmbed] }).catch(() => null)
        }
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
  }
}
