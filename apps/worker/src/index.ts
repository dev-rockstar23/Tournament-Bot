import 'dotenv/config'
import { Job, Worker } from 'bullmq'
import { connection, outboxQueue } from './queues/definitions'
import { processOutboxEvent } from './processors/outbox'
import { processScheduledJob } from './processors/scheduler'
import { sendDm } from './processors/dm'
import { reconcile } from './processors/reconciliation'
import { discordClient } from './discord-client'
import { reportHealth, reportHealthAllGuilds } from './reporters/health-reporter'

export { discordClient }
discordClient.login(process.env.DISCORD_BOT_TOKEN!)

// Outbox worker — dispatches outbox events and handles the reconcile job
async function outboxProcessor(job: Job): Promise<void> {
  if (job.name === 'reconcile') {
    await reconcile()

    // Report health after reconciliation.
    // HEALTH_CHECK_GUILD_ID must be a real Discord guild ID (snowflake).
    // If it is unset or is the sentinel 'global', we fall back to reporting
    // health for all guilds that had recent activity instead.
    const configuredGuildId = process.env.HEALTH_CHECK_GUILD_ID
    if (configuredGuildId && configuredGuildId !== 'global') {
      await reportHealth(configuredGuildId)
    } else {
      await reportHealthAllGuilds()
    }

    return
  }
  await processOutboxEvent(job)
}

const outboxWorker = new Worker('outbox-processor', outboxProcessor, { connection, concurrency: 5 })
const scheduledWorker = new Worker('scheduled-jobs', processScheduledJob, { connection, concurrency: 3 })
const dmWorker = new Worker('dm-notifications', sendDm, { connection, concurrency: 10 })

// Reconciliation every 60 seconds
outboxQueue.add('reconcile', {}, { repeat: { every: 60000 }, jobId: 'reconciliation-loop' })

outboxWorker.on('failed', (job, err) => console.error(`[outbox] Job ${job?.id} failed:`, err))
scheduledWorker.on('failed', (job, err) => console.error(`[scheduler] Job ${job?.id} failed:`, err))
dmWorker.on('failed', (job, err) => console.error(`[dm] Job ${job?.id} failed:`, err))

console.log('✅ Worker started — outbox, scheduler, DM queues active')
