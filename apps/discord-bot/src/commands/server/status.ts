import { Command } from '@sapphire/framework'
import { PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js'
import { AppRole, resolveUserRole } from '@esports/permissions'
import prisma from '@esports/database'
import { buildHealthEmbed } from '../../utils/embeds'
import { permissionDeniedEmbed, genericErrorEmbed } from '../../utils/responses'

export class ServerStatusCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'status',
      description: 'Show the health and configuration status of the bot for this server.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('status')
        .setDescription('Show the health and configuration status of the bot for this server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    try {
      const role = await resolveUserRole({
        prisma,
        userId:   interaction.user.id,
        guildId:  interaction.guildId!,
        botToken: process.env.DISCORD_BOT_TOKEN!,
      })

      if (role < AppRole.TOURNAMENT_MANAGER) {
        return interaction.editReply({ embeds: [permissionDeniedEmbed()] })
      }

      const outboxBacklog = await prisma.outboxEvent.count({
        where: { status: 'PENDING', guildId: interaction.guildId! },
      })

      const embed = buildHealthEmbed({
        database:     'connected',
        redis:        'connected',
        outboxBacklog,
        lastSync:     null,
      })

      return interaction.editReply({ embeds: [embed] })
    } catch (err) {
      this.container.logger.error(`ServerStatusCommand error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }
}
