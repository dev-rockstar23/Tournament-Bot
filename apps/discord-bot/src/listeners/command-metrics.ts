import { Listener, Events } from '@sapphire/framework';
import type { ChatInputCommandSuccessPayload } from '@sapphire/framework';
import prisma from '@esports/database';

export class CommandMetricsListener extends Listener<typeof Events.ChatInputCommandSuccess> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.ChatInputCommandSuccess,
    });
  }

  public async run(payload: ChatInputCommandSuccessPayload) {
    const { interaction, command } = payload;
    
    if (!interaction.guildId) return;

    try {
      await prisma.systemMetric.create({
        data: {
          guildId: interaction.guildId,
          metricType: 'command_executed',
          metricName: command.name,
          value: 1,
          metadata: {
            userId: interaction.user.id,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      this.container.logger.error('[CommandMetrics] Failed to record metric:', error);
    }
  }
}
