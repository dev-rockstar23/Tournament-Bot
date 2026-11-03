/**
 * Discord utility helpers for the web app.
 *
 * Bot invite permissions breakdown (integer 412317240384):
 *   VIEW_CHANNEL              0x400
 *   SEND_MESSAGES             0x800
 *   SEND_MESSAGES_IN_THREADS  0x4000000
 *   MANAGE_MESSAGES           0x2000
 *   EMBED_LINKS               0x4000
 *   ATTACH_FILES              0x8000
 *   READ_MESSAGE_HISTORY      0x10000
 *   MENTION_EVERYONE          0x20000
 *   USE_EXTERNAL_EMOJIS       0x40000
 *   ADD_REACTIONS             0x40
 *   MANAGE_CHANNELS           0x10
 *   MANAGE_ROLES              0x10000000
 *   MANAGE_WEBHOOKS           0x20000000
 *
 * We intentionally avoid the "Administrator" (0x8) permission — Discord
 * displays a scary warning and some servers block bots that request it.
 * The permissions above cover everything SHADØW actually needs.
 */

const BOT_PERMISSIONS = '412317240384'

/**
 * Returns the Discord bot OAuth2 invite URL.
 * Optionally pre-selects a guild so the dropdown is pre-filled.
 */
export function getBotInviteUrl(guildId?: string): string {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID

  if (!clientId) {
    console.warn('[discord] NEXT_PUBLIC_DISCORD_CLIENT_ID is not set')
    return '#'
  }

  const params = new URLSearchParams({
    client_id: clientId,
    permissions: BOT_PERMISSIONS,
    scope: 'bot applications.commands',
  })

  if (guildId) {
    params.set('guild_id', guildId)
    // disable_guild_select=true locks the dropdown to the chosen server
    params.set('disable_guild_select', 'true')
  }

  return `https://discord.com/oauth2/authorize?${params.toString()}`
}

/**
 * Returns the URL for a Discord guild icon.
 * Falls back to null if either argument is missing.
 */
export function getGuildIconUrl(
  guildId: string,
  icon: string | null,
  size = 128,
): string | null {
  if (!icon) return null
  const ext = icon.startsWith('a_') ? 'gif' : 'png'
  return `https://cdn.discordapp.com/icons/${guildId}/${icon}.${ext}?size=${size}`
}
