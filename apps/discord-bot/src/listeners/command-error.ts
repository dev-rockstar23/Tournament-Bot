import { Listener, Events, UserError } from '@sapphire/framework';
import type { ChatInputCommandErrorPayload } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import prisma from '@esports/database';

export class CommandErrorListener extends Listener<typeof Events.ChatInputCommandError> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.ChatInputCommandError,
    });
  }

  public async run(error: Error, payload: ChatInputCommandErrorPayload) {
    const { interaction, command } = payload;

    this.container.logger.error(`[CommandError] /${command.name}: ${error.message}`);
    this.container.logger.error(error.stack ?? '');

    // Always reply so user doesn't see "application did not respond"
    const embed = new EmbedBuilder()
      .setColor(0xff4444)
      .setTitle('❌ Something went wrong')
      .setDescription(
        error instanceof UserError
          ? error.message
          : 'An unexpected error occurred. Please try again.'
      );

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } catch {
      // interaction already expired — nothing we can do
    }

    // Log to DB (non-blocking)
    if (interaction.guildId) {
      prisma.errorLog.create({
        data: {
          guildId: interaction.guildId,
          source: 'bot',
          errorType: error.name,
          message: error.message,
          stack: error.stack ?? null,
          metadata: {
            commandName: command.name,
            userId: interaction.user.id,
          },
        },
      }).catch(logErr => this.container.logger.error('[CommandError] Failed to log:', logErr));
    }
  }
}
