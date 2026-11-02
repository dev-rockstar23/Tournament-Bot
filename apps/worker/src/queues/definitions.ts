import { Queue } from 'bullmq'
import type { ConnectionOptions } from 'bullmq'
import Redis from 'ioredis'

// BullMQ requires a real TCP Redis connection (redis:// or rediss://).
// Use REDIS_URL for a standard ioredis connection.
// If only Upstash is available, set REDIS_URL to the Upstash TLS endpoint:
//   rediss://default:<UPSTASH_REDIS_REST_TOKEN>@<host>:<port>
// Do NOT pass UPSTASH_REDIS_REST_URL here — that is an HTTP REST endpoint
// and is incompatible with ioredis/BullMQ.
const redisUrl = process.env.REDIS_URL

if (!redisUrl) {
  console.error(
    '[worker] REDIS_URL is not set. BullMQ requires a TCP Redis connection ' +
    '(redis:// or rediss://). Set REDIS_URL in your environment. ' +
    'Do NOT use UPSTASH_REDIS_REST_URL — that is an HTTP REST endpoint.'
  )
  process.exit(1)
}

export const connection = new Redis(redisUrl, {
  tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
}) as unknown as ConnectionOptions

// Log connection errors so the worker fails loudly rather than hanging
;(connection as unknown as Redis).on('error', (err: Error) => {
  console.error('[worker] Redis connection error:', err.message)
})

export const outboxQueue = new Queue('outbox-processor', { connection })
export const scheduledQueue = new Queue('scheduled-jobs', { connection })
export const dmQueue = new Queue('dm-notifications', { connection })
