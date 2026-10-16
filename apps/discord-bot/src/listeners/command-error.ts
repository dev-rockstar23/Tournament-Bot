import { Listener, Events } from '@sapphire/framework';
import type { ChatInputCommandErrorPayload } from '@sapphire/framework';
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
    
    if (!interaction.guildId) return;

    try {
      await prisma.errorLog.create({
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
      });
    } catch (logError) {
      this.container.logger.error('[CommandError] Failed to log error:', logError);
    }
  }
}
