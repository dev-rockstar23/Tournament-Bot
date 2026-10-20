import { EmbedBuilder } from 'discord.js'
import { ShadowEmbed } from './embed-builder'
import { e } from './emojis'
import { WEB_BASE } from './constants'
import { discordTs, countdown, gameLabel } from './time'

// ---------------------------------------------------------------------------
// Existing exports — kept with identical names and signatures
// ---------------------------------------------------------------------------

export function successEmbed(title: string, description: string): EmbedBuilder {
  return new ShadowEmbed()
    .setKind('success')
    .setTitle(e('success'), title)
    .setDescription(description)
    .setFooter()
    .build()
}

export function errorEmbed(description: string): EmbedBuilder {
  return new ShadowEmbed()
    .setKind('error')
    .setTitle(e('error'), 'Error')
    .setDescription(description)
    .setFooter()
    .build()
}

export function warningEmbed(title: string, description: string): EmbedBuilder {
  return new ShadowEmbed()
    .setKind('warning')
    .setTitle(e('warning'), title)
    .setDescription(description)
    .setFooter()
    .build()
}

export function infoEmbed(title: string, description: string): EmbedBuilder {
  return new ShadowEmbed()
    .setKind('info')
    .setDescription(description)
    .build()
    .setTitle(title) // title may contain emoji prefix from callers — pass through as-is
}

export function permissionDeniedEmbed(): EmbedBuilder {
  return errorEmbed(
    "You don't have permission to do that. Ask a server admin to assign you the correct role using `/server roles add`.",
  )
}

export function notFoundEmbed(entityType: string): EmbedBuilder {
  return warningEmbed(
    'Not Found',
    `The ${entityType} you're looking for doesn't exist or may have been removed.`,
  )
}

export function genericErrorEmbed(): EmbedBuilder {
  return errorEmbed('Something went wrong on our end. Please try again in a moment.')
}

export function loadingEmbed(): EmbedBuilder {
  return new ShadowEmbed()
    .setKind('neutral')
    .setDescription(`${e('loading')} On it...`)
    .build()
}

export function noResultsEmbed(): EmbedBuilder {
  return new ShadowEmbed()
    .setKind('info')
    .setTitle(e('upcoming'), 'Nothing Here Yet')
    .setDescription('There are no results to display right now.')
    .setFooter()
    .build()
}

export function brandFooter(embed: EmbedBuilder, serverName: string): EmbedBuilder {
  return embed.setFooter({ text: `SHADØW TOURNAMENTS • ${serverName}` })
}

// ---------------------------------------------------------------------------
// New exports
// ---------------------------------------------------------------------------

/**
 * Full tournament card embed — kind 'tournament', inline field grid,
 * countdown to registration close, dashboard link.
 */
export function legendaryTournamentEmbed(tournament: Record<string, unknown>): EmbedBuilder {
  const game       = String(tournament.game ?? '')
  const name       = String(tournament.name ?? 'Tournament')
  const status     = String(tournament.status ?? '')
  const format     = String(tournament.registrationFormat ?? tournament.mode ?? '—').replace(/_/g, ' ')
  const accepted   = Number(tournament.acceptedCount ?? 0)
  const capacity   = Number(tournament.teamCapacity ?? 0)
  const regClose   = (tournament.registrationCloseAt ?? null) as Date | string | null
  const startAt    = (tournament.startAt ?? null) as Date | string | null
  const id         = String(tournament.id ?? '')
  const code       = tournament.tournamentCode ? Number(tournament.tournamentCode) : null

  const statusBadge: Record<string, string> = {
    DRAFT:                `${e('draft')} Draft`,
    REGISTRATION_OPEN:    `${e('register')} Open`,
    REGISTRATION_CLOSED:  `${e('upcoming')} Reg. Closed`,
    CHECK_IN:             `${e('checkin')} Check-in`,
    LIVE:                 `${e('live')} Live`,
    COMPLETED:            `${e('completed')} Completed`,
    CANCELLED:            `${e('cancelled')} Cancelled`,
    ARCHIVED:             '📦 Archived',
  }

  const title = code ? `#${code} - ${name}` : name

  const builder = new ShadowEmbed()
    .setKind('tournament')
    .setTitle(e('trophy'), 'tournament', title)
    .setGameThumbnail(game)
    .addInlineFields([
      { name: 'CODE',       value: code ? `#${code}` : '—'    },
      { name: 'GAME',       value: gameLabel(game)             },
      { name: 'FORMAT',     value: format                      },
      { name: 'CAPACITY',   value: `${accepted} / ${capacity}` },
      { name: 'STATUS',     value: statusBadge[status] ?? status },
      { name: 'STARTS',     value: discordTs(startAt)          },
      { name: 'REG. CLOSES',value: regClose ? `${discordTs(regClose, 'F')} (${countdown(regClose)})` : '—' },
    ])
    .addField('Dashboard', `[View on SHADØW](${WEB_BASE}/tournaments/${id})`, false)
    .setFooter()
    .setTimestamp()

  if (tournament.bannerUrl) builder.setBanner(String(tournament.bannerUrl))
  if (tournament.description) builder.setDescription(String(tournament.description))

  return builder.build()
}

