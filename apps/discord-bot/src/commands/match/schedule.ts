import { Command } from '@sapphire/framework'
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js'
import prisma from '@esports/database'
import { notFoundEmbed, genericErrorEmbed, brandFooter } from '../../utils/responses'
import { e } from '../../utils/emojis'

const BRAND_COLOR = 0x7c3aed

export class MatchScheduleCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'schedule',
      description: 'View upcoming match schedule for a tournament.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('schedule')
        .setDescription('View upcoming match schedule for a tournament.')
        .addStringOption(opt =>
          opt
            .setName('tournament')
            .setDescription('Tournament ID')
            .setRequired(true),
        ),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: false })

    const tournamentId = interaction.options.getString('tournament', true)
    const guildId = interaction.guildId!

    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id: tournamentId, guildId },
        select: { id: true, name: true },
      })

      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      const matches = await prisma.match.findMany({
        where: {
          guildId,
          stage: { tournamentId, tournament: { guildId } },
          scheduledStart: { gte: new Date() },
        },
        orderBy: { scheduledStart: 'asc' },
        take: 10,
        include: { stage: { select: { name: true } } },
      })

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle(`${e('upcoming')} Schedule — ${tournament.name}`)
        .setTimestamp()

      brandFooter(embed, interaction.guild?.name ?? 'Legendary Esports')

      if (matches.length === 0) {
        embed.setDescription('No upcoming matches scheduled.')
        return interaction.editReply({ embeds: [embed] })
      }

      const rows = matches.map(m => {
        const startTs = Math.floor(new Date(m.scheduledStart).getTime() / 1000)
        const statusBadge = getStatusBadge(m.status)
        const mapLine = m.map ? ` • 🗺️ ${m.map}` : ''
        return [
          `**Match #${m.number}** — ${m.stage.name}${mapLine}`,
          `${statusBadge} • 🗓️ <t:${startTs}:F>`,
        ].join('\n')
      })

      embed.setDescription(rows.join('\n\n'))

      // Countdown to next match
      const next = matches[0]
      if (next) {
        const nextTs = Math.floor(new Date(next.scheduledStart).getTime() / 1000)
        embed.addFields({
          name: `${e('lightning')} Next Match`,
          value: `Match #${next.number} — <t:${nextTs}:R>`,
          inline: false,
        })
      }

      return interaction.editReply({ embeds: [embed] })
    } catch (err) {
      this.container.logger.error(`match schedule error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }
}

function getStatusBadge(status: string): string {
  const map: Record<string, string> = {
    SCHEDULED: '🕐 Scheduled',
    CHECK_IN: '☑️ Check-In Open',
    READY: '✅ Ready',
    LIVE: '🔴 Live',
    AWAITING_RESULT: '📊 Awaiting Result',
    UNDER_REVIEW: '🔍 Under Review',
    COMPLETED: '✅ Completed',
    POSTPONED: '⏸️ Postponed',
    CANCELLED: '❌ Cancelled',
  }
  return map[status] ?? status
}
