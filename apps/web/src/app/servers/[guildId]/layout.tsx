import { prisma } from '@esports/database'

export default async function ServerLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { guildId: string }
}) {
  const settings = await prisma.serverSettings.findUnique({
    where: { guildId: params.guildId },
  })

  const accentColor = settings?.accentColor ?? '#7c3aed'

  return (
    <div style={{ '--color-accent': accentColor } as React.CSSProperties}>
      {children}
    </div>
  )
}
