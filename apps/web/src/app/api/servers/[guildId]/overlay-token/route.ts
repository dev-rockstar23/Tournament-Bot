import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@esports/database'
import { withPermission } from '@esports/permissions'
import { AppRole } from '@esports/permissions'

export const dynamic = 'force-dynamic'

async function handler(
  _req: NextRequest,
  context: { userId: string; guildId: string; role: AppRole; isOwner: boolean; params: Record<string, string> }
): Promise<NextResponse> {
  const { guildId } = context

  const token = crypto.randomBytes(32).toString('hex')

  await prisma.serverSettings.upsert({
    where: { guildId },
    update: { overlayToken: token },
    create: { guildId, overlayToken: token },
  })

  return NextResponse.json({ token })
}

export const POST = withPermission(AppRole.SERVER_ADMIN, handler)
