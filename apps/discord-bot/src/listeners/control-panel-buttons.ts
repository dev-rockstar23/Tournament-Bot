import { Listener, Events } from '@sapphire/framework'
import { EmbedBuilder, type Interaction } from 'discord.js'
import prisma from '@esports/database'

export class ControlPanelButtonsListener extends Listener<typeof Events.InteractionCreate> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.InteractionCreate })
  }

  public async run(interaction: Interaction) {
    if (!interaction.isButton()) return
    if (!interaction.customId.startsWith('cp:')) return

    const guildId = interaction.guildId!

    switch (interaction.customId) {
      case 'cp:live': {
        const tournaments = await prisma.tournament.findMany({
          where: { guildId, status: 'LIVE' },
          take: 5,
        })
        const embed = new EmbedBuilder()
          .setColor(0x7c3aed)
          .setTitle('🔴 Live Tournaments')
          .setDescription(
            tournaments.length === 0
              ? 'No live tournaments at the moment.'
              : tournaments
                  .map(t => `**${t.name}** — ID: \`${t.id}\` — Status: ${t.status}`)
                  .join('\n'),
          )
          .setTimestamp()
        await interaction.reply({ embeds: [embed], ephemeral: true })
        break
      }

      case 'cp:results': {
        const matches = await prisma.match.findMany({
          where: { guildId, status: 'AWAITING_RESULT' },
          take: 5,
        })
        const embed = new EmbedBuilder()
          .setColor(0xf59e0b)
          .setTitle('📊 Pending Results')
          .setDescription(
            matches.length === 0
              ? 'No matches awaiting results.'
              : matches
                  .map(m => `**Match #${m.number}** — ID: \`${m.id}\` — Status: ${m.status}`)
                  .join('\n'),
          )
          .setTimestamp()
        await interaction.reply({ embeds: [embed], ephemeral: true })
        break
      }

      case 'cp:disputes': {
        const disputes = await prisma.dispute.findMany({
          where: {
            match: { stage: { tournament: { guildId } } },
            status: 'OPEN',
          },
          take: 5,
        })
        const embed = new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle('⚠️ Open Disputes')
          .setDescription(
            disputes.length === 0
              ? 'No open disputes.'
              : disputes
                  .map(d => `ID: \`${d.id}\` — Match: \`${d.matchId}\` — Status: ${d.status}`)
                  .join('\n'),
          )
          .setTimestamp()
        await interaction.reply({ embeds: [embed], ephemeral: true })
        break
      }

      case 'cp:upcoming': {
        const matches = await prisma.match.findMany({
          where: {
            guildId,
            status: 'SCHEDULED',
            scheduledStart: { gte: new Date() },
          },
          orderBy: { scheduledStart: 'asc' },
          take: 5,
        })
        const embed = new EmbedBuilder()
          .setColor(0x3b82f6)
          .setTitle('🕐 Upcoming Matches')
          .setDescription(
            matches.length === 0
              ? 'No upcoming matches scheduled.'
              : matches
                  .map(
                    m =>
                      `**Match #${m.number}** — ID: \`${m.id}\` — <t:${Math.floor(m.scheduledStart.getTime() / 1000)}:R>`,
                  )
                  .join('\n'),
          )
          .setTimestamp()
        await interaction.reply({ embeds: [embed], ephemeral: true })
        break
      }

      case 'cp:health': {
        const [pendingCount, failedCount] = await Promise.all([
          prisma.outboxEvent.count({ where: { status: 'PENDING' } }),
          prisma.outboxEvent.count({ where: { status: 'FAILED' } }),
        ])
        const embed = new EmbedBuilder()
          .setColor(pendingCount > 0 || failedCount > 0 ? 0xf59e0b : 0x22c55e)
          .setTitle('🤖 System Health')
          .addFields(
            { name: '⏳ Pending Events', value: String(pendingCount), inline: true },
            { name: '❌ Failed Events', value: String(failedCount), inline: true },
          )
          .setTimestamp()
        await interaction.reply({ embeds: [embed], ephemeral: true })
        break
      }

      default:
        break
    }
  }
}
