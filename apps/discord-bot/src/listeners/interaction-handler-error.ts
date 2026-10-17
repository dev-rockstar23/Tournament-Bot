import { Listener, Events } from '@sapphire/framework';

// Catch any command that is not handled by Sapphire and log it
export class InteractionHandlerErrorListener extends Listener<typeof Events.InteractionHandlerError> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.InteractionHandlerError });
  }

  public run(error: Error) {
    this.container.logger.error('[InteractionHandlerError]', error);
  }
}
