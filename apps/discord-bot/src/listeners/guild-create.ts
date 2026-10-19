import { Listener, Events } from '@sapphire/framework'
import type { Guild } from 'discord.js'
import prisma from '@esports/database'
import { buildWelcomeEmbed } from '../utils/embeds'

export class GuildCreateListener extends Listener<typeof Events.GuildCreate> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.GuildCreate })
  }

  public async run(guild: Guild) {
    this.container.logger.info(
      `✅ SHADØW joined guild: ${guild.name} (${guild.id}) — ${guild.memberCount} members`,
    )

    // Persist server record
    await prisma.discordServer.upsert({
      where:  { guildId: guild.id },
      update: { name: guild.name, icon: guild.icon, ownerId: guild.ownerId, isActive: true },
      create: { guildId: guild.id, name: guild.name, icon: guild.icon, ownerId: guild.ownerId },
    })

    // Persist default settings
    await prisma.serverSettings.upsert({
      where:  { guildId: guild.id },
      update: {},
      create: { guildId: guild.id, timezone: 'UTC', timezoneConfigured: false },
    })

    // DM the server owner — never post in a public channel
    try {
      const owner = await guild.fetchOwner()
      const dmChannel = await owner.createDM()
      await dmChannel.send({
        embeds: [buildWelcomeEmbed(guild.name)],
      })
      this.container.logger.info(`📩 Welcome DM sent to owner ${owner.user.tag} for ${guild.name}`)
    } catch (err) {
      // Owner has DMs disabled — fall back to system channel silently
      this.container.logger.warn(
        `⚠️ Could not DM owner of ${guild.name} (${guild.id}): ${err}. Falling back to system channel.`,
      )

      const me = guild.members.me
      const channel =
        guild.systemChannel ??
        (guild.channels.cache.find(
          c =>
            c.isTextBased() &&
            (me ? (c.permissionsFor(me)?.has('SendMessages') ?? false) : false),
        ) as import('discord.js').TextChannel | undefined)

      if (channel?.isTextBased()) {
        await channel.send({ embeds: [buildWelcomeEmbed(guild.name)] }).catch(() => null)
      }
    }
  }
}
