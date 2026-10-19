import { Listener, Events } from '@sapphire/framework'
import type { Client } from 'discord.js'

export class ReadyListener extends Listener<typeof Events.ClientReady> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, once: true, event: Events.ClientReady })
  }

  public async run(client: Client<true>) {
    const { username, id } = client.user
    const guildCount = client.guilds.cache.size
    this.container.logger.info(`╔══════════════════════════════════════════════╗`)
    this.container.logger.info(`║     SHADØW TOURNAMENTS — BOT ONLINE          ║`)
    this.container.logger.info(`╚══════════════════════════════════════════════╝`)
    this.container.logger.info(`✨ ${username} (${id}) is online and ready!`)
    this.container.logger.info(`📡 Serving ${guildCount} server(s)`)
    this.container.logger.info(`🌐 SHARD AP-SOUTH-1 • SHADØW TOURNAMENTS`)
  }
}
