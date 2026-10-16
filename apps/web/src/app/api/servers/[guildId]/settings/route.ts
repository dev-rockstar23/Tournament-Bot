import { NextRequest, NextResponse } from 'next/server'
import { withPermission, AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { z } from 'zod'

// GET — public read of server settings (name, icon, accentColor, logoUrl, timezone)
export async function GET(
  _req: NextRequest,
  { params }: { params: { guildId: string } },
) {
  const { guildId } = params

  const [server, settings] = await Promise.all([
    prisma.discordServer.findUnique({
      where: { guildId },
      select: { name: true, icon: true },
    }),
    prisma.serverSettings.findUnique({
      where: { guildId },
      select: {
        timezone: true,
        accentColor: true,
        logoUrl: true,
      },
    }),
  ])

  if (!server) {
    return NextResponse.json({ error: 'Server not found' }, { status: 404 })
  }

  return NextResponse.json({
    name: server.name,
    icon: server.icon,
    timezone: settings?.timezone ?? 'UTC',
    accentColor: settings?.accentColor ?? null,
    logoUrl: settings?.logoUrl ?? null,
  })
}

const patchSchema = z.object({
  timezone: z.string().min(1).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  logoUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  announcementChannelId: z.string().optional().nullable(),
  matchChannelId: z.string().optional().nullable(),
  resultsChannelId: z.string().optional().nullable(),
  disputesChannelId: z.string().optional().nullable(),
  adminChannelId: z.string().optional().nullable(),
  refundOnCancel: z.boolean().optional(),
})

export const PATCH = withPermission(
  AppRole.SERVER_ADMIN,
  async (req, { guildId }) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 422 },
      )
    }

    const data = parsed.data

    // Build the update payload — only include keys that were supplied
    const updateData: Record<string, unknown> = {}
    if (data.timezone !== undefined) updateData.timezone = data.timezone
    if (data.accentColor !== undefined) updateData.accentColor = data.accentColor
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl
    if (data.bannerUrl !== undefined) updateData.bannerUrl = data.bannerUrl
    if (data.announcementChannelId !== undefined) updateData.announcementChannelId = data.announcementChannelId
    if (data.matchChannelId !== undefined) updateData.matchChannelId = data.matchChannelId
    if (data.resultsChannelId !== undefined) updateData.resultsChannelId = data.resultsChannelId
    if (data.disputesChannelId !== undefined) updateData.disputesChannelId = data.disputesChannelId
    if (data.adminChannelId !== undefined) updateData.adminChannelId = data.adminChannelId
    if (data.refundOnCancel !== undefined) updateData.refundOnCancel = data.refundOnCancel

    const settings = await prisma.serverSettings.upsert({
      where: { guildId },
      update: updateData,
      create: {
        guildId,
        ...updateData,
      },
    })

    return NextResponse.json({ settings })
  },
)
