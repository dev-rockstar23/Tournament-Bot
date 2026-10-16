import { NextResponse } from 'next/server'
import { withPermission, AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { randomBytes } from 'crypto'

// POST — generate or regenerate overlay token (SERVER_ADMIN only)
export const POST = withPermission(
  AppRole.SERVER_ADMIN,
  async (_req, { guildId }) => {
    const token = randomBytes(32).toString('hex')

    const settings = await prisma.serverSettings.upsert({
      where: { guildId },
      update: { overlayToken: token },
      create: { guildId, overlayToken: token },
    })

    // Return full token only on generation — masked elsewhere
    void settings
    return NextResponse.json({ token })
  },
)
