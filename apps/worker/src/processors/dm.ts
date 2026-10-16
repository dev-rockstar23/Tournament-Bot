import { Job } from 'bullmq'
import { discordClient } from '../discord-client'

export async function sendDm(job: Job): Promise<void> {
  const { userId, content, embeds } = job.data as {
    userId: string
    content: string
    embeds?: object[]
  }

  try {
    const user = await discordClient.users.fetch(userId)
    const dmChannel = await user.createDM()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await dmChannel.send({ content, embeds: embeds as any })
  } catch (error: unknown) {
    const err = error as { code?: number }
    if (err?.code === 50007) {
      // DMs disabled — expected, not an error. Never retry, never alert admin.
      await job.updateProgress({ skipped: true, reason: 'DMs_DISABLED' })
      return
    }
    throw error
  }
}
