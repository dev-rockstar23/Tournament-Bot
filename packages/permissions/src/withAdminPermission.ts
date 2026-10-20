import { NextRequest, NextResponse } from 'next/server'
import { AppRole } from './roles'
import { withPermission } from './withPermission'

/**
 * Higher-order function that protects admin routes.
 * Requires TOURNAMENT_MANAGER role or higher (includes SERVER_ADMIN).
 * 
 * Usage:
 * ```ts
 * export const GET = withAdminPermission(async (req, context) => {
 *   // context includes: userId, guildId, role, isOwner, params
 *   return NextResponse.json({ data: 'protected' })
 * })
 * ```
 */
export function withAdminPermission(
  handler: (
    req: NextRequest,
    context: {
      userId: string
      guildId: string
      role: AppRole
      isOwner: boolean
      params: Record<string, string>
    }
  ) => Promise<NextResponse>
) {
  return withPermission(AppRole.TOURNAMENT_MANAGER, handler)
}
