import { Command } from '@sapphire/framework'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ChatInputCommandInteraction,
} from 'discord.js'
import prisma from '@esports/database'
import { successEmbed, errorEmbed, infoEmbed, permissionDeniedEmbed, genericErrorEmbed } from '../../utils/responses'

const WEB_BASE = 'https://legendary-esports.gg'

export class TournamentCreateCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'create',
      description: 'Launch the tournament creation wizard.',
      preconditions: ['GuildOnly'],
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('create')
        .setDescription('Launch the tournament creation wizard.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ embeds: [permissionDeniedEmbed()], ephemeral: true })
    }

    // Step 1: Show modal for tournament name
    const modal = new ModalBuilder()
      .setCustomId('tcreate_modal')
      .setTitle('Create Tournament')

    const nameInput = new TextInputBuilder()
      .setCustomId('tcreate_name')
      .setLabel('Tournament Name')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100)
      .setPlaceholder('e.g. Season 5 BGMI Championship')

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput))

    await interaction.showModal(modal)

    // Wait for modal submit
    let tournamentName = ''
    try {
      const modalSubmit = await interaction.awaitModalSubmit({
        filter: i => i.customId === 'tcreate_modal' && i.user.id === interaction.user.id,
        time: 120_000,
      })
      tournamentName = modalSubmit.fields.getTextInputValue('tcreate_name').trim()
      await modalSubmit.deferReply({ ephemeral: true })

      // Step 2: Game selection
      const gameMenu = new StringSelectMenuBuilder()
        .setCustomId('tcreate_game')
        .setPlaceholder('Select the game…')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel('BGMI').setValue('BGMI').setEmoji('🎮'),
          new StringSelectMenuOptionBuilder().setLabel('Free Fire').setValue('FREE_FIRE').setEmoji('🔥'),
          new StringSelectMenuOptionBuilder().setLabel('COD Mobile').setValue('COD_MOBILE').setEmoji('🎯'),
        )

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(gameMenu)

      const msg = await modalSubmit.editReply({
        embeds: [infoEmbed('🎮 Select Game', `Select the game for **${tournamentName}**:`)],
        components: [row],
      })

      // Wait for game selection
      let selectedGame = ''
      try {
        const sel = await msg.awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          filter: i => i.customId === 'tcreate_game' && i.user.id === interaction.user.id,
          time: 60_000,
        })
        selectedGame = sel.values[0]
        await sel.deferUpdate()
      } catch {
        await modalSubmit.editReply({
          embeds: [infoEmbed('⚠️ Timed Out', 'No game selected. Run `/tournament create` again.')],
          components: [],
        })
        return
      }

      // Step 3: Create the tournament in DB as DRAFT
      const guildId = interaction.guildId!
      const tournament = await prisma.tournament.create({
        data: {
          guildId,
          name: tournamentName,
          game: selectedGame as 'BGMI' | 'FREE_FIRE' | 'COD_MOBILE',
          mode: 'BATTLE_ROYALE',
          status: 'DRAFT',
          teamCapacity: 16,
        },
        select: { id: true, name: true, game: true },
      })

      const dashboardBtn = new ButtonBuilder()
        .setLabel('Open Dashboard')
        .setStyle(ButtonStyle.Link)
        .setURL(`${WEB_BASE}/servers/${guildId}/tournaments/${tournament.id}`)
        .setEmoji('🌐')

      const successRow = new ActionRowBuilder<ButtonBuilder>().addComponents(dashboardBtn)

      await modalSubmit.editReply({
        embeds: [
          successEmbed(
            'Tournament Created',
            [
              `**${tournament.name}** has been created as a DRAFT.`,
              '',
              `**ID:** \`${tournament.id}\``,
              `**Game:** ${String(tournament.game).replace(/_/g, ' ')}`,
              '',
              'Head to the dashboard to configure stages, registration settings, and publish it.',
            ].join('\n'),
          ),
        ],
        components: [successRow],
      })
    } catch {
      // Modal timed out — no interaction to reply to
    }
  }
}