/**
 * Match card embed — kind 'live' when match is LIVE, else 'tournament'.
 */
export function legendaryMatchEmbed(match: Record<string, unknown>): EmbedBuilder {
  const num       = Number(match.number ?? 0)
  const status    = String(match.status ?? '')
  const map       = String(match.map ?? 'TBD')
  const mode      = String(match.mode ?? 'TBD').replace(/_/g, ' ')
  const scheduled = (match.scheduledStart ?? null) as Date | string | null
  const isLive    = status === 'LIVE'

  return new ShadowEmbed()
    .setKind(isLive ? 'live' : 'tournament')
    .setTitle(e('matchIcon'), `match #${String(num).padStart(2, '0')}`, map)
    .addInlineFields([
      { name: 'SCHEDULED', value: discordTs(scheduled) },
      { name: 'MAP',       value: map                  },
      { name: 'MODE',      value: mode                 },
    ])
    .setFooter()
    .setTimestamp()
    .build()
}

/**
 * Standings embed — medal rows with points and kill counts.
 */
export function legendaryStandingsEmbed(
  tournamentName: string,
  standings: Array<{ rank: number; teamName: string; points: number; kills: number }>,
  matchInfo?: string,
): EmbedBuilder {
  const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

  const rows = standings.map(({ rank, teamName, points, kills }) => {
    const prefix = medals[rank] ?? `**${rank}.**`
    return `${prefix} **${teamName}** — ${points} pts • ${kills} kills`
  })

  const builder = new ShadowEmbed()
    .setKind('tournament')
    .setTitle(e('scoreboard'), 'live standings', tournamentName)
    .setDescription(rows.length ? rows.join('\n') : 'No standings recorded yet.')

  if (matchInfo) builder.addField('Matches', matchInfo, false)

  return builder.setFooter().setTimestamp().build()
}

/**
 * Slot matrix embed — capacity bar + per-slot status grid.
 */
export function slotMatrixEmbed(
  tournament: Record<string, unknown>,
  slotRows: Array<{ slot: number; teamName: string; status: string }>,
): EmbedBuilder {
  const name     = String(tournament.name ?? 'Tournament')
  const capacity = Number(tournament.teamCapacity ?? 0)
  const accepted = Number(tournament.acceptedCount ?? 0)

  // Fill bar (10 chars wide)
  const filled = capacity > 0 ? Math.round((accepted / capacity) * 10) : 0
  const bar    = '█'.repeat(filled) + '░'.repeat(10 - filled)
  const summary = `${bar}  ${accepted}/${capacity} slots filled`

  const STATUS_ICON: Record<string, string> = {
    APPROVED:   '✅',
    PENDING:    '⏳',
    WAITLISTED: '🔒',
  }

  const grid = slotRows
    .map(r => {
      const icon = STATUS_ICON[r.status] ?? '⬜'
      return `${icon} **#${r.slot}** ${r.teamName}`
    })
    .join('\n') || 'No registrations yet.'

  return new ShadowEmbed()
    .setKind('tournament')
    .setTitle(e('slot'), 'slot matrix', name)
    .setDescription(`${summary}\n\n${grid}`)
    .setFooter()
    .setTimestamp()
    .build()
}

/**
 * Phase 4 placeholder embed — shown for PT image generation commands.
 */
export function comingPhase4Embed(feature: string): EmbedBuilder {
  return new ShadowEmbed()
    .setKind('info')
    .setTitle(e('phase4'), 'coming in phase 4')
    .setDescription(
      `**${feature}** image generation is planned for Phase 4 of the SHADØW roadmap and is not yet available.\n\nStay tuned for updates in the support server.`,
    )
    .setFooter()
    .build()
}
