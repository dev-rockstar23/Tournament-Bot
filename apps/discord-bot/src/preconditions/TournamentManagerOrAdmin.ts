import { Precondition } from '@sapphire/framework'
import type { ChatInputCommandInteraction } from 'discord.js'
import { AppRole, roleAtLeast, resolveUserRole } from '@esports/permissions'
import prisma from '@esports/database'
import { permissionDeniedEmbed } from '../utils/responses'

/**
 * Precondition that checks if the user has TOURNAMENT_MANAGER, SERVER_ADMIN role,
 * or is the server owner.
 * 
 * This enforces that only authorized users can access tournament management,
 * server configuration, and other admin commands.
 */
export class TournamentManagerOrAdminPrecondition extends Precondition {
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId || !interaction.guild || !interaction.user) {
      return this.error({
        message: 'This command can only be used in a server.',
      })
    }

    // Check if user is server owner - they always have access
    if (interaction.guild.ownerId === interaction.user.id) {
      return this.ok()
    }

    try {
      // Resolve user's role from the role binding system
      const role = await resolveUserRole({
        prisma,
        userId: interaction.user.id,
        guildId: interaction.guildId,
        botToken: process.env.DISCORD_BOT_TOKEN!,
      })

      // Check if user has at least TOURNAMENT_MANAGER role (value 3)
      // This includes TOURNAMENT_MANAGER and SERVER_ADMIN
      if (roleAtLeast(role, AppRole.TOURNAMENT_MANAGER)) {
        return this.ok()
      }

      // User doesn't have sufficient permissions
      return this.error({
        message: 'You need Tournament Manager or Server Admin role to use this command. ' +
                 'Ask a server admin to assign you the correct role using `/server roles add`.',
      })
    } catch (error) {
      this.container.logger.error('Failed to check permissions:', error)
      return this.error({
        message: 'Could not verify your permissions. Please try again in a moment.',
      })
    }
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    TournamentManagerOrAdmin: never
  }
}
