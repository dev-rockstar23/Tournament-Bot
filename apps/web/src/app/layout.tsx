import type { Metadata } from 'next'
import { Orbitron, Inter, JetBrains_Mono } from 'next/font/google'
import { Providers } from '@/components/Providers'
import './globals.css'

// Force dynamic rendering for all pages - this app uses authentication and real-time data
export const dynamic = 'force-dynamic'
export const dynamicParams = true

const orbitron = Orbitron({
  variable: '--font-orbitron',
  subsets: ['latin'],
  display: 'swap',
})

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'SHADØW TOURNAMENTS',
    template: '%s | SHADØW TOURNAMENTS',
  },
  description:
    'Discord-native tournament management for BGMI, Free Fire, and COD Mobile.',
  themeColor: '#0a0a0f',
  icons: {
    icon: '/shadow-logo.png',
    apple: '/shadow-logo.png',
  },
  openGraph: {
    title: 'SHADØW TOURNAMENTS',
    description:
      'Discord-native esports tournament platform for BGMI, Free Fire & COD Mobile',
    images: [
      { url: 'https://shadow-tournaments.vercel.app/shadow-banner.png' },
    ],
    url: 'https://shadow-tournaments.vercel.app',
    siteName: 'SHADØW TOURNAMENTS',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SHADØW TOURNAMENTS',
    description:
      'Discord-native esports tournament platform for BGMI, Free Fire & COD Mobile',
    images: ['https://shadow-tournaments.vercel.app/shadow-banner.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${orbitron.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
