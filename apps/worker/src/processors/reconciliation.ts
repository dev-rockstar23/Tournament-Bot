import prisma from '@esports/database'
import { outboxQueue } from '../queues/definitions'

export async function reconcile(): Promise<void> {
  const staleEvents = await prisma.outboxEvent.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: new Date(Date.now() - 30000) },
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
