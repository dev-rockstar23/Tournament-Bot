import { Listener, Events } from '@sapphire/framework'
import type { Guild } from 'discord.js'
import prisma from '@esports/database'
import { buildWelcomeEmbed, buildTimezonePromptEmbed, buildTimezoneSelectMenu } from '../utils/embeds'

export class GuildCreateListener extends Listener<typeof Events.GuildCreate> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.GuildCreate })
  }

  public async run(guild: Guild) {
    this.container.logger.info(`✅ Joined guild: ${guild.name} (${guild.id})`)

    // Persist server record
    await prisma.discordServer.upsert({
      where:  { guildId: guild.id },
      update: { name: guild.name, icon: guild.icon, ownerId: guild.ownerId, isActive: true },
      create: { guildId: guild.id, name: guild.name, icon: guild.icon, ownerId: guild.ownerId },
    })

    // Persist default settings — timezone defaults to UTC, not yet configured
    await prisma.serverSettings.upsert({
      where:  { guildId: guild.id },
      update: {},
      create: { guildId: guild.id, timezone: 'UTC', timezoneConfigured: false },
    })

    // Find a channel to post into
    const me = guild.members.me
    const channel =
      guild.systemChannel ??
      (guild.channels.cache.find(
        c => c.isTextBased() && (me ? c.permissionsFor(me)?.has('SendMessages') ?? false : false),
      ) as import('discord.js').TextChannel | undefined)

    if (!channel || !channel.isTextBased()) {
      this.container.logger.warn(`⚠️ No suitable channel found in ${guild.name} (${guild.id})`)
      return
    }

    try {
      await channel.send({ embeds: [buildWelcomeEmbed(guild.name)] })
      await channel.send({
        embeds:     [buildTimezonePromptEmbed()],
        components: [buildTimezoneSelectMenu()],
      })
    } catch (err) {
      this.container.logger.error(`Failed to send welcome message in ${guild.name}: ${err}`)
    }
  }
}
