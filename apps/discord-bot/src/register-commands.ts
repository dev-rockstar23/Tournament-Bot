/**
 * One-time script to register all slash commands to a specific guild instantly.
 * Usage: npx tsx src/register-commands.ts
 * Set DISCORD_GUILD_ID env var to target a specific server, or leave empty for global.
 */
import 'dotenv/config'
import { REST, Routes } from 'discord.js'

const commands = [
  {
    name: 'setup',
    description: 'Run the SHADØW server setup wizard to configure channels, roles and timezone.',
  },
  {
    name: 'help',
    description: 'View SHADØW command reference and usage guides.',
  },
  {
    name: 'support',
    description: 'Get support links, report a bug or request a feature.',
  },
  {
    name: 'server',
    description: 'Manage server settings, branding and role bindings.',
  },
  {
    name: 'tournament',
    description: 'Create and manage tournaments (create, edit, publish, standings and more).',
  },
  {
    name: 'register',
    description: 'Register your team for an open tournament.',
  },
  {
    name: 'match',
    description: 'Schedule, generate, result and dispute match management.',
  },
  {
    name: 'winners',
    description: 'View the winners podium for a concluded tournament.',
  },
  {
    name: 'points',
    description: 'Calculate and display live tournament standings.',
  },
  {
    name: 'analytics',
    description: 'View server analytics summary or export tournament data as CSV.',
  },
  {
    name: 'pt',
    description: 'Prize template (PT) store, licensing and image generation.',
  },
]

const token = process.env.DISCORD_BOT_TOKEN!
const clientId = process.env.DISCORD_CLIENT_ID ?? '1560641364646035470'
const guildId = process.env.DISCORD_GUILD_ID

const rest = new REST().setToken(token)

async function main() {
  try {
    console.log(`Registering ${commands.length} commands...`)

    if (guildId) {
      // Guild commands — instant (no propagation delay)
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
      console.log(`✅ Registered ${commands.length} commands to guild ${guildId}`)
    } else {
      // Global commands — up to 1 hour to propagate
      await rest.put(Routes.applicationCommands(clientId), { body: commands })
      console.log(`✅ Registered ${commands.length} global commands`)
    }
  } catch (err) {
    console.error('Failed to register commands:', err)
    process.exit(1)
  }
}

main()
