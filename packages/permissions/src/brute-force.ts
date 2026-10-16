import { Redis } from '@upstash/redis'

// Make Redis optional - only initialize if environment variables are properly configured
const isRedisConfigured = 
  process.env.UPSTASH_REDIS_REST_URL && 
  process.env.UPSTASH_REDIS_REST_TOKEN &&
  process.env.UPSTASH_REDIS_REST_URL.startsWith('https://');

const redis = isRedisConfigured ? new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
}) : null;

const MAX_ATTEMPTS = 4
const BAN_DURATION_SECONDS = 86400 // 24 hours
const WINDOW_SECONDS = 86400 // 24 hour window

export async function recordFailedAttempt(userId: string, guildId: string): Promise<number> {
  if (!redis) return 0; // Redis not configured, skip brute-force protection
  
  const key = `admin-attempts:${userId}:${guildId}`
  const count = await redis.incr(key)
  if (count === 1) {
    await redis.expire(key, WINDOW_SECONDS)
  }
  return count
}

export async function getAttemptCount(userId: string, guildId: string): Promise<number> {
  if (!redis) return 0; // Redis not configured
  
  const key = `admin-attempts:${userId}:${guildId}`
  const count = await redis.get<number>(key)
  return count ?? 0
}

export async function isUserBanned(userId: string, guildId: string): Promise<boolean> {
  if (!redis) return false; // Redis not configured, no bans
  
  const count = await getAttemptCount(userId, guildId)
  return count >= MAX_ATTEMPTS
}

export async function clearAttempts(userId: string, guildId: string): Promise<void> {
  if (!redis) return; // Redis not configured
  
  const key = `admin-attempts:${userId}:${guildId}`
  await redis.del(key)
}

export { MAX_ATTEMPTS, BAN_DURATION_SECONDS }
