import { Listener, Events } from '@sapphire/framework'
import type { Client } from 'discord.js'

export class ReadyListener extends Listener<typeof Events.ClientReady> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, once: true, event: Events.ClientReady })
  }

  public async run(client: Client<true>) {
    const { username, id } = client.user
    this.container.logger.info(`✨ ${username} (${id}) is online and ready!`)
    this.container.logger.info(`📡 Serving ${client.guilds.cache.size} server(s)`)

    // Log registered global commands
    try {
      const commands = await client.application.commands.fetch()
      this.container.logger.info(`📋 ${commands.size} global slash command(s) registered`)
      commands.forEach(cmd => this.container.logger.info(`  /${cmd.name}`))
    } catch (err) {
      this.container.logger.error(`Failed to fetch commands: ${err}`)
    }
  }
}
