import { Command } from '@sapphire/framework'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js'
import prisma from '@esports/database'
import { notFoundEmbed, genericErrorEmbed, brandFooter } from '../../utils/responses'

const BRAND_COLOR = 0x7c3aed
const WEB_BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://legendary-esports.gg'

export class TournamentBracketCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'bracket',
      description: 'View tournament bracket',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('bracket')
        .setDescription('View tournament bracket')
        .addStringOption(opt =>
          opt
            .setName('tournament')
            .setDescription('Tournament ID or name')
            .setRequired(true),
        ),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: false })

    const input = interaction.options.getString('tournament', true)
    const guildId = interaction.guildId!

    try {
      // Look up tournament by ID or name
      const tournament = await prisma.tournament.findFirst({
        where: {
          guildId,
          OR: [
            { id: input },
            { name: { contains: input, mode: 'insensitive' } },
          ],
        },
        include: {
          stages: {
            include: {
              matches: {
                include: {
                  participants: {
                    include: { team: true },
                  },
                },
                orderBy: { number: 'asc' },
              },
            },
          },
        },
      })

      if (!tournament) {
        return interaction.editReply({ embeds: [notFoundEmbed('tournament')] })
      }

      // Gather all matches
      const allMatches = tournament.stages.flatMap(s => s.matches)
      const teamCount = tournament.acceptedCount ?? 0

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle(`📊 ${tournament.name} — Bracket`)
        .addFields(
          { name: 'Format', value: tournament.stages[0]?.type ?? 'Single Elimination', inline: true },
          { name: 'Status', value: this.statusBadge(String(tournament.status)), inline: true },
        )
        .setTimestamp()

      // Generate ASCII bracket for <= 8 teams
      if (teamCount <= 8 && allMatches.length > 0) {
        const asciiArt = this.generateBracketArt(allMatches, teamCount)
        if (asciiArt) {
          embed.setDescription(`\`\`\`\n${asciiArt}\n\`\`\``)
        }
      }

      brandFooter(embed, interaction.guild?.name ?? 'Legendary Esports')

      // Interactive bracket button
      const bracketBtn = new ButtonBuilder()
        .setLabel('View Interactive Bracket →')
        .setStyle(ButtonStyle.Link)
        .setURL(`${WEB_BASE}/servers/${guildId}/tournaments/${tournament.id}/bracket`)

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(bracketBtn)

      return interaction.editReply({ embeds: [embed], components: [row] })
    } catch (err) {
      this.container.logger.error(`tournament bracket error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }

  private statusBadge(status: string): string {
    const map: Record<string, string> = {
      DRAFT: '📝 Draft',
      REGISTRATION_OPEN: '✍️ Registration Open',
      REGISTRATION_CLOSED: '🕐 Registration Closed',
      CHECK_IN: '☑️ Check-in',
      LIVE: '🔴 Live',
      COMPLETED: '✅ Completed',
      CANCELLED: '❌ Cancelled',
      ARCHIVED: '📦 Archived',
    }
    return map[status] ?? status
  }

  private generateBracketArt(
    matches: Array<{
      id: string
      number: number
      participants: Array<{ team: { name: string } }>
    }>,
    teamCount: number,
  ): string | null {
    if (teamCount === 4) {
      return this.generate4TeamBracket(matches)
    } else if (teamCount === 8) {
      return this.generate8TeamBracket(matches)
    }
    return null
  }

  private generate4TeamBracket(
    matches: Array<{
      id: string
      number: number
      participants: Array<{ team: { name: string } }>
    }>,
  ): string {
    // Expected: 3 matches total (2 semis + 1 final)
    const semi1 = matches.find(m => m.number === 1)
    const semi2 = matches.find(m => m.number === 2)
    const final = matches.find(m => m.number === 3)

    const t1 = semi1?.participants[0]?.team.name ?? 'TBD'
    const t2 = semi1?.participants[1]?.team.name ?? 'TBD'
    const t3 = semi2?.participants[0]?.team.name ?? 'TBD'
    const t4 = semi2?.participants[1]?.team.name ?? 'TBD'
    const winner1 = final?.participants[0]?.team.name ?? 'TBD'
    const winner2 = final?.participants[1]?.team.name ?? 'TBD'

    const pad = (str: string, len = 14) => str.padEnd(len, ' ').substring(0, len)

    return [
      `${pad(t1)} ─┐`,
      `              ├──> ${pad(winner1)} ─┐`,
      `${pad(t2)} ─┘                      │`,
      `                                  ├──> FINAL WINNER`,
      `${pad(t3)} ─┐                      │`,
      `              ├──> ${pad(winner2)} ─┘`,
      `${pad(t4)} ─┘`,
    ].join('\n')
  }

  private generate8TeamBracket(
    matches: Array<{
      id: string
      number: number
      participants: Array<{ team: { name: string } }>
    }>,
  ): string {
    // Expected: 7 matches total (4 quarters + 2 semis + 1 final)
    const q1 = matches.find(m => m.number === 1)
    const q2 = matches.find(m => m.number === 2)
    const q3 = matches.find(m => m.number === 3)
    const q4 = matches.find(m => m.number === 4)
    const s1 = matches.find(m => m.number === 5)
    const s2 = matches.find(m => m.number === 6)
    const f  = matches.find(m => m.number === 7)

    const t1 = q1?.participants[0]?.team.name ?? 'TBD'
    const t2 = q1?.participants[1]?.team.name ?? 'TBD'
    const t3 = q2?.participants[0]?.team.name ?? 'TBD'
    const t4 = q2?.participants[1]?.team.name ?? 'TBD'
    const t5 = q3?.participants[0]?.team.name ?? 'TBD'
    const t6 = q3?.participants[1]?.team.name ?? 'TBD'
    const t7 = q4?.participants[0]?.team.name ?? 'TBD'
    const t8 = q4?.participants[1]?.team.name ?? 'TBD'
    const w1 = s1?.participants[0]?.team.name ?? 'TBD'
    const w2 = s1?.participants[1]?.team.name ?? 'TBD'
    const w3 = s2?.participants[0]?.team.name ?? 'TBD'
    const w4 = s2?.participants[1]?.team.name ?? 'TBD'
    const f1 = f?.participants[0]?.team.name ?? 'TBD'
    const f2 = f?.participants[1]?.team.name ?? 'TBD'

    const pad = (str: string, len = 12) => str.padEnd(len, ' ').substring(0, len)

    return [
      `${pad(t1)} ─┐`,
      `            ├──> ${pad(w1)} ─┐`,
      `${pad(t2)} ─┘                 │`,
      `                            ├──> ${pad(f1)} ─┐`,
      `${pad(t3)} ─┐                 │                 │`,
      `            ├──> ${pad(w2)} ─┘                 │`,
      `${pad(t4)} ─┘                                   │`,
      `                                                ├──> CHAMPION`,
      `${pad(t5)} ─┐                                   │`,
      `            ├──> ${pad(w3)} ─┐                 │`,
      `${pad(t6)} ─┘                 │                 │`,
      `                            ├──> ${pad(f2)} ─┘`,
      `${pad(t7)} ─┐                 │`,
      `            ├──> ${pad(w4)} ─┘`,
      `${pad(t8)} ─┘`,
    ].join('\n')
  }
}
