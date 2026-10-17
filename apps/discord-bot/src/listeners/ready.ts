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
  }
}
