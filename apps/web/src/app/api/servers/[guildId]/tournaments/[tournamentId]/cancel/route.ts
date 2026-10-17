import { withPermission, AppRole } from '@esports/permissions';
import { prisma } from '@esports/database';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic'

const cancelSchema = z.object({
  reason: z.string().min(1).max(1000),
});

// POST /api/servers/[guildId]/tournaments/[tournamentId]/cancel
// Cancel a tournament. Writes audit log and outbox event.
export const POST = withPermission(
  AppRole.TOURNAMENT_MANAGER,
  async (req, { guildId, userId, params }) => {
    const tournamentId = params['tournamentId'];
    if (!tournamentId) {
      return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 });
    }

    // Always scope by both IDs — prevents cross-guild data leakage
    const tournament = await prisma.tournament.findFirst({
      where: { id: tournamentId, guildId },
      select: { id: true, status: true, name: true, game: true },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Tournament is already cancelled' }, { status: 400 });
    }

    if (tournament.status === 'ARCHIVED') {
      return NextResponse.json({ error: 'Archived tournaments cannot be cancelled' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = cancelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed: reason is required', issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const { reason } = parsed.data;

    // Find the actor's DB user for audit log
    const actor = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!actor) {
      return NextResponse.json({ error: 'Actor not found' }, { status: 403 });
    }

    // Execute in a transaction: update status + audit log + outbox event
    const updated = await prisma.$transaction(async (tx) => {
      const t = await tx.tournament.update({
        where: { id: tournamentId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          guildId,
          actorId: actor.id,
          action: 'TOURNAMENT_CANCELLED',
          targetType: 'Tournament',
          targetId: tournamentId,
          reason,
          metadata: { previousStatus: tournament.status },
        },
      });

      await tx.outboxEvent.create({
        data: {
          guildId,
          type: 'TOURNAMENT_CANCELLED',
          payloadJson: {
            tournamentId,
            name: tournament.name,
            game: tournament.game,
            reason,
          },
          status: 'PENDING',
        },
      });

      return t;
    });

    return NextResponse.json({ tournament: updated });
  }
);
