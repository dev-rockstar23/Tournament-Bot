import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const MAX_ATTEMPTS = 4
const BAN_DURATION_SECONDS = 86400 // 24 hours
const WINDOW_SECONDS = 86400 // 24 hour window

export async function recordFailedAttempt(userId: string, guildId: string): Promise<number> {
  const key = `admin-attempts:${userId}:${guildId}`
  const count = await redis.incr(key)
  if (count === 1) {
    await redis.expire(key, WINDOW_SECONDS)
  }
  return count
}

export async function getAttemptCount(userId: string, guildId: string): Promise<number> {
  const key = `admin-attempts:${userId}:${guildId}`
  const count = await redis.get<number>(key)
  return count ?? 0
}

export async function isUserBanned(userId: string, guildId: string): Promise<boolean> {
  const count = await getAttemptCount(userId, guildId)
  return count >= MAX_ATTEMPTS
}

export async function clearAttempts(userId: string, guildId: string): Promise<void> {
  const key = `admin-attempts:${userId}:${guildId}`
  await redis.del(key)
}

export { MAX_ATTEMPTS, BAN_DURATION_SECONDS }
