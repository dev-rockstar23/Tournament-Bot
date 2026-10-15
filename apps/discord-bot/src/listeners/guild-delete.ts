import { Listener, Events } from '@sapphire/framework'
import type { Guild } from 'discord.js'
import prisma from '@esports/database'

export class GuildDeleteListener extends Listener<typeof Events.GuildDelete> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.GuildDelete })
  }

  public async run(guild: Guild) {
    this.container.logger.info(`👋 Left guild: ${guild.name} (${guild.id})`)

    await prisma.discordServer.updateMany({
      where: { guildId: guild.id },
      data:  { isActive: false },
    })
  }
}
