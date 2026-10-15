import 'dotenv/config'
import { SapphireClient } from '@sapphire/framework'
import '@sapphire/plugin-logger/register'
import { GatewayIntentBits, Partials } from 'discord.js'

const client = new SapphireClient({
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
