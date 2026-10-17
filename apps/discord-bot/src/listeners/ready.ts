import { Listener, Events } from '@sapphire/framework'
import { REST, Routes } from 'discord.js'
import type { Client } from 'discord.js'

// All slash commands defined here — registered globally on every startup
const COMMANDS = [
  { name: 'analytics',    description: 'View server analytics and leaderboards.' },
  { name: 'register',     description: 'Register for a tournament.' },
  { name: 'winners',      description: 'View the winners of a tournament.' },
  { name: 'approve',      description: 'Review and approve or reject submitted match results.' },
  { name: 'checkin',      description: 'Check in for an upcoming match.' },
  { name: 'dispute',      description: 'File a dispute for a match result.' },
  { name: 'result',       description: 'Submit match results.' },
  { name: 'room',         description: 'Get room credentials for your match.' },
  { name: 'schedule',     description: 'View upcoming match schedule for a tournament.' },
  { name: 'setup',        description: 'Run the server setup wizard to configure the bot.' },
  { name: 'status',       description: 'Show the health and configuration status of the bot.' },
  { name: 'bracket',      description: 'View tournament bracket.' },
  { name: 'cancel',       description: 'Cancel a tournament.' },
  { name: 'create',       description: 'Launch the tournament creation wizard.' },
  { name: 'edit',         description: 'Edit an existing tournament.' },
  { name: 'info',         description: 'View detailed info about a tournament.' },
  { name: 'list',         description: 'List all tournaments for this server.' },
  { name: 'participants', description: 'View registered participants for a tournament.' },
  { name: 'publish',      description: 'Publish a tournament and open registration.' },
  { name: 'standings',    description: 'View live standings for a tournament.' },
]

export class ReadyListener extends Listener<typeof Events.ClientReady> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, once: true, event: Events.ClientReady })
  }

  public async run(client: Client<true>) {
    const { username, id } = client.user
    this.container.logger.info(`✨ ${username} (${id}) is online and ready!`)
    this.container.logger.info(`📡 Serving ${client.guilds.cache.size} server(s)`)

    // Register all slash commands globally via REST
    try {
      const rest = new REST({ version: '10', userAgentAppendix: 'LegendaryEsports/1.0' }).setToken(process.env.DISCORD_BOT_TOKEN!)
      await rest.put(Routes.applicationCommands(id), { body: COMMANDS })
      this.container.logger.info(`✅ Registered ${COMMANDS.length} global slash commands`)
    } catch (err) {
      this.container.logger.error(`❌ Failed to register commands: ${err}`)
    }
  }
}
