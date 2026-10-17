import { NextResponse } from 'next/server'
import { withPermission, AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'

export const dynamic = 'force-dynamic'

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ]
  return lines.join('\n')
}

export const GET = withPermission(AppRole.SERVER_ADMIN, async (req, { guildId }) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'PAID'

  let orders: {
    id: string
    registrationId: string
    amount: unknown
    currency: string
    status: string
    createdAt: Date
  }[] = []

  try {
    orders = await prisma.order.findMany({
      where: {
        status: status as 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'DISPUTED' | 'REFUNDED',
        registration: { guildId },
      },
      select: {
        id: true,
        registrationId: true,
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch {
    // Models may not be migrated yet; return empty CSV
  }

  const csv = toCsv(
    orders.map((o) => ({
      orderId: o.id,
      registrationId: o.registrationId,
      amount: String(o.amount),
      currency: o.currency,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    }))
  )

  const safeStatus = status.replace(/[^a-zA-Z0-9_-]/g, '')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="orders-${safeStatus}.csv"`,
    },
  })
})
