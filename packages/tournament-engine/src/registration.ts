import { prisma } from '@esports/database'
import type { Prisma } from '@esports/database/src/generated/client'
import { RegistrationStatus } from '@esports/database/src/generated/client'

export class SlotUnavailableError extends Error {
  readonly httpStatus = 409 as const

  constructor(slotNumber: number) {
    super(`Slot ${slotNumber} is already occupied`)
    this.name = 'SlotUnavailableError'
  }
}

export class TournamentFullError extends Error {
  readonly httpStatus = 409 as const

  constructor(capacity: number) {
    super(`Tournament is full (capacity: ${capacity})`)
    this.name = 'TournamentFullError'
  }
}

/**
 * Find the next available slot number for a tournament.
 * Slots are numbered 1 to teamCapacity.
 * PLAN.md Section 24: Slot Assignment
 */
async function findNextAvailableSlot(
  tournamentId: string,
  tx: Prisma.TransactionClient,
): Promise<number | null> {
  const tournament = await tx.tournament.findUnique({
    where: { id: tournamentId },
    select: { teamCapacity: true },
  })

  if (!tournament) {
    throw new Error(`Tournament not found: ${tournamentId}`)
  }

  const occupiedSlots = await tx.registration.findMany({
    where: {
      tournamentId,
      status: RegistrationStatus.APPROVED,
      slotNumber: { not: null },
    },
    select: { slotNumber: true },
  })

  const occupiedSet = new Set(occupiedSlots.map((r) => r.slotNumber))

  // Find first unoccupied slot from 1 to teamCapacity
  for (let slot = 1; slot <= tournament.teamCapacity; slot++) {
    if (!occupiedSet.has(slot)) {
      return slot
    }
  }

  return null // No slots available
}

/**
 * Approve a registration and assign it the next available slot.
 * PLAN.md Section 24: Slot System
 *
 * @param registrationId - Registration to approve
 * @param approverId - User performing the action
 */
export async function approveRegistration(
  registrationId: string,
  approverId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const registration = await tx.registration.findUnique({
      where: { id: registrationId },
      include: { tournament: true },
    })

    if (!registration) {
      throw new Error(`Registration not found: ${registrationId}`)
    }

    // Check if tournament is full
    if (
      registration.tournament.acceptedCount >= registration.tournament.teamCapacity
    ) {
      throw new TournamentFullError(registration.tournament.teamCapacity)
    }

    // Find next available slot
    const slotNumber = await findNextAvailableSlot(registration.tournamentId, tx)

    if (slotNumber === null) {
      throw new TournamentFullError(registration.tournament.teamCapacity)
    }

    // Approve registration and assign slot
    await tx.registration.update({
      where: { id: registrationId },
      data: {
        status: RegistrationStatus.APPROVED,
        slotNumber,
        approvedBy: approverId,
        approvedAt: new Date(),
      },
    })

    // Increment accepted count
    await tx.tournament.update({
      where: { id: registration.tournamentId },
      data: {
        acceptedCount: { increment: 1 },
      },
    })

    // Create outbox event
    await tx.outboxEvent.create({
      data: {
        guildId: registration.guildId,
        type: 'REGISTRATION_APPROVED',
        payloadJson: {
          registrationId,
          tournamentId: registration.tournamentId,
          teamId: registration.teamId,
          slotNumber,
        },
      },
    })

    // Audit log
    await tx.auditLog.create({
      data: {
        guildId: registration.guildId,
        actorId: approverId,
        action: 'REGISTRATION_APPROVED',
        targetType: 'REGISTRATION',
        targetId: registrationId,
        metadata: {
          tournamentId: registration.tournamentId,
          teamId: registration.teamId,
          slotNumber,
        },
      },
    })
  })
}

/**
 * Force-fill a specific slot with a team (admin override).
 * Useful when a team withdraws and admin wants to manually fill the slot.
 * PLAN.md Section 24: Force-Fill Logic
 *
 * @param tournamentId - Tournament ID
 * @param slotNumber - Specific slot number to fill (1 to teamCapacity)
 * @param teamId - Team to assign to this slot
 * @param adminId - Admin performing the action
 */
