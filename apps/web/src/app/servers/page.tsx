import Link from 'next/link'
import Navigation from '@/components/ui/Navigation'

export default function ServersPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h1 className="font-display text-4xl font-black text-white mb-4">Your Servers</h1>
        <p className="text-[var(--color-text-secondary)] mb-8">
          Loading your tournament servers...
        </p>
        <Link href="/" className="text-[var(--color-accent)] hover:underline">
          ← Back to home
        </Link>
      </div>
    </main>
  )
}
