// ---------------------------------------------------------------------------
// Global constants for the SHADØW Discord bot
// ---------------------------------------------------------------------------

export const WEB_BASE   = process.env['WEB_BASE_URL'] ?? 'https://shadow-tournaments.vercel.app'
export const SHARD_LABEL = 'SHARD AP-SOUTH-1'

// Brand / semantic colors (0xRRGGBB)
export const COLORS = {
  SUCCESS:    0x22c55e,
  ERROR:      0xef4444,
  INFO:       0x06b6d4,
  WARNING:    0xf59e0b,
  TOURNAMENT: 0x7c3aed,
  LIVE:       0xef4444,
  NEUTRAL:    0x1e293b,
} as const

export const SUCCESS_COLOR    = COLORS.SUCCESS
export const ERROR_COLOR      = COLORS.ERROR
export const INFO_COLOR       = COLORS.INFO
export const WARNING_COLOR    = COLORS.WARNING
export const TOURNAMENT_COLOR = COLORS.TOURNAMENT
export const LIVE_COLOR       = COLORS.LIVE
export const NEUTRAL_COLOR    = COLORS.NEUTRAL

// Per-game icon URLs (placeholder paths; replace with real CDN URLs when assets are ready)
export const GAME_ICON: Record<string, string> = {
  BGMI:       `${WEB_BASE}/icons/bgmi.png`,
  FREE_FIRE:  `${WEB_BASE}/icons/free_fire.png`,
  COD_MOBILE: `${WEB_BASE}/icons/cod_mobile.png`,
}

// Decorative divider — 48 em-dashes
export const DIVIDER = '─'.repeat(48)
