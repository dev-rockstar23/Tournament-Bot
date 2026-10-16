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
import { brandFooter } from '../../utils/responses'
import { e } from '../../utils/emojis'
import { buildTournamentEmbed } from '../../utils/embeds'

const BRAND_COLOR = 0x7c3aed
const PAGE_SIZE = 5

export class TournamentListCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'list',
      description: 'List tournaments for this server.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('list')
        .setDescription('List tournaments for this server.')
        .addStringOption(opt =>
          opt
            .setName('status')
            .setDescription('Filter by tournament status')
            .setRequired(false)
            .addChoices(
              { name: 'Draft',              value: 'DRAFT'              },
              { name: 'Registration Open',  value: 'REGISTRATION_OPEN'  },
              { name: 'Live',               value: 'LIVE'               },
              { name: 'Completed',          value: 'COMPLETED'          },
            ),
        ),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const guildId = interaction.guildId!
    const statusFilter = interaction.options.getString('status') as string | null

    // Fetch all matching tournaments (capped at 50 for performance)
    const where: Record<string, unknown> = {
      guildId,
      status: statusFilter
        ? statusFilter
        : { not: 'ARCHIVED' },
    }

    const tournaments = await prisma.tournament.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
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
        createdAt: true,
      },
    })

    if (tournaments.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle(`${e('trophy')} Tournaments`)
        .setDescription('No tournaments found for this server.')
        .setTimestamp()
      brandFooter(embed, interaction.guild?.name ?? 'Legendary Esports')
      return interaction.editReply({ embeds: [embed] })
    }

    const totalPages = Math.ceil(tournaments.length / PAGE_SIZE)
    let page = 0

    const buildPage = (p: number): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } => {
      const slice = tournaments.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE)
      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle(`${e('trophy')} Tournaments (Page ${p + 1}/${totalPages})`)
        .setTimestamp()
        .setFooter({ text: `Legendary Esports • ${interaction.guild?.name ?? ''}` })

      const rows = slice.map(t => {
        const statusEmoji = getStatusEmoji(String(t.status))
        const startTs = t.startAt ? `<t:${Math.floor(new Date(t.startAt).getTime() / 1000)}:F>` : '—'
        return `**${t.name}** [${t.id}]\n${statusEmoji} • ${String(t.game).replace(/_/g, ' ')} • ${t.acceptedCount}/${t.teamCapacity} teams • Starts: ${startTs}`
      })

      embed.setDescription(rows.join('\n\n'))

      const prev = new ButtonBuilder()
        .setCustomId('tlist_prev')
        .setLabel('◀ Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(p === 0)

      const next = new ButtonBuilder()
        .setCustomId('tlist_next')
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(p >= totalPages - 1)

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(prev, next)
      return { embeds: [embed], components: [row] }
    }

    const msg = await interaction.editReply(buildPage(page))

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => (i.customId === 'tlist_prev' || i.customId === 'tlist_next') && i.user.id === interaction.user.id,
      time: 120_000,
    })

    collector.on('collect', async i => {
      if (i.customId === 'tlist_prev' && page > 0) page--
      else if (i.customId === 'tlist_next' && page < totalPages - 1) page++
      await i.update(buildPage(page))
    })

    collector.on('end', async () => {
      const { embeds, components } = buildPage(page)
      // Disable all buttons on expiry
      components.forEach(row => row.components.forEach(btn => (btn as ButtonBuilder).setDisabled(true)))
      await interaction.editReply({ embeds, components }).catch(() => null)
    })
  }
}

function getStatusEmoji(status: string): string {
  const map: Record<string, string> = {
    DRAFT: '📝',
    REGISTRATION_OPEN: '✍️',
    REGISTRATION_CLOSED: '🕐',
    CHECK_IN: '☑️',
    LIVE: '🔴',
    COMPLETED: '✅',
    CANCELLED: '❌',
    ARCHIVED: '📦',
  }
  return map[status] ?? '•'
}
