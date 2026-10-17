import 'dotenv/config'
import { SapphireClient, ApplicationCommandRegistries, RegisterBehavior } from '@sapphire/framework'
import '@sapphire/plugin-logger/register'
import { GatewayIntentBits, Partials } from 'discord.js'

// Always bulk-overwrite commands so they stay in sync on every restart
ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite)

const client = new SapphireClient({
  baseUserDirectory: __dirname,
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.GuildMember],
  loadMessageCommandListeners: false,
})

client.login(process.env.DISCORD_BOT_TOKEN)
