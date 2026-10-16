import { Command } from '@sapphire/framework'
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js'
import prisma from '@esports/database'
import { errorEmbed, genericErrorEmbed } from '../../utils/responses'

const BRAND_COLOR = 0x7c3aed

export class MatchRoomCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'room',
      description: 'Get room credentials for your match (private).',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('room')
        .setDescription('Get room credentials for your match (private).')
        .addStringOption(opt =>
          opt
            .setName('match')
            .setDescription('Match ID')
            .setRequired(true),
        ),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    // CRITICAL: Always ephemeral — room credentials must NEVER be posted to a channel
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

      // 2. Validate match is in LIVE or READY status
      if (match.status !== 'LIVE' && match.status !== 'READY') {
        return interaction.editReply({
          embeds: [errorEmbed(`Room credentials are not available for matches with status: **${match.status}**.`)],
        })
      }

      // 3. Find room credentials
      const credential = await prisma.roomCredential.findUnique({
        where: { matchId },
        select: { roomId: true, password: true, releaseAt: true, expiresAt: true },
      })

      if (!credential) {
        return interaction.editReply({
          embeds: [errorEmbed('Room credentials have not been set for this match yet.')],
        })
      }

      // 4. Validate credentials are released
      if (credential.releaseAt > new Date()) {
        const releaseTs = Math.floor(credential.releaseAt.getTime() / 1000)
        return interaction.editReply({
          embeds: [errorEmbed(`Room credentials will be available <t:${releaseTs}:R>.`)],
        })
      }

      // 5. Look up DB user by Discord ID
      const dbUser = await prisma.user.findFirst({
        where: { discordId: userId },
        select: { id: true },
      })

      if (!dbUser) {
        return interaction.editReply({
          embeds: [errorEmbed('Your user profile was not found. Please complete registration first.')],
        })
      }

      // 6. Validate user is captain of a checked-in team in this match
      const participant = await prisma.matchParticipant.findFirst({
        where: {
          matchId,
          checkedIn: true,
          team: { captainId: dbUser.id, guildId },
        },
        select: { id: true },
      })

      if (!participant) {
        return interaction.editReply({
          embeds: [errorEmbed('You must be the captain of a checked-in team to view room credentials.')],
        })
      }

      // 7. Reply ephemerally ONLY — never post credentials to channel
      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle(`🔑 Room Details — Match #${match.number}`)
        .setDescription(
          [
            `**Room ID:** \`${credential.roomId}\``,
            `**Password:** \`${credential.password}\``,
            '',
            '⚠️ Keep these private! Do not share in any public channel.',
          ].join('\n'),
        )
        .setTimestamp()
        .setFooter({ text: 'Legendary Esports — credentials are ephemeral and visible only to you' })

      return interaction.editReply({ embeds: [embed] })
    } catch (err) {
      this.container.logger.error(`match room error: ${err}`)
      return interaction.editReply({ embeds: [genericErrorEmbed()] })
    }
  }
}
