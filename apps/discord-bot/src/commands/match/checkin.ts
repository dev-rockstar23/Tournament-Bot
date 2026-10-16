import { Command } from '@sapphire/framework'
import { type ChatInputCommandInteraction } from 'discord.js'
import prisma from '@esports/database'
import { successEmbed, errorEmbed, genericErrorEmbed } from '../../utils/responses'

export class MatchCheckinCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'checkin',
      description: 'Check in for an upcoming match.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('checkin')
        .setDescription('Check in for an upcoming match.')
        .addStringOption(opt =>
          opt
            .setName('match')
            .setDescription('Match ID')
            .setRequired(true),
        ),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const matchId = interaction.options.getString('match', true)
    const guildId = interaction.guildId!
    const userId = interaction.user.id

    try {
      // 1. Find match scoped to guildId
      const match = await prisma.match.findFirst({
        where: { id: matchId, guildId },
        select: { id: true, status: true, number: true },
      })

      if (!match) {
        return interaction.editReply({
          embeds: [errorEmbed(`Match \`${matchId}\` not found in this server.`)],
        })
      }

      // 2. Validate match is in CHECK_IN or READY status
      if (match.status !== 'CHECK_IN' && match.status !== 'READY') {
        return interaction.editReply({
          embeds: [errorEmbed(`Check-in is not open for this match (status: **${match.status}**).`)],
        })
      }

      // 3. Look up DB user by Discord ID
      const dbUser = await prisma.user.findFirst({
        where: { discordId: userId },
        select: { id: true },
      })

      if (!dbUser) {
        return interaction.editReply({
          embeds: [errorEmbed('Your user profile was not found. Please complete registration first.')],
        })
      }

      // 4. Find MatchParticipant for a team captained by this user in this guild
      const participant = await prisma.matchParticipant.findFirst({
        where: {
          matchId,
          team: { captainId: dbUser.id, guildId },
        },
        select: { id: true, checkedIn: true },
      })

      if (!participant) {
        return interaction.editReply({
          embeds: [errorEmbed('You are not the captain of any team participating in this match.')],
        })
      }

      if (participant.checkedIn) {
        return interaction.editReply({
          embeds: [errorEmbed('Your team has already checked in for this match.')],
        })
      }

      // 5. Mark checked in
      await prisma.matchParticipant.update({
        where: { id: participant.id },
        data: { checkedIn: true, checkedInAt: new Date() },
      })

      return interaction.editReply({
        embeds: [
          successEmbed(
            'Checked In!',
            `☑️ Your team is confirmed for Match #${match.number}.`,
          ),
        ],
      })
    } catch (err) {
      this.container.logger.error(`match checkin error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }
}
