'use client'
import { Toaster } from 'sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(22, 33, 62, 0.95)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#f8fafc',
          },
        }}
      />
    </>
  )
}
