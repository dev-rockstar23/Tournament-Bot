// Custom emoji IDs — replace EMOJI_ID placeholders with real IDs after uploading
// to the bot's Application Emojis page on Discord Developer Portal
export const EMOJIS = {
  // Status
  live:       'EMOJI_live',
  upcoming:   'EMOJI_upcoming',
  completed:  'EMOJI_completed',
  cancelled:  'EMOJI_cancelled',
  draft:      'EMOJI_draft',
  // Actions
  register:   'EMOJI_register',
  checkin:    'EMOJI_checkin',
  results:    'EMOJI_results',
  dispute:    'EMOJI_dispute',
  room:       'EMOJI_room',
  // Games
  bgmi:       'EMOJI_bgmi',
  freeFire:   'EMOJI_freefire',
  codm:       'EMOJI_codm',
  // Celebration
  trophy:     'EMOJI_trophy',
  crown:      'EMOJI_crown',
  fire:       'EMOJI_fire',
  lightning:  'EMOJI_lightning',
  // Awards
  gold:       '🥇',
  silver:     '🥈',
  bronze:     '🥉',
  mvp:        '🌟',
  // System
  loading:    'EMOJI_loading',
  success:    'EMOJI_success',
  error:      'EMOJI_error',
  warning:    'EMOJI_warning',
  sync:       'EMOJI_sync',
  bot:        'EMOJI_bot',
} as const

// Helper to format an emoji — falls back to text emoji if custom ID starts with EMOJI_
export function e(key: keyof typeof EMOJIS): string {
  const val = EMOJIS[key]
  if (typeof val === 'string' && val.startsWith('EMOJI_')) {
    const fallbacks: Record<string, string> = {
      EMOJI_live: '🔴', EMOJI_upcoming: '🕐', EMOJI_completed: '✅',
      EMOJI_cancelled: '❌', EMOJI_draft: '📝', EMOJI_register: '✍️',
      EMOJI_checkin: '☑️', EMOJI_results: '📊', EMOJI_dispute: '⚠️',
      EMOJI_room: '🔑', EMOJI_bgmi: '🎮', EMOJI_freefire: '🔥',
      EMOJI_codm: '🎯', EMOJI_trophy: '🏆', EMOJI_crown: '👑',
      EMOJI_fire: '🔥', EMOJI_lightning: '⚡', EMOJI_loading: '⏳',
      EMOJI_success: '✅', EMOJI_error: '❌', EMOJI_warning: '⚠️',
      EMOJI_sync: '🔄', EMOJI_bot: '🤖',
    }
    return fallbacks[val] ?? '•'
  }
  return val
}
