import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js'
import { e } from './emojis'

const BRAND_COLOR = 0x7c3aed

// ---------------------------------------------------------------------------
// Welcome embed — shown when the bot first joins a server
// ---------------------------------------------------------------------------
export function buildWelcomeEmbed(serverName: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`Hey ${serverName}! Your new tournament companion has arrived.`)
    .setDescription(
      [
        `${e('trophy')} **Legendary Esports Bot** is here and ready to power your competitive scene.`,
        '',
        '**Supported games**',
        `${e('bgmi')} BGMI  •  ${e('freeFire')} Free Fire  •  ${e('codm')} COD Mobile`,
        '',
        '**What you get**',
        '• Full tournament lifecycle — registration, check-in, match room release, results & standings — all inside Discord',
        '• Role-based access control so your admins, referees and players each see the right commands',
        '• Automatic announcements, live standings and winner showcases',
        '',
        `${e('lightning')} **Get started now:** run \`/server setup\` to configure channels, roles and your timezone.`,
        '',
        '🌐 Visit the web dashboard for advanced tournament settings and analytics: **https://legendary-esports.gg**',
      ].join('\n'),
    )
    .setFooter({ text: 'Legendary Esports' })
    .setTimestamp()
}

// ---------------------------------------------------------------------------
// Tournament embed
// ---------------------------------------------------------------------------
function gameEmoji(game: string): string {
  const map: Record<string, string> = {
    BGMI: e('bgmi'),
    FREE_FIRE: e('freeFire'),
    COD_MOBILE: e('codm'),
  }
  return map[game] ?? e('trophy')
}

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    DRAFT: `${e('draft')} Draft`,
    REGISTRATION_OPEN: `${e('register')} Registration Open`,
    REGISTRATION_CLOSED: `${e('upcoming')} Registration Closed`,
    CHECK_IN: `${e('checkin')} Check-in`,
    LIVE: `${e('live')} Live`,
    COMPLETED: `${e('completed')} Completed`,
    CANCELLED: `${e('cancelled')} Cancelled`,
    ARCHIVED: '📦 Archived',
  }
  return map[status] ?? status
}

function blockBar(filled: number, total: number, width = 10): string {
  const ratio = total > 0 ? Math.round((filled / total) * width) : 0
  return '█'.repeat(ratio) + '░'.repeat(width - ratio)
}

function discordTs(date: unknown): string {
  if (!date) return '—'
  const d = date instanceof Date ? date : new Date(date as string)
  return `<t:${Math.floor(d.getTime() / 1000)}:F>`
}

export function buildTournamentEmbed(tournament: Record<string, unknown>): EmbedBuilder {
  const game       = String(tournament.game ?? '')
  const name       = String(tournament.name ?? 'Tournament')
  const status     = String(tournament.status ?? '')
  const accepted   = Number(tournament.acceptedCount ?? 0)
  const capacity   = Number(tournament.teamCapacity ?? 0)
  const startAt    = tournament.startAt
  const endAt      = tournament.endAt
  const regOpen    = tournament.registrationOpenAt
  const regClose   = tournament.registrationCloseAt

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`${gameEmoji(game)} ${name}`)
    .addFields(
      { name: 'Status',        value: statusBadge(status),                    inline: true  },
      { name: 'Game',          value: game.replace(/_/g, ' '),                 inline: true  },
      { name: 'Capacity',      value: `${accepted}/${capacity}\n${blockBar(accepted, capacity)}`, inline: true  },
      { name: 'Starts',        value: discordTs(startAt),                      inline: true  },
      { name: 'Ends',          value: discordTs(endAt),                        inline: true  },
      { name: 'Registration',  value: `${discordTs(regOpen)} → ${discordTs(regClose)}`, inline: false },
    )
    .setTimestamp()

  if (tournament.bannerUrl) embed.setImage(String(tournament.bannerUrl))
  if (tournament.description) embed.setDescription(String(tournament.description))

  return embed
}

// ---------------------------------------------------------------------------
// Match embed
// ---------------------------------------------------------------------------
export function buildMatchEmbed(match: Record<string, unknown>): EmbedBuilder {
  const num       = Number(match.number ?? 0)
  const status    = String(match.status ?? '')
  const map       = String(match.map ?? 'TBD')
  const scheduled = match.scheduledStart

  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`${e('room')} Match #${num}`)
    .addFields(
      { name: 'Status',    value: statusBadge(status), inline: true  },
      { name: 'Map',       value: map,                  inline: true  },
      { name: 'Scheduled', value: discordTs(scheduled), inline: false },
    )
    .setTimestamp()
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

  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`${e('trophy')} Standings`)
    .setDescription(rows.length ? rows.join('\n') : 'No standings yet.')
    .setTimestamp()
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

  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`${e('bot')} System Health`)
    .addFields(
      { name: 'Database',      value: dbStatus,                          inline: true  },
      { name: 'Redis',         value: redisStatus,                       inline: true  },
      { name: 'Outbox Backlog', value: String(health.outboxBacklog),     inline: true  },
      { name: 'Last Sync',     value: lastSync,                          inline: false },
    )
    .setTimestamp()
}

// ---------------------------------------------------------------------------
// Timezone prompt embed
// ---------------------------------------------------------------------------
export function buildTimezonePromptEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle('🌏 Set Your Server Timezone')
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
}

// ---------------------------------------------------------------------------
// Timezone select menu
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
