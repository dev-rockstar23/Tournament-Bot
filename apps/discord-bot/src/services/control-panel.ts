import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, TextChannel } from 'discord.js'
import prisma from '@esports/database'
import { e } from '../utils/emojis'

export async function updateControlPanel(guildId: string, client: Client): Promise<void> {
  const settings = await prisma.serverSettings.findUnique({ where: { guildId } })
  if (!settings?.adminChannelId || !settings?.controlPanelMessageId) return

  const [liveCount, pendingResults, openDisputes, upcomingMatches] = await Promise.all([
    prisma.tournament.count({ where: { guildId, status: 'LIVE' } }),
    prisma.match.count({ where: { guildId, status: 'AWAITING_RESULT' } }),
    prisma.dispute.count({ where: { match: { stage: { tournament: { guildId } } }, status: 'OPEN' } }),
    prisma.match.count({ where: { guildId, status: 'SCHEDULED', scheduledStart: { gte: new Date() } } }),
  ])

  const embed = new EmbedBuilder()
    .setColor(0x7c3aed)
    .setTitle(`${e('lightning')} Tournament Control Panel`)
    .setDescription('Quick access to active tournament operations.')
    .addFields(
      { name: `${e('live')} Live Events`, value: String(liveCount), inline: true },
      { name: `${e('results')} Pending Results`, value: String(pendingResults), inline: true },
      { name: `${e('dispute')} Open Disputes`, value: String(openDisputes), inline: true },
      { name: `${e('upcoming')} Upcoming Matches`, value: String(upcomingMatches), inline: true },
    )
    .setTimestamp()
    .setFooter({ text: 'Legendary Esports • Auto-updates on activity' })

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('cp:live').setLabel('Live Events').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('cp:results').setLabel('Pending Results').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('cp:disputes').setLabel('Disputes').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('cp:upcoming').setLabel('Upcoming').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('cp:health').setLabel('Health').setStyle(ButtonStyle.Secondary),
  )

  try {
    const channel = await client.channels.fetch(settings.adminChannelId) as TextChannel
    if (!channel?.isTextBased()) return
    const message = await channel.messages.fetch(settings.controlPanelMessageId)
    await message.edit({ embeds: [embed], components: [row] })
  } catch {
    // Channel unavailable or message deleted — silent fail
  }
}
