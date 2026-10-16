import { Job } from 'bullmq'
import prisma from '@esports/database'

/**
 * Archive completed tournaments that are older than 90 days.
 * PLAN.md Section 21: Tournament Lifecycle
 */
export async function archiveCompletedTournaments(): Promise<number> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const result = await prisma.tournament.updateMany({
    where: {
      status: 'COMPLETED',
      completedAt: { lt: ninetyDaysAgo },
      archivedAt: null,
    },
    data: {
      status: 'ARCHIVED',
      archivedAt: new Date(),
    },
  })

  console.log(`[Cleanup] Archived ${result.count} completed tournaments older than 90 days`)
  return result.count
}

/**
 * Archive draft tournaments that are older than 30 days.
 * PLAN.md Section 26: Draft Expiry
 */
export async function archiveOldDrafts(): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const result = await prisma.tournament.updateMany({
    where: {
      status: 'DRAFT',
      createdAt: { lt: thirtyDaysAgo },
      archivedAt: null,
    },
    data: {
      status: 'ARCHIVED',
      archivedAt: new Date(),
    },
  })

  console.log(`[Cleanup] Archived ${result.count} draft tournaments older than 30 days`)
  return result.count
}

/**
 * Delete outbox events older than 30 days that have been delivered.
 * Prevents database bloat from accumulating millions of rows.
 */
export async function cleanupOldOutboxEvents(): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const result = await prisma.outboxEvent.deleteMany({
    where: {
      status: 'DELIVERED',
      deliveredAt: { lt: thirtyDaysAgo },
    },
  })

  console.log(`[Cleanup] Deleted ${result.count} delivered outbox events older than 30 days`)
  return result.count
}

/**
 * Delete completed scheduled jobs older than 30 days.
 * Prevents database bloat.
 */
export async function cleanupOldScheduledJobs(): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const result = await prisma.scheduledJob.deleteMany({
    where: {
      status: 'COMPLETED',
      completedAt: { lt: thirtyDaysAgo },
    },
  })

  console.log(`[Cleanup] Deleted ${result.count} completed scheduled jobs older than 30 days`)
  return result.count
}

/**
 * Main cleanup job processor.
 * Runs daily at 3 AM server time.
 */
export async function processCleanupJob(job: Job): Promise<void> {
  console.log('[Cleanup] Starting daily cleanup job...')

  try {
    const [archivedCompleted, archivedDrafts, deletedOutbox, deletedJobs] = await Promise.all([
      archiveCompletedTournaments(),
      archiveOldDrafts(),
      cleanupOldOutboxEvents(),
      cleanupOldScheduledJobs(),
    ])

    console.log('[Cleanup] Daily cleanup complete:', {
      archivedCompleted,
      archivedDrafts,
      deletedOutbox,
      deletedJobs,
    })
  } catch (error) {
    console.error('[Cleanup] Cleanup job failed:', error)
    throw error
  }
}
