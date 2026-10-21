import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@esports/database'
import { withPermission, AppRole } from '@esports/permissions'

// ─── GET /api/servers/[guildId]/admin/tournaments/[tournamentId]/stages ───────
// Returns all stages ordered by `order`, including group system fields.

export const GET = withPermission(
  AppRole.TOURNAMENT_MANAGER,
  async (_req, { guildId, params }) => {
    const tournamentId = params['tournamentId']
    if (!tournamentId) {
      return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 })
    }

    const stages = await prisma.stage.findMany({
      where: { tournamentId },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        stageType: true,
        order: true,
        status: true,
        teamsAdvancing: true,
        teamsPerGroup: true,
        matchCount: true,
        createdAt: true,
      },
    })

    const totalStages = stages.length

    const result = stages.map((stage) => ({
      ...stage,
      bracketLocked: stage.order < totalStages - 2,
      createdAt: stage.createdAt.toISOString(),
    }))

    return NextResponse.json({ stages: result })
  }
)

// ─── POST /api/servers/[guildId]/admin/tournaments/[tournamentId]/stages ──────
// Create a new stage for the tournament.

export const POST = withPermission(
  AppRole.TOURNAMENT_MANAGER,
  async (req, { guildId, params }) => {
    const tournamentId = params['tournamentId']
    if (!tournamentId) {
      return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const {
      name,
      stageType,
      teamsPerGroup,
      teamsAdvancing,
      matchCount,
    } = body as {
      name?: string
      stageType?: string
      teamsPerGroup?: number
      teamsAdvancing?: number
      matchCount?: number
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Stage name is required' }, { status: 422 })
    }

    const validStageTypes = ['GROUP_STAGE', 'KNOCKOUT', 'ROUND_ROBIN', 'BATTLE_ROYALE_QUALIFIER']
    const resolvedStageType = stageType && validStageTypes.includes(stageType)
      ? stageType
      : 'GROUP_STAGE'

    // Determine the next order value
    const maxOrderResult = await prisma.stage.aggregate({
      where: { tournamentId },
      _max: { order: true },
    })
    const nextOrder = (maxOrderResult._max.order ?? 0) + 1

    const stage = await prisma.stage.create({
      data: {
        tournamentId,
        name: name.trim(),
        type: resolvedStageType,
        stageType: resolvedStageType,
        order: nextOrder,
        status: 'pending',
        teamsPerGroup: typeof teamsPerGroup === 'number' && teamsPerGroup > 0 ? teamsPerGroup : 12,
        teamsAdvancing: typeof teamsAdvancing === 'number' && teamsAdvancing > 0 ? teamsAdvancing : 3,
        matchCount: typeof matchCount === 'number' && matchCount > 0 ? matchCount : 1,
      },
      select: {
        id: true,
        name: true,
        type: true,
        stageType: true,
        order: true,
        status: true,
        teamsAdvancing: true,
        teamsPerGroup: true,
        matchCount: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ stage: { ...stage, createdAt: stage.createdAt.toISOString() } }, { status: 201 })
  }
)

// ─── DELETE /api/servers/[guildId]/admin/tournaments/[tournamentId]/stages?stageId=X
// Delete a stage only if it is in 'pending' status.

export const DELETE = withPermission(
  AppRole.TOURNAMENT_MANAGER,
  async (req, { guildId, params }) => {
    const tournamentId = params['tournamentId']
    if (!tournamentId) {
      return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const stageId = searchParams.get('stageId')

    if (!stageId) {
      return NextResponse.json({ error: 'Missing stageId query parameter' }, { status: 400 })
    }

    const stage = await prisma.stage.findFirst({
      where: { id: stageId, tournamentId },
      select: { id: true, status: true },
    })

    if (!stage) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 })
    }

    if (stage.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only stages with status "pending" can be deleted' },
        { status: 409 }
      )
    }

    await prisma.stage.delete({ where: { id: stageId } })

    return NextResponse.json({ success: true })
  }
)
