import { Queue } from 'bullmq'
import type { ConnectionOptions } from 'bullmq'
import Redis from 'ioredis'

export const connection = new Redis(process.env.UPSTASH_REDIS_REST_URL!, {
  password: process.env.UPSTASH_REDIS_REST_TOKEN,
  tls: { rejectUnauthorized: false },
  maxRetriesPerRequest: null, // Required by BullMQ
}) as unknown as ConnectionOptions

export const outboxQueue = new Queue('outbox-processor', { connection })
export const scheduledQueue = new Queue('scheduled-jobs', { connection })
export const dmQueue = new Queue('dm-notifications', { connection })
