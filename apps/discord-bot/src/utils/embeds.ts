import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js'
import { ShadowEmbed } from './embed-builder'
import { WEB_BASE } from './constants'
import { discordTs } from './time'
import { e } from './emojis'

// ---------------------------------------------------------------------------
// Welcome embed — shown when the bot first joins a server
// ---------------------------------------------------------------------------
export function buildWelcomeEmbed(serverName: string): EmbedBuilder {
  return new ShadowEmbed()
    .setKind('tournament')
    .setTitle(e('trophy'), 'welcome', serverName)
    .setDescription(
      [
        `${e('trophy')} **SHADØW** is here and ready to power your competitive scene.`,
        '',
        '**Supported games**',
        `${e('bgmi')} BGMI  •  ${e('freeFire')} Free Fire  •  ${e('codm')} COD Mobile`,
        '',
        '**What you get**',
        '• Full tournament lifecycle — registration, check-in, match room release, results & standings — all inside Discord',
        '• Role-based access control so your admins, referees and players each see the right commands',
        '• Automatic announcements, live standings and winner showcases',
        '',
        `${e('lightning')} **Get started now:** run \`/setup\` to configure channels, roles and your timezone.`,
        '',
        `🌐 Visit the web dashboard for advanced settings and analytics: **${WEB_BASE}**`,
      ].join('\n'),
    )
    .setFooter()
    .setTimestamp()
    .build()
}

// ---------------------------------------------------------------------------
// Tournament embed
// ---------------------------------------------------------------------------
function gameEmoji(game: string): string {
  const map: Record<string, string> = {
    BGMI:       e('bgmi'),
    FREE_FIRE:  e('freeFire'),
    COD_MOBILE: e('codm'),
  }
  return map[game] ?? e('trophy')
}

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    DRAFT:                `${e('draft')} Draft`,
    REGISTRATION_OPEN:    `${e('register')} Registration Open`,
    REGISTRATION_CLOSED:  `${e('upcoming')} Registration Closed`,
    CHECK_IN:             `${e('checkin')} Check-in`,
    LIVE:                 `${e('live')} Live`,
    COMPLETED:            `${e('completed')} Completed`,
    CANCELLED:            `${e('cancelled')} Cancelled`,
    ARCHIVED:             '📦 Archived',
  }
  return map[status] ?? status
}

function blockBar(filled: number, total: number, width = 10): string {
  const ratio = total > 0 ? Math.round((filled / total) * width) : 0
  return '█'.repeat(ratio) + '░'.repeat(width - ratio)
}

export function buildTournamentEmbed(tournament: Record<string, unknown>): EmbedBuilder {
  const game     = String(tournament.game ?? '')
  const name     = String(tournament.name ?? 'Tournament')
  const status   = String(tournament.status ?? '')
  const accepted = Number(tournament.acceptedCount ?? 0)
  const capacity = Number(tournament.teamCapacity ?? 0)
  const startAt  = (tournament.startAt ?? null) as Date | string | null
  const endAt    = (tournament.endAt ?? null) as Date | string | null
  const regOpen  = (tournament.registrationOpenAt ?? null) as Date | string | null
  const regClose = (tournament.registrationCloseAt ?? null) as Date | string | null

  const builder = new ShadowEmbed()
    .setKind('tournament')
    .setTitle(gameEmoji(game), name)
    .addInlineFields([
      { name: 'Status',   value: statusBadge(status)                                      },
      { name: 'Game',     value: game.replace(/_/g, ' ')                                  },
      { name: 'Capacity', value: `${accepted}/${capacity}\n${blockBar(accepted, capacity)}` },
      { name: 'Starts',   value: discordTs(startAt)                                       },
      { name: 'Ends',     value: discordTs(endAt)                                         },
    ])
    .addField('Registration', `${discordTs(regOpen)} → ${discordTs(regClose)}`, false)
    .setFooter()
    .setTimestamp()

  if (tournament.bannerUrl) builder.setBanner(String(tournament.bannerUrl))
  if (tournament.description) builder.setDescription(String(tournament.description))

  return builder.build()
}

// ---------------------------------------------------------------------------
// Match embed
// ---------------------------------------------------------------------------
export function buildMatchEmbed(match: Record<string, unknown>): EmbedBuilder {
  const num       = Number(match.number ?? 0)
  const status    = String(match.status ?? '')
  const map       = String(match.map ?? 'TBD')
  const scheduled = (match.scheduledStart ?? null) as Date | string | null

  return new ShadowEmbed()
    .setKind('tournament')
    .setTitle(e('room'), `Match #${num}`)
    .addInlineFields([
      { name: 'Status',    value: statusBadge(status) },
      { name: 'Map',       value: map                 },
      { name: 'Scheduled', value: discordTs(scheduled)},
    ])
    .setFooter()
    .setTimestamp()
    .build()
}

