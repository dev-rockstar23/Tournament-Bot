import { PermissionError } from './errors'

export interface GuildMember {
  user: {
    id: string
    username: string
    discriminator: string
    avatar: string | null
  }
  roles: string[]
  nick: string | null
  joined_at: string
  deaf: boolean
  mute: boolean
}

export async function getGuildMember(
  userId: string,
  guildId: string,
  botToken: string
): Promise<GuildMember | null> {
  const response = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
    {
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new PermissionError(
      'NOT_MEMBER',
      403,
      `Failed to fetch guild member: ${response.status} ${response.statusText}`
    )
  }

  return response.json() as Promise<GuildMember>
}

export async function assertGuildMembership(
  userId: string,
  guildId: string,
  botToken: string
): Promise<void> {
  const member = await getGuildMember(userId, guildId, botToken)
  if (member === null) {
    throw new PermissionError(
      'NOT_MEMBER',
      403,
      `User ${userId} is not a member of guild ${guildId}`
    )
  }
}
