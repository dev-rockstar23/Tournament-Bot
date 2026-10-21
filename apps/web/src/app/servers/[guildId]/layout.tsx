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
  let accentColor = '#7c3aed'
  let logoUrl: string | null = null

  try {
    const settings = await prisma.serverSettings.findUnique({
      where: { guildId: params.guildId },
      select: { accentColor: true, logoUrl: true },
    })
    accentColor = settings?.accentColor ?? '#7c3aed'
    logoUrl = settings?.logoUrl ?? null
  } catch {
    // Database unavailable — render with defaults rather than crashing
  }

  return (
    <ServerBrandingProvider value={{accentColor, logoUrl}}>
      <div
        style={{ '--color-accent': accentColor } as React.CSSProperties}
        data-logo-url={logoUrl ?? undefined}
      >
        {children}
      </div>
    </ServerBrandingProvider>
  )
}