// ---------------------------------------------------------------------------
// Standings embed
// ---------------------------------------------------------------------------
export function buildStandingsEmbed(
  standings: Array<{ rank: number; teamName: string; points: number; kills: number }>,
): EmbedBuilder {
  const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

  const rows = standings.map(({ rank, teamName, points, kills }) => {
    const prefix = medals[rank] ?? `**${rank}.**`
    return `${prefix} **${teamName}** — ${points} pts • ${kills} kills`
  })

  return new ShadowEmbed()
    .setKind('tournament')
    .setTitle(e('trophy'), 'Standings')
    .setDescription(rows.length ? rows.join('\n') : 'No standings yet.')
    .setFooter()
    .setTimestamp()
    .build()
}

// ---------------------------------------------------------------------------
// Health embed
// ---------------------------------------------------------------------------
export function buildHealthEmbed(health: {
  database: string
  redis: string
  outboxBacklog: number
  lastSync: Date | null
}): EmbedBuilder {
  const dbStatus    = health.database === 'connected' ? '✅ Connected' : '❌ Disconnected'
  const redisStatus = health.redis    === 'connected' ? '✅ Connected' : '❌ Disconnected'
  const lastSync    = health.lastSync ? discordTs(health.lastSync) : '—'

  return new ShadowEmbed()
    .setKind('neutral')
    .setTitle(e('bot'), 'System Health')
    .addInlineFields([
      { name: 'Database', value: dbStatus    },
      { name: 'Redis',    value: redisStatus },
      { name: 'Outbox Backlog', value: String(health.outboxBacklog) },
    ])
    .addField('Last Sync', lastSync, false)
    .setFooter()
    .setTimestamp()
    .build()
}

// ---------------------------------------------------------------------------
// Timezone prompt embed
// ---------------------------------------------------------------------------
export function buildTimezonePromptEmbed(): EmbedBuilder {
  return new ShadowEmbed()
    .setKind('info')
    .setTitle('🌏', 'Set Your Server Timezone')
    .setDescription(
      [
        'Choosing the right timezone means all tournament schedules, match times and announcements',
        'will display correctly for your community.',
        '',
        '**Why it matters**',
        '• Match rooms are released at the right local time',
        '• Registration deadlines are clear to participants',
        '• Standings and results timestamps are accurate',
        '',
        '**Examples**',
        '`Asia/Kolkata` — IST (UTC+5:30)',
        '`Asia/Singapore` — SGT (UTC+8)',
        '`Europe/London` — GMT/BST',
        '`America/New_York` — EST/EDT',
        '',
        'Use the select menu below to pick your timezone.',
      ].join('\n'),
    )
    .build()
}

// ---------------------------------------------------------------------------
// Timezone select menu — unchanged
// ---------------------------------------------------------------------------
export function buildTimezoneSelectMenu(): ActionRowBuilder<StringSelectMenuBuilder> {
  const timezones: Array<{ label: string; value: string; emoji: string }> = [
    { label: 'Asia/Kolkata (IST, UTC+5:30)',       value: 'Asia/Kolkata',        emoji: '🇮🇳' },
    { label: 'Asia/Singapore (SGT, UTC+8)',         value: 'Asia/Singapore',      emoji: '🇸🇬' },
    { label: 'Asia/Tokyo (JST, UTC+9)',             value: 'Asia/Tokyo',          emoji: '🇯🇵' },
    { label: 'Asia/Shanghai (CST, UTC+8)',          value: 'Asia/Shanghai',       emoji: '🇨🇳' },
    { label: 'Asia/Dubai (GST, UTC+4)',             value: 'Asia/Dubai',          emoji: '🇦🇪' },
    { label: 'Asia/Bangkok (ICT, UTC+7)',           value: 'Asia/Bangkok',        emoji: '🇹🇭' },
    { label: 'Asia/Jakarta (WIB, UTC+7)',           value: 'Asia/Jakarta',        emoji: '🇮🇩' },
    { label: 'Europe/London (GMT/BST)',             value: 'Europe/London',       emoji: '🇬🇧' },
    { label: 'Europe/Berlin (CET/CEST)',            value: 'Europe/Berlin',       emoji: '🇩🇪' },
    { label: 'Europe/Paris (CET/CEST)',             value: 'Europe/Paris',        emoji: '🇫🇷' },
    { label: 'America/New_York (EST/EDT)',          value: 'America/New_York',    emoji: '🇺🇸' },
    { label: 'America/Los_Angeles (PST/PDT)',       value: 'America/Los_Angeles', emoji: '🇺🇸' },
    { label: 'America/Chicago (CST/CDT)',           value: 'America/Chicago',     emoji: '🇺🇸' },
    { label: 'America/Sao_Paulo (BRT)',             value: 'America/Sao_Paulo',   emoji: '🇧🇷' },
    { label: 'Australia/Sydney (AEST/AEDT)',        value: 'Australia/Sydney',    emoji: '🇦🇺' },
    { label: 'Pacific/Auckland (NZST/NZDT)',        value: 'Pacific/Auckland',    emoji: '🇳🇿' },
    { label: 'UTC',                                 value: 'UTC',                 emoji: '🌐' },
  ]

  const menu = new StringSelectMenuBuilder()
    .setCustomId('setup_timezone')
    .setPlaceholder('Select your server timezone…')
    .addOptions(
      timezones.map(tz =>
        new StringSelectMenuOptionBuilder()
          .setLabel(tz.label)
          .setValue(tz.value)
          .setEmoji(tz.emoji),
      ),
    )

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)
}
