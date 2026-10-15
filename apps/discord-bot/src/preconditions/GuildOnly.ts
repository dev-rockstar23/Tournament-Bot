import { Precondition } from '@sapphire/framework'
import type { ChatInputCommandInteraction } from 'discord.js'
import { e } from '../utils/emojis'

export class GuildOnlyPrecondition extends Precondition {
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    return interaction.guildId
      ? this.ok()
      : this.error({
          message: `${e('warning')} This command can only be used in a server, not in DMs.`,
        })
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    GuildOnly: never
  }
}