export async function forceFillSlot(
  tournamentId: string,
  slotNumber: number,
  teamId: string,
  adminId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Validate tournament exists
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
    })

    if (!tournament) {
      throw new Error(`Tournament not found: ${tournamentId}`)
    }

    // Validate slot number
    if (slotNumber < 1 || slotNumber > tournament.teamCapacity) {
      throw new Error(
        `Invalid slot number ${slotNumber}. Must be between 1 and ${tournament.teamCapacity}`,
      )
    }

    // Check if slot is already occupied
    const existingReg = await tx.registration.findFirst({
      where: {
        tournamentId,
        slotNumber,
        status: RegistrationStatus.APPROVED,
      },
    })

    if (existingReg) {
      throw new SlotUnavailableError(slotNumber)
    }

    // Check if team already has a registration for this tournament
    const teamReg = await tx.registration.findFirst({
      where: {
        tournamentId,
        teamId,
      },
    })

    if (teamReg) {
      // Update existing registration
      await tx.registration.update({
        where: { id: teamReg.id },
        data: {
          status: RegistrationStatus.APPROVED,
          slotNumber,
          approvedBy: adminId,
          approvedAt: new Date(),
        },
      })
    } else {
      // Create new approved registration
      await tx.registration.create({
        data: {
          tournamentId,
          guildId: tournament.guildId,
          teamId,
          slotNumber,
          status: RegistrationStatus.APPROVED,
          phase: tournament.registrationPhase,
          approvedBy: adminId,
          approvedAt: new Date(),
        },
      })
    }

    // Increment accepted count if this is a new approval
    if (!teamReg || teamReg.status !== RegistrationStatus.APPROVED) {
      await tx.tournament.update({
        where: { id: tournamentId },
        data: {
          acceptedCount: { increment: 1 },
        },
      })
    }

    // Create outbox event
    await tx.outboxEvent.create({
      data: {
        guildId: tournament.guildId,
        type: 'SLOT_FORCE_FILLED',
        payloadJson: {
          tournamentId,
          teamId,
          slotNumber,
          adminId,
        },
      },
    })

    // Audit log
    await tx.auditLog.create({
      data: {
        guildId: tournament.guildId,
        actorId: adminId,
        action: 'SLOT_FORCE_FILLED',
        targetType: 'REGISTRATION',
        targetId: teamReg?.id ?? 'NEW',
        reason: `Admin force-filled slot ${slotNumber}`,
        metadata: {
          tournamentId,
          teamId,
          slotNumber,
        },
      },
    })
  })
}

/**
 * Promote next waitlisted team when a slot becomes available.
 * PLAN.md Section 24: Waitlist Promotion
 *
 * @param tournamentId - Tournament ID
 * @returns The promoted registration ID, or null if no waitlisted teams
 */
export async function promoteFromWaitlist(
  tournamentId: string,
): Promise<string | null> {
  return await prisma.$transaction(async (tx) => {
    // Find oldest waitlisted registration
    const waitlistedReg = await tx.registration.findFirst({
      where: {
        tournamentId,
        status: RegistrationStatus.WAITLISTED,
      },
      orderBy: {
        createdAt: 'asc', // FIFO: first-in, first-out
      },
    })

    if (!waitlistedReg) {
      return null // No teams on waitlist
    }

    // Find next available slot
    const slotNumber = await findNextAvailableSlot(tournamentId, tx)

    if (slotNumber === null) {
      return null // No slots available (shouldn't happen, but defensive)
    }

    // Approve waitlisted registration
    await tx.registration.update({
      where: { id: waitlistedReg.id },
      data: {
        status: RegistrationStatus.APPROVED,
        slotNumber,
        promotedFromWaitlist: true,
        approvedAt: new Date(),
      },
    })

    // Increment accepted count
    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        acceptedCount: { increment: 1 },
      },
    })

    // Create outbox event
    await tx.outboxEvent.create({
      data: {
        guildId: waitlistedReg.guildId,
        type: 'WAITLIST_PROMOTED',
        payloadJson: {
          registrationId: waitlistedReg.id,
          tournamentId,
          teamId: waitlistedReg.teamId,
          slotNumber,
        },
      },
    })

    return waitlistedReg.id
  })
}
