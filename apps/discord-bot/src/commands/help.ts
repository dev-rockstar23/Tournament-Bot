import { Command } from '@sapphire/framework'
import {
  ActionRowBuilder,
  ComponentType,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js'
import { ShadowEmbed } from '../utils/embed-builder'
import { e } from '../utils/emojis'

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
      { name: '/tournament create',      description: 'Create a new tournament via the wizard.' },
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
// Build a module page embed for a single category
// ---------------------------------------------------------------------------
function buildModulePage(category: CommandCategory, moduleIndex: number, total: number): EmbedBuilder {
  const lines = category.commands.map(c => `\`${c.name}\`  —  ${c.description}`)

  return new ShadowEmbed()
    .setKind('info')
    .setTitle(e('help'), 'SHADØW TOURNAMENTS — Command Reference')
    .setDescription(`Module ${moduleIndex + 1}/${total} · ${category.label}`)
    .addField(`${category.emoji} ${category.label}`, lines.join('\n'), false)
    .setFooter(`Module ${moduleIndex + 1} of ${total}`)
    .setTimestamp()
    .build()
}

// ---------------------------------------------------------------------------
// Build the dropdown select menu listing all categories
// ---------------------------------------------------------------------------
function buildModuleSelectRow(): ActionRowBuilder<StringSelectMenuBuilder> {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('help_module')
    .setPlaceholder('Select a command module…')
    .addOptions(
      CATEGORIES.map((cat, idx) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(cat.label)
          .setValue(String(idx))
          .setEmoji(cat.emoji),
      ),
    )

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)
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
        .setDescription('Show the SHADØW TOURNAMENTS command reference.'),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const total = CATEGORIES.length

    // Show the first category immediately
    const initialEmbed = buildModulePage(CATEGORIES[0]!, 0, total)
    const selectRow    = buildModuleSelectRow()

    const msg = await interaction.editReply({
      embeds:     [initialEmbed],
      components: [selectRow],
    })

    // Listen for dropdown selections for 5 minutes
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      filter:        i => i.customId === 'help_module' && i.user.id === interaction.user.id,
      time:          5 * 60 * 1000,
    })

    collector.on('collect', async sel => {
      const idx      = parseInt(sel.values[0] ?? '0', 10)
      const category = CATEGORIES[idx] ?? CATEGORIES[0]!
      const embed    = buildModulePage(category, idx, total)
      await sel.update({ embeds: [embed], components: [selectRow] })
    })

    collector.on('end', async () => {
      // Disable the dropdown once the collector expires
      const disabledMenu = new StringSelectMenuBuilder()
        .setCustomId('help_module')
        .setPlaceholder('Session expired — run /help again.')
        .setDisabled(true)
        .addOptions(
          CATEGORIES.map((cat, idx) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(cat.label)
              .setValue(String(idx))
              .setEmoji(cat.emoji),
          ),
        )

      const disabledRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(disabledMenu)
      await interaction.editReply({ components: [disabledRow] }).catch(() => null)
    })
  }
}
