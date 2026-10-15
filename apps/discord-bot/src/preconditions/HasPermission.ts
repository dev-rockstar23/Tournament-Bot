import { Precondition, type PreconditionOptions } from '@sapphire/framework'
import type { ChatInputCommandInteraction } from 'discord.js'
import { AppRole, roleAtLeast, resolveUserRole } from '@esports/permissions'
import prisma from '@esports/database'
import { e } from '../utils/emojis'

interface HasPermissionOptions extends PreconditionOptions {
  requiredRole: AppRole
}

export class HasPermissionPrecondition extends Precondition {
  private readonly requiredRole: AppRole

  public constructor(context: Precondition.LoaderContext, options: HasPermissionOptions) {
    super(context, options)
    this.requiredRole = options.requiredRole
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId || !interaction.user) {
      return this.error({ message: `${e('error')} This command requires a server context.` })
    }

    try {
      const role = await resolveUserRole({
        prisma,
        userId: interaction.user.id,
        guildId: interaction.guildId,
        botToken: process.env.DISCORD_BOT_TOKEN!,
      })

      if (!roleAtLeast(role, this.requiredRole)) {
        return this.error({
          message: `${e('error')} You don't have permission for that. Ask a server admin to assign you the correct role using \`/server roles add\`.`,
        })
      }

      return this.ok()
    } catch {
      return this.error({ message: `${e('error')} Could not verify your permissions. Try again in a moment.` })
    }
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    HasPermission: never
  }
}
