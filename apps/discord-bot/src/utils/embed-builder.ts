import { EmbedBuilder } from 'discord.js'
import { COLORS, DIVIDER, GAME_ICON, SHARD_LABEL } from './constants'

// ---------------------------------------------------------------------------
// Embed kind → color map
// ---------------------------------------------------------------------------
type EmbedKind = 'success' | 'error' | 'info' | 'warning' | 'tournament' | 'live' | 'neutral'

const KIND_COLORS: Record<EmbedKind, number> = {
  success:    COLORS.SUCCESS,
  error:      COLORS.ERROR,
  info:       COLORS.INFO,
  warning:    COLORS.WARNING,
  tournament: COLORS.TOURNAMENT,
  live:       COLORS.LIVE,
  neutral:    COLORS.NEUTRAL,
}

// ---------------------------------------------------------------------------
// ShadowEmbed — fluent wrapper around discord.js EmbedBuilder
// ---------------------------------------------------------------------------
export class ShadowEmbed {
  private readonly embed: EmbedBuilder

  constructor() {
    this.embed = new EmbedBuilder()
  }

  /** Set the semantic kind (controls accent color). */
  setKind(kind: EmbedKind): this {
    this.embed.setColor(KIND_COLORS[kind])
    return this
  }

  /**
   * Set title in SHADØW style: `<emoji> ACTION.UPPER — Entity`
   * e.g. setTitle('🏆', 'standings', 'BGMI Open') → `🏆 STANDINGS — BGMI Open`
   */
  setTitle(emoji: string, action: string, entity?: string): this {
    const title = entity
      ? `${emoji} ${action.toUpperCase()} — ${entity}`
      : `${emoji} ${action.toUpperCase()}`
    this.embed.setTitle(title)
    return this
  }

  /** Set the embed description. */
  setDescription(text: string): this {
    this.embed.setDescription(text)
    return this
  }

  /** Add a single field (inline defaults to true). */
  addField(name: string, value: string, inline = true): this {
    this.embed.addFields({ name, value, inline })
    return this
  }

  /**
   * Add an array of { name, value } fields grouped 3-per-row (inline: true).
   * Any remainder fields (< 3) are also inline.
   */
  addInlineFields(fields: Array<{ name: string; value: string }>): this {
    this.embed.addFields(fields.map(f => ({ name: f.name, value: f.value, inline: true })))
    return this
  }

  /** Set thumbnail to the game's icon URL (keyed by Game enum string). */
  setGameThumbnail(game: string): this {
    const url = GAME_ICON[game]
    if (url) this.embed.setThumbnail(url)
    return this
  }

  /** Set thumbnail to an arbitrary URL. */
  setThumbnail(url: string): this {
    this.embed.setThumbnail(url)
    return this
  }

  /** Set banner image (large image at the bottom of the embed). */
  setBanner(url: string): this {
    this.embed.setImage(url)
    return this
  }

  /**
   * Set the standard SHADØW footer.
   * Format: `SHADØW TOURNAMENTS • SHARD AP-SOUTH-1[ • <extra>]`
   */
  setFooter(extra?: string): this {
    const text = extra
      ? `SHADØW TOURNAMENTS • ${SHARD_LABEL} • ${extra}`
      : `SHADØW TOURNAMENTS • ${SHARD_LABEL}`
    this.embed.setFooter({ text })
    return this
  }

  /** Set the embed timestamp to now. */
  setTimestamp(): this {
    this.embed.setTimestamp()
    return this
  }

  /** Return the underlying EmbedBuilder for use in interaction replies. */
  build(): EmbedBuilder {
    return this.embed
  }
}

/** Return the divider string (48 em-dashes). */
export function divider(): string {
  return DIVIDER
}
