import prisma from '@esports/database'
import { outboxQueue } from '../queues/definitions'

export async function reconcile(): Promise<void> {
  // Skip events that were attempted within the last 30 seconds — they are
  // likely being actively processed by a worker and should not be re-queued.
  const recentThreshold = new Date(Date.now() - 30000)

  const staleEvents = await prisma.outboxEvent.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: recentThreshold },
      OR: [
        { lastAttemptedAt: null },
        { lastAttemptedAt: { lt: recentThreshold } },
      ],
    },
    take: 50,
  })

  for (const event of staleEvents) {
    await outboxQueue.add(
      'process',
      { outboxEventId: event.id },
      {
        jobId: event.id,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
      },
    )
  }
}
