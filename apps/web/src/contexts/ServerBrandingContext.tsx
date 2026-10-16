'use client'

import { createContext, useContext } from 'react'

export interface ServerBranding {
  accentColor: string
  logoUrl: string | null
}

const ServerBrandingContext = createContext<ServerBranding>({
  accentColor: '#7c3aed',
  logoUrl: null,
})

export function ServerBrandingProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: ServerBranding
}) {
  return (
    <ServerBrandingContext.Provider value={value}>
      {children}
    </ServerBrandingContext.Provider>
  )
}

export function useServerBranding(): ServerBranding {
  return useContext(ServerBrandingContext)
}
