import { Command } from '@sapphire/framework'
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js'
import { ShadowEmbed } from '../utils/embed-builder'
import { e } from '../utils/emojis'
import { paginate, createPaginatorCollector } from '../utils/paginator'

// ---------------------------------------------------------------------------
// Command catalogue — used to build categorized help
// ---------------------------------------------------------------------------
interface CommandEntry {
  name: string
  description: string
}

interface CommandCategory {
  label: string
  emoji: string
  commands: CommandEntry[]
}

const CATEGORIES: CommandCategory[] = [
  {
    label: 'SETUP & SERVER',
    emoji: '⚙️',
    commands: [
      { name: '/setup',                 description: 'Run the server setup wizard (timezone, server record).' },
      { name: '/server status',         description: 'Show system health and bot configuration for this server.' },
      { name: '/server branding',       description: 'Set server logo, accent color, and banner.' },
      { name: '/server roles list',     description: 'List all Discord→app role bindings.' },
      { name: '/server roles add',      description: 'Bind a Discord role to an app permission level.' },
      { name: '/server roles remove',   description: 'Remove a role binding.' },
      { name: '/server roles members',  description: 'Show member counts per app role.' },
    ],
  },
  {
    label: 'TOURNAMENTS',
    emoji: '🏆',
    commands: [
      { name: '/tournament create',      description: 'Create a new tournament.' },
      { name: '/tournament edit',        description: 'Edit tournament details.' },
      { name: '/tournament publish',     description: 'Open registration for a tournament.' },
      { name: '/tournament cancel',      description: 'Cancel a tournament.' },
      { name: '/tournament delete',      description: 'Delete a draft tournament.' },
      { name: '/tournament list',        description: 'List tournaments with optional filters.' },
      { name: '/tournament info',        description: 'Show detailed information for a tournament.' },
      { name: '/tournament participants',description: 'List registered teams.' },
      { name: '/tournament standings',   description: 'Show live standings.' },
      { name: '/tournament slots',       description: 'View slot matrix (filled/available).' },
      { name: '/tournament delay',       description: 'Delay tournament start.' },
      { name: '/tournament reopen',      description: 'Reopen registration.' },
      { name: '/tournament finalize',    description: 'Lock results and compute winners.' },
      { name: '/tournament archive',     description: 'Archive a completed tournament.' },
      { name: '/register',               description: 'Register a team for a tournament.' },
    ],
  },
  {
    label: 'MATCHES',
    emoji: '⚔️',
    commands: [
      { name: '/match schedule',   description: 'Schedule a single match.' },
      { name: '/match generate',   description: 'Bulk-generate matches for a tournament.' },
      { name: '/match reschedule', description: 'Reschedule an existing match.' },
      { name: '/match checkin',    description: 'Open check-in for a match.' },
      { name: '/match result',     description: 'Submit match results.' },
      { name: '/match approve',    description: 'Approve submitted results.' },
      { name: '/match dispute',    description: 'Raise a dispute on a match.' },
      { name: '/match resolve',    description: 'Resolve a dispute (referee+).' },
      { name: '/match room get',   description: 'Get room credentials (ephemeral).' },
      { name: '/match room set',   description: 'Set room credentials for a match.' },
      { name: '/match room release',description: 'Release room credentials to the match channel.' },
    ],
  },
  {
    label: 'PLAYERS',
    emoji: '👥',
    commands: [
      { name: '/winners view', description: 'View tournament winners / podium.' },
      { name: '/points calc',  description: 'Calculate standings and point totals.' },
    ],
  },
  {
    label: 'ANALYTICS & PT',
    emoji: '📊',
    commands: [
      { name: '/analytics summary', description: 'Server-wide tournament statistics.' },
      { name: '/analytics export',  description: 'Export tournament data as CSV.' },
      { name: '/pt store',          description: 'Browse available PT designs.' },
      { name: '/pt view',           description: 'View the PT design for a tournament.' },
      { name: '/pt assign',         description: 'Assign a PT design to a tournament.' },
      { name: '/pt buy',            description: 'Purchase a PT design license.' },
      { name: '/pt verify',         description: 'Verify/activate a license (admin).' },
      { name: '/pt licenses',       description: 'List licenses for a tournament.' },
      { name: '/pt revoke',         description: 'Revoke a license (admin).' },
      { name: '/pt preview',        description: '(Phase 4) Preview generated PT image.' },
      { name: '/pt generate',       description: '(Phase 4) Generate PT image.' },
      { name: '/pt post',           description: '(Phase 4) Post PT image to announcement channel.' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Detailed per-command data for /help <command>
// ---------------------------------------------------------------------------
const COMMAND_DETAILS: Record<string, { description: string; options?: string[] }> = {
  setup:           { description: 'Runs the server setup wizard. Upserts the server record and opens a timezone picker. Requires Manage Guild permission.', options: ['(none)'] },
  'server status': { description: 'Displays system health: database connection, Redis status, outbox backlog, and last sync time.', options: ['(none)'] },
  'server branding': { description: 'Updates server branding stored in server settings.', options: ['logo_url (optional)', 'accent_color (optional)', 'banner_url (optional)'] },
  'server roles list': { description: 'Lists all Discord role → app role bindings for this guild.', options: ['(none)'] },
  'server roles add': { description: 'Opens an interactive flow: select a Discord role, then select an app permission level.', options: ['(interactive select menus)'] },
  'server roles remove': { description: 'Opens an interactive select to remove a role binding.', options: ['(interactive select menu)'] },
  'server roles members': { description: 'Lists each bound Discord role with its member count.', options: ['(none)'] },
  register: { description: 'Opens a modal to register your team for a tournament. Atomically reserves a slot.', options: ['tournament (required) — Tournament ID'] },
  analytics: { description: 'Server analytics. Use `summary` or `export`.', options: ['game (optional) — filter by game'] },
  winners:   { description: 'View tournament winners and podium.', options: ['tournament (required) — Tournament ID'] },
  help:      { description: 'This help command! Optionally pass a command name for detailed info.', options: ['command (optional) — command name'] },
  support:   { description: 'Display support links, documentation, and bug report instructions.', options: ['(none)'] },
}

function buildDetailEmbed(commandName: string): EmbedBuilder {
  const detail = COMMAND_DETAILS[commandName]

  if (!detail) {
    return new ShadowEmbed()
      .setKind('warning')
      .setTitle(e('help'), `/${commandName}`)
      .setDescription(`No detailed help found for \`/${commandName}\`.\n\nRun \`/help\` without arguments to see all commands.`)
      .setFooter()
      .build()
  }

  const builder = new ShadowEmbed()
    .setKind('info')
    .setTitle(e('help'), 'COMMAND HELP', `/${commandName}`)
    .setDescription(detail.description)
    .setFooter()
    .setTimestamp()

  if (detail.options && detail.options.length > 0) {
    builder.addField('Options', detail.options.map(o => `• \`${o}\``).join('\n'), false)
  }

  return builder.build()
}

function buildCategoryPage(
  categories: CommandCategory[],
  pageIndex: number,
  totalPages: number,
): EmbedBuilder {
  const builder = new ShadowEmbed()
    .setKind('info')
    .setTitle(e('help'), 'SHADØW TOURNAMENTS — Command Reference')
    .setFooter(`Page ${pageIndex + 1} of ${totalPages}`)
    .setTimestamp()

  for (const cat of categories) {
    const lines = cat.commands.map(c => `\`${c.name}\` — ${c.description}`)
    builder.addField(`${cat.emoji} ${cat.label}`, lines.join('\n'), false)
  }

  return builder.build()
}

export class HelpCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'help',
      description: 'Show the SHADØW TOURNAMENTS command reference.',
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('help')
        .setDescription('Show the SHADØW TOURNAMENTS command reference.')
        .addStringOption(opt =>
          opt
            .setName('command')
            .setDescription('Command name for detailed help, e.g. "server status"')
            .setRequired(false),
        ),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const commandName = interaction.options.getString('command')

    if (commandName) {
      const embed = buildDetailEmbed(commandName.toLowerCase().trim())
      return interaction.editReply({ embeds: [embed] })
    }

    // Build pages — group categories into pages of 5 each (≤25 fields per embed)
    const PAGE_SIZE = 5
    const { pages } = paginate(
      CATEGORIES,
      PAGE_SIZE,
      (cats, idx, total) => buildCategoryPage(cats, idx, total),
    )

    await createPaginatorCollector(interaction, pages, true)
  }
}
