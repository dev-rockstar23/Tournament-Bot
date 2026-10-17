import { Listener, Events, UserError } from '@sapphire/framework';
import type { ChatInputCommandDeniedPayload } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';

export class CommandDeniedListener extends Listener<typeof Events.ChatInputCommandDenied> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.ChatInputCommandDenied });
  }

  public async run(error: UserError, payload: ChatInputCommandDeniedPayload) {
    const { interaction } = payload;

    this.container.logger.warn(`[CommandDenied] ${error.identifier}: ${error.message}`);

    const embed = new EmbedBuilder()
      .setColor(0xff9900)
      .setTitle('⚠️ Command Not Available')
      .setDescription(error.message || 'This command cannot be used here.');

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } catch {
      // already expired
    }
  }
}
