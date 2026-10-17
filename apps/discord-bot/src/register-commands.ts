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
    description: 'Run the server setup wizard to configure Legendary Esports Bot.',
  },
  {
    name: 'tournament',
    description: 'Manage tournaments.',
  },
  {
    name: 'register',
    description: 'Register for a tournament.',
  },
  {
    name: 'match',
    description: 'Match-related commands.',
  },
  {
    name: 'winners',
    description: 'View tournament winners.',
  },
  {
    name: 'analytics',
    description: 'View server analytics.',
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
