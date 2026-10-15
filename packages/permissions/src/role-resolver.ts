import { PrismaClient, ServerRoleBinding } from '@esports/database'
import { getGuildMember } from './guild-membership'
import { AppRole } from './roles'

export async function resolveUserRole(options: {
  prisma: PrismaClient
  userId: string
  guildId: string
  botToken: string
}): Promise<AppRole> {
  const { prisma, userId, guildId, botToken } = options

  // 1. Check if user is the server owner
  const server = await prisma.discordServer.findUnique({ where: { guildId } })
  if (server?.ownerId === userId) {
    return AppRole.SERVER_ADMIN
  }

  // 3. Get member's Discord role IDs
  const member = await getGuildMember(userId, guildId, botToken)

  // 4. If member is null → VIEWER
  if (member === null) {
    return AppRole.VIEWER
  }

  // 5. Query role bindings matching the member's Discord roles
  const bindings = await prisma.serverRoleBinding.findMany({
    where: {
      guildId,
      discordRoleId: { in: member.roles },
    },
  })

  // 6. Find the highest appRole value among matching bindings
  if (bindings.length === 0) {
    return AppRole.VIEWER
  }

  // Prisma returns AppRole as a string enum — map to numeric AppRole
  const highestNumeric = bindings.reduce((max: number, binding: ServerRoleBinding) => {
    const numericValue = AppRole[binding.appRole as keyof typeof AppRole]
    return numericValue > max ? numericValue : max
  }, AppRole.VIEWER as number)

  return highestNumeric as AppRole
}
