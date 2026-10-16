export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@esports/database'
import { Redis } from '@upstash/redis'

export async function GET() {
  // 1. Check database
  let databaseStatus: 'ok' | 'error' = 'ok'
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    databaseStatus = 'error'
  }

  // 2. Check Redis
  let redisStatus: 'ok' | 'error' = 'ok'
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL ?? '',
      token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
    })
    await redis.ping()
  } catch {
    redisStatus = 'error'
  }

  // 3. Check outbox backlog
  let outboxBacklog = 0
  try {
    outboxBacklog = await prisma.outboxEvent.count({
      where: {
        status: 'PENDING',
        createdAt: { lt: new Date(Date.now() - 120000) },
      },
    })
  } catch {
    // If this check fails, leave backlog as 0 — database check already captured the failure
  }

  // 4. Determine overall status
  let status: 'ok' | 'degraded' | 'down'
  if (databaseStatus === 'error') {
    status = 'down'
  } else if (redisStatus === 'error' || outboxBacklog > 10) {
    status = 'degraded'
  } else {
    status = 'ok'
  }

  // 5. Return response
  const httpStatus = status === 'down' ? 503 : 200

  return NextResponse.json(
    {
      status,
      checks: {
        database: databaseStatus,
        redis: redisStatus,
        outboxBacklog,
      },
      timestamp: new Date().toISOString(),
    },
    { status: httpStatus }
  )
}
