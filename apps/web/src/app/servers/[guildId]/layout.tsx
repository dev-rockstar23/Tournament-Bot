import { prisma } from '@esports/database'
import { ServerBrandingProvider } from '@/contexts/ServerBrandingContext'

export const dynamic = 'force-dynamic'

export default async function ServerLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { guildId: string }
}) {
  const settings = await prisma.serverSettings.findUnique({
    where: { guildId: params.guildId },
    select: { accentColor: true, logoUrl: true },
  })

  const accentColor = settings?.accentColor ?? '#7c3aed'
  const logoUrl = settings?.logoUrl ?? null

  return (
    <ServerBrandingProvider value={{ accentColor, logoUrl }}>
      <div
        style={{ '--color-accent': accentColor } as React.CSSProperties}
        data-logo-url={logoUrl ?? undefined}
      >
        {children}
      </div>
    </ServerBrandingProvider>
  )
}
