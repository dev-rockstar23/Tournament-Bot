import { Command } from '@sapphire/framework'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
} from 'discord.js'
import prisma from '@esports/database'
import { computeTournamentStandings } from '@esports/scoring'
import {
  notFoundEmbed,
  genericErrorEmbed,
  legendaryStandingsEmbed,
} from '../utils/responses'
import { paginate, createPaginatorCollector } from '../utils/paginator'
import { WEB_BASE } from '../utils/constants'

const PAGE_SIZE = 10

export class PointsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'points',
      description: 'Tournament points and standings.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('points')
        .setDescription('Tournament points and standings.')
        .addSubcommand(sub =>
          sub
            .setName('calc')
            .setDescription('Calculate and display tournament standings.')
            .addStringOption(opt =>
              opt
                .setName('tournament')
                .setDescription('Tournament ID')
                .setRequired(true),
            )
            .addStringOption(opt =>
              opt
                .setName('match')
                .setDescription('Filter to a specific match ID (optional)')
                .setRequired(false),
            ),
        ),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand(true)
    if (sub === 'calc') return this.handleCalc(interaction)
  }

  private async handleCalc(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: false })

    const tournamentId = interaction.options.getString('tournament', true)
    const matchId = interaction.options.getString('match', false)
    const guildId = interaction.guildId!

    try {
      // Verify tournament belongs to guild
      const tournament = await prisma.tournament.findFirst({
        where: { id: tournamentId, guildId },
        select: { id: true, name: true, game: true },
      })

      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      // Compute standings from scoring engine
      const rawStandings = await computeTournamentStandings(prisma, tournamentId, guildId)

      // If match filter provided, re-query scoreEvents for that match only
      let filteredStandings = rawStandings
      if (matchId) {
        const matchEvents = await prisma.scoreEvent.findMany({
          where: {
            matchId,
            match: {
              stage: {
                tournamentId,
                tournament: { guildId },
              },
            },
            status: 'active',
          },
          select: { teamId: true, points: true, kills: true, placement: true },
        })

        // Build per-team aggregation for this match
        const matchMap = new Map<string, { points: number; kills: number; bestPlacement: number | null }>()
        for (const ev of matchEvents) {
          const existing = matchMap.get(ev.teamId)
          const pts = Number(ev.points)
          const pl = ev.placement ?? null
          if (existing) {
            existing.points += pts
            existing.kills += ev.kills
            if (pl !== null && (existing.bestPlacement === null || pl < existing.bestPlacement)) {
              existing.bestPlacement = pl
            }
          } else {
            matchMap.set(ev.teamId, { points: pts, kills: ev.kills, bestPlacement: pl })
          }
        }

        // Build standings sorted by points desc
        const matchEntries = Array.from(matchMap.entries())
          .sort(([, a], [, b]) => b.points - a.points)
        filteredStandings = matchEntries.map(([teamId, data], idx) => ({
          teamId,
          totalPoints: data.points,
          totalKills: data.kills,
          matchesPlayed: 1,
          bestPlacement: data.bestPlacement,
          rank: idx + 1,
        }))
      }

      // Resolve team names
      const teamIds = filteredStandings.map(s => s.teamId)
      const teams = await prisma.team.findMany({
        where: { id: { in: teamIds } },
        select: { id: true, name: true },
      })
      const teamNameMap = new Map(teams.map(t => [t.id, t.name]))

      // Normalise to render shape
      const renderRows = filteredStandings.map(s => ({
        rank:     s.rank,
        teamName: teamNameMap.get(s.teamId) ?? s.teamId,
        points:   s.totalPoints,
        kills:    s.totalKills,
      }))

      const matchInfo = matchId ? `Filtered to match \`${matchId}\`` : undefined

      // Paginate in groups of PAGE_SIZE
      const { pages } = paginate(renderRows, PAGE_SIZE, (chunk, pageIdx, total) =>
        legendaryStandingsEmbed(
          tournament.name,
          chunk,
          matchInfo ? `${matchInfo} • Page ${pageIdx + 1}/${total}` : `Page ${pageIdx + 1}/${total}`,
        ),
      )

      // Dashboard link button
      const dashBtn = new ButtonBuilder()
        .setLabel('View Full Standings on Dashboard →')
        .setStyle(ButtonStyle.Link)
        .setURL(`${WEB_BASE}/servers/${guildId}/tournaments/${tournamentId}/standings`)
        .setEmoji('📊')

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(dashBtn)

      if (pages.length === 1) {
        return interaction.editReply({ embeds: [pages[0]!], components: [row] })
      }

      // Multi-page — use paginator (buttons override the dashboard link; that's acceptable)
      await createPaginatorCollector(interaction, pages, false)
    } catch (err) {
      this.container.logger.error(`points calc error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }
}
