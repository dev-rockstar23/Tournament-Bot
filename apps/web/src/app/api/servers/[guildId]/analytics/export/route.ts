import { withPermission, AppRole } from '@esports/permissions';
import { prisma } from '@esports/database';
import { NextResponse } from 'next/server';
import { format } from 'date-fns';

type ExportType = 'tournaments' | 'registrations' | 'results' | 'audit';

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v);
    // Wrap in quotes if contains comma, quote, or newline
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ];
  return lines.join('\n');
}

export const GET = withPermission(
  AppRole.TOURNAMENT_MANAGER,
  async (req, { guildId }) => {
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get('type') ?? 'tournaments') as ExportType;

    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const filename = `export-${type}-${dateStr}.csv`;

    let csv = '';

    switch (type) {
      case 'tournaments': {
        // Always scoped to guildId — never cross-tenant
        const rows = await prisma.tournament.findMany({
          where: { guildId },
          select: {
            id: true,
            name: true,
            game: true,
            mode: true,
            status: true,
            teamCapacity: true,
            acceptedCount: true,
            startAt: true,
            completedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        });
        csv = toCsv(
          rows.map((r) => ({
            id: r.id,
            name: r.name,
            game: r.game,
            mode: r.mode,
            status: r.status,
            teamCapacity: r.teamCapacity,
            acceptedCount: r.acceptedCount,
            startAt: r.startAt?.toISOString() ?? '',
            completedAt: r.completedAt?.toISOString() ?? '',
          }))
        );
        break;
      }

      case 'registrations': {
        const rows = await prisma.registration.findMany({
          where: { guildId },
          select: {
            status: true,
            createdAt: true,
            tournament: { select: { name: true } },
            team: {
              select: {
                name: true,
                captain: { select: { discordId: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
        csv = toCsv(
          rows.map((r) => ({
            tournamentName: r.tournament.name,
            teamName: r.team.name,
            captainDiscordId: r.team.captain.discordId,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
          }))
        );
        break;
      }

      case 'results': {
        const rows = await prisma.scoreEvent.findMany({
          where: {
            match: { guildId },
            status: 'active',
          },
          select: {
            placement: true,
            kills: true,
            points: true,
            createdAt: true,
            match: {
              select: {
                number: true,
                completedAt: true,
                stage: {
                  select: {
                    tournament: { select: { name: true } },
                  },
                },
              },
            },
            team: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
        csv = toCsv(
          rows.map((r) => ({
            tournamentName: r.match.stage.tournament.name,
            matchNumber: r.match.number,
            teamName: r.team.name,
            placement: r.placement ?? '',
            kills: r.kills,
            points: r.points.toString(),
            approvedAt: r.match.completedAt?.toISOString() ?? '',
          }))
        );
        break;
      }

      case 'audit': {
        const rows = await prisma.auditLog.findMany({
          where: { guildId }, // always scoped to guildId
          select: {
            action: true,
            actorId: true,
            targetType: true,
            targetId: true,
            reason: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10000, // safety cap
        });
        csv = toCsv(
          rows.map((r) => ({
            action: r.action,
            actorId: r.actorId,
            targetType: r.targetType ?? '',
            targetId: r.targetId ?? '',
            reason: r.reason ?? '',
            createdAt: r.createdAt.toISOString(),
          }))
        );
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }
);
