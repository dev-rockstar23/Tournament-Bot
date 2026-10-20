/**
 * /register — Redirects players to the registration channel.
 * The actual registration is done by posting in the configured channel.
 */

import { Command } from '@sapphire/framework'
import { type ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import prisma from '@esports/database'

export class RegisterCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'register',
      description: 'How to register for a tournament.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('register')
        .setDescription('How to register for a tournament in this server.'),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const guildId = interaction.guildId!

    const activeTournament = await prisma.tournament.findFirst({
      where: { guildId, status: 'REGISTRATION_OPEN' },
      select: {
        id: true,
        name: true,
        game: true,
        rosterMin: true,
        rosterMax: true,
        teamCapacity: true,
        acceptedCount: true,
        registrationChannelId: true,
      },
      orderBy: { registrationOpenAt: 'desc' },
    }).catch(() => null)

    const channelMention = activeTournament?.registrationChannelId
      ? `<#${activeTournament.registrationChannelId}>`
      : '*(not configured — ask an admin to configure tournament channels)*'

    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle('📋 How to Register')
      .setDescription(
        activeTournament
          ? [
              `**Active Tournament:** ${activeTournament.name}`,
              `**Slots:** ${activeTournament.acceptedCount}/${activeTournament.teamCapacity}`,
              `**Players per team:** ${activeTournament.rosterMin}–${activeTournament.rosterMax}`,
              '',
              `Go to ${channelMention} and post your registration in this format:`,
              '',
              '```',
              'Team Name',
              '@Player1 @Player2 @Player3 @Player4',
              'IGN1 | IGN2 | IGN3 | IGN4',
              '```',
              '',
              '**Rules:**',
              `• Minimum **${activeTournament.rosterMin}** Discord @mentions required`,
              `• Maximum **${activeTournament.rosterMax}** players (including substitute)`,
              '• No duplicate players across teams',
              '• Bot will react ✅ if approved, ❌ if rejected',
              '• Approved registrations are posted in the approved channel',
            ].join('\n')
          : [
              '⚠️ There is no active tournament open for registration right now.',
              '',
              `When registration opens, go to ${channelMention} and post your registration in this format:`,
              '',
              '```',
              'Team Name',
              '@Player1 @Player2 @Player3 @Player4',
              'IGN1 | IGN2 | IGN3 | IGN4',
              '```',
              '',
              '**Rules:**',
              '• Minimum **2** Discord @mentions required',
              '• Maximum **5** players (4 starters + 1 sub)',
              '• No duplicate players across teams',
              '• Bot reacts ✅ = approved, ❌ = rejected with reason',
            ].join('\n'),
      )
      .setFooter({ text: 'SHADØW TOURNAMENTS • Channel Registration System' })
      .setTimestamp()

    await interaction.editReply({ embeds: [embed] })
  }
}
