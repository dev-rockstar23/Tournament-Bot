import 'dotenv/config'
import { SapphireClient, ApplicationCommandRegistries, RegisterBehavior } from '@sapphire/framework'
import '@sapphire/plugin-logger/register'
import { GatewayIntentBits, Partials } from 'discord.js'
import { join } from 'path'

// Always bulk-overwrite commands so they stay in sync on every restart
ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite)

const client = new SapphireClient({
  // Explicit path ensures Sapphire finds commands/listeners/preconditions
  // regardless of where the process is started from
  baseUserDirectory: join(__dirname),
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.GuildMember],
  loadMessageCommandListeners: false,
  logger: {
    level: 20, // Info level
  },
})

client.login(process.env.DISCORD_BOT_TOKEN)
  .then(() => console.log('Bot login initiated...'))
  .catch(err => {
    console.error('Failed to login:', err)
    process.exit(1)
  })
