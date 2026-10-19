import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  type ChatInputCommandInteraction,
} from 'discord.js'

// ---------------------------------------------------------------------------
// paginate — build an array of EmbedBuilder pages from a flat item list
// ---------------------------------------------------------------------------

export interface PaginateResult<T> {
  pages: EmbedBuilder[]
  /** Original items split into chunks */
  chunks: T[][]
}

/**
 * Split `items` into pages of `pageSize` items each and call `renderPage`
 * for every chunk, returning the resulting EmbedBuilder array.
 */
export function paginate<T>(
  items: T[],
  pageSize: number,
  renderPage: (page: T[], pageIndex: number, totalPages: number) => EmbedBuilder,
): PaginateResult<T> {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += pageSize) {
    chunks.push(items.slice(i, i + pageSize))
  }

  const totalPages = Math.max(chunks.length, 1)

  // Guarantee at least one page even when items is empty
  if (chunks.length === 0) chunks.push([])

  const pages = chunks.map((chunk, idx) => renderPage(chunk, idx, totalPages))

  return { pages, chunks }
}

// ---------------------------------------------------------------------------
// createPaginatorCollector — send page 0, then swap on button clicks
// ---------------------------------------------------------------------------

function buildRow(page: number, total: number): ActionRowBuilder<ButtonBuilder> {
  const prev = new ButtonBuilder()
    .setCustomId('paginator_prev')
    .setLabel('◀ Prev')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page === 0)

  const counter = new ButtonBuilder()
    .setCustomId('paginator_counter')
    .setLabel(`${page + 1} / ${total}`)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true)

  const next = new ButtonBuilder()
    .setCustomId('paginator_next')
    .setLabel('Next ▶')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page >= total - 1)

  return new ActionRowBuilder<ButtonBuilder>().addComponents(prev, counter, next)
}

/**
 * Send `pages[0]` with Prev/Next navigation buttons, then await button
 * interactions from the original user until 60 s of inactivity.
 *
 * The interaction must already be deferred (`deferReply`).
 */
export async function createPaginatorCollector(
  interaction: ChatInputCommandInteraction,
  pages: EmbedBuilder[],
  ephemeral: boolean,
): Promise<void> {
  const total = pages.length

  if (total === 0) return

  let current = 0

  const reply = await interaction.editReply({
    embeds:     [pages[current]!],
    components: total > 1 ? [buildRow(current, total)] : [],
  })

  if (total <= 1) return

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter:        i => i.user.id === interaction.user.id,
    idle:          60_000,
  })

  collector.on('collect', async btn => {
    if (btn.customId === 'paginator_prev' && current > 0)        current--
    else if (btn.customId === 'paginator_next' && current < total - 1) current++

    await btn.update({
      embeds:     [pages[current]!],
      components: [buildRow(current, total)],
    })
  })

  collector.on('end', async () => {
    // Remove buttons when the collector expires
    try {
      await interaction.editReply({
        embeds:     [pages[current]!],
        components: [],
      })
    } catch {
      // interaction may have already been cleaned up — ignore
    }
  })
}
