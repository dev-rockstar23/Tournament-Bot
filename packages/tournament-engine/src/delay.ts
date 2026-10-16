import { prisma } from '@esports/database'
import type { Prisma } from '@esports/database/src/generated/client'
import { assertTournamentTransition } from './state-machine'

export class MaxDelayExceededError extends Error {
  readonly httpStatus = 400 as const

  constructor(currentExtensions: number, maxAllowed: number) {
    super(
      `Tournament has already been delayed ${currentExtensions} time(s). Maximum allowed: ${maxAllowed}.`,
    )
    this.name = 'MaxDelayExceededError'
  }
}

export class InvalidDelayError extends Error {
  readonly httpStatus = 400 as const

  constructor(message: string) {
    super(message)
    this.name = 'InvalidDelayError'
  }
}

/**
 * Delay a tournament by X days and re-open registration.
 * PLAN.md Section 19: Tournament Delay & Re-Registration
 *
 * @param tournamentId - Tournament to delay
 * @param delayDays - Number of days to delay (must be positive)
 * @param userId - User performing the action (for audit log)
 * @returns Updated tournament
 */
export async function delayTournament(
  tournamentId: string,
  delayDays: number,
  userId: string,
): Promise<void> {
  if (delayDays <= 0 || !Number.isInteger(delayDays)) {
    throw new InvalidDelayError('Delay days must be a positive integer')
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Load tournament and server settings
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
      include: { server: { include: { settings: true } } },
    })

    if (!tournament) {
      throw new Error(`Tournament not found: ${tournamentId}`)
    }

    const maxDelayDays = tournament.server.settings?.maxDelayDays ?? 90

    // 2. Validate extension count
    if (tournament.extensionCount >= maxDelayDays) {
      throw new MaxDelayExceededError(tournament.extensionCount, maxDelayDays)
    }

    // 3. Validate status transition
    // Can only delay from REGISTRATION_CLOSED or CHECK_IN states
    if (
      tournament.status !== 'REGISTRATION_CLOSED' &&
      tournament.status !== 'CHECK_IN'
    ) {
      throw new InvalidDelayError(
        `Cannot delay tournament in ${tournament.status} status. Must be REGISTRATION_CLOSED or CHECK_IN.`,
      )
    }

    // 4. Calculate new dates
    const delayMs = delayDays * 24 * 60 * 60 * 1000
    const newRegistrationCloseAt = tournament.registrationCloseAt
      ? new Date(tournament.registrationCloseAt.getTime() + delayMs)
      : null
    const newCheckInOpenAt = tournament.checkInOpenAt
      ? new Date(tournament.checkInOpenAt.getTime() + delayMs)
      : null
    const newCheckInCloseAt = tournament.checkInCloseAt
      ? new Date(tournament.checkInCloseAt.getTime() + delayMs)
      : null
    const newStartAt = tournament.startAt
      ? new Date(tournament.startAt.getTime() + delayMs)
      : null
    const newEndAt = tournament.endAt
      ? new Date(tournament.endAt.getTime() + delayMs)
      : null

    // 5. Transition status and update dates
    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        status: 'REGISTRATION_OPEN',
        registrationPhase: 'REOPENED',
        extensionCount: { increment: 1 },
        registrationCloseAt: newRegistrationCloseAt,
        checkInOpenAt: newCheckInOpenAt,
        checkInCloseAt: newCheckInCloseAt,
        startAt: newStartAt,
        endAt: newEndAt,
      },
    })

    // 6. Reschedule all pending match jobs
    const matches = await tx.match.findMany({
      where: {
        stage: { tournamentId },
        status: { in: ['SCHEDULED', 'CHECK_IN'] },
      },
    })

    for (const match of matches) {
      const newScheduledStart = new Date(match.scheduledStart.getTime() + delayMs)
      const newScheduledEnd = new Date(match.scheduledEnd.getTime() + delayMs)

      await tx.match.update({
        where: { id: match.id },
        data: {
          scheduledStart: newScheduledStart,
          scheduledEnd: newScheduledEnd,
        },
      })

      // Cancel old scheduled jobs and recreate with new times
      await tx.scheduledJob.updateMany({
        where: {
          matchId: match.id,
          status: 'PENDING',
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      })

      // Recreate DM reminder jobs with new timing
      const dmJobs = [
        {
          type: 'DM_REMINDER_24H',
          scheduledFor: new Date(newScheduledStart.getTime() - 24 * 60 * 60 * 1000),
        },
        {
          type: 'DM_REMINDER_30MIN',
          scheduledFor: new Date(newScheduledStart.getTime() - 30 * 60 * 1000),
        },
        {
          type: 'DM_REMINDER_5MIN',
          scheduledFor: new Date(newScheduledStart.getTime() - 5 * 60 * 1000),
        },
      ]

      for (const dmJob of dmJobs) {
        await tx.scheduledJob.create({
          data: {
            jobKey: `${dmJob.type}:${match.id}:${Date.now()}`,
            type: dmJob.type,
            payloadJson: { matchId: match.id },
            scheduledFor: dmJob.scheduledFor,
            matchId: match.id,
            tournamentId,
          },
        })
      }
    }

    // 7. Create outbox event for Discord announcement
    await tx.outboxEvent.create({
      data: {
        guildId: tournament.guildId,
        type: 'TOURNAMENT_DELAYED',
        payloadJson: {
          tournamentId,
          delayDays,
          newStartAt,
          extensionCount: tournament.extensionCount + 1,
        },
      },
    })

    // 8. Write audit log
    await tx.auditLog.create({
      data: {
        guildId: tournament.guildId,
        actorId: userId,
        action: 'TOURNAMENT_DELAYED',
        targetType: 'TOURNAMENT',
        targetId: tournamentId,
        reason: `Tournament delayed by ${delayDays} day(s). Registration re-opened.`,
        metadata: {
          delayDays,
          extensionCount: tournament.extensionCount + 1,
          newStartAt,
          newEndAt,
        },
      },
    })
  })
}
