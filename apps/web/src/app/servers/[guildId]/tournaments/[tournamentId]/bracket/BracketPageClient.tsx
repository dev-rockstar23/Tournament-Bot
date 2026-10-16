'use client'

import { useRef, useState } from 'react'
import { BracketVisualization } from '@/components/tournament/BracketVisualization'
import { MatchStatus } from '@esports/database'
import { Download, Share2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface BracketMatch {
  id: string
  number: number
  round: number
  status: MatchStatus
  scheduledStart: string | null
  participants: Array<{ teamId: string; teamName: string; score?: number | null }>
  nextMatchId?: string | null
}

interface BracketPageClientProps {
  tournamentId: string
  tournamentName: string
  format: 'SINGLE_ELIM' | 'DOUBLE_ELIM' | 'ROUND_ROBIN'
  matches: BracketMatch[]
  guildId: string
}

export function BracketPageClient({
  tournamentId,
  tournamentName,
  format,
  matches,
  guildId,
}: BracketPageClientProps) {
  const bracketRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleExportPNG = async () => {
    if (!bracketRef.current) return

    setIsExporting(true)
    try {
      // Dynamic import to reduce bundle size
      const { toPng } = await import('html-to-image')
      
      const dataUrl = await toPng(bracketRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#0f172a',
      })

      // Create download link
      const link = document.createElement('a')
      link.download = `${tournamentName.replace(/\s+/g, '_')}_bracket.png`
      link.href = dataUrl
      link.click()

      toast.success('Bracket exported successfully!')
    } catch (error) {
      console.error('Failed to export bracket:', error)
      toast.error('Failed to export bracket')
    } finally {
      setIsExporting(false)
    }
  }

  const handleShare = async () => {
    const url = window.location.href

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${tournamentName} - Bracket`,
          url,
        })
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(url)
        toast.success('Link copied to clipboard!')
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to share:', error)
        toast.error('Failed to share bracket')
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/servers/${guildId}/tournaments`}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold">{tournamentName}</h1>
                <p className="text-sm text-gray-400">Tournament Bracket</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
              <button
                onClick={handleExportPNG}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-800 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {isExporting ? 'Exporting...' : 'Export PNG'}
                </span>
              </button>
            </div>
          </div>

          {/* Format Badge */}
          <div className="mt-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-violet-900/30 text-violet-300 border border-violet-700">
              {format.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Bracket Visualization */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div ref={bracketRef} className="rounded-lg overflow-hidden">
          <BracketVisualization
            tournamentId={tournamentId}
            format={format}
            matches={matches}
          />
        </div>

        {/* Stats Footer */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-sm text-gray-400">Total Matches</div>
            <div className="text-2xl font-bold text-white mt-1">{matches.length}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-sm text-gray-400">Completed</div>
            <div className="text-2xl font-bold text-cyan-400 mt-1">
              {matches.filter((m) => m.status === 'COMPLETED').length}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-sm text-gray-400">Live</div>
            <div className="text-2xl font-bold text-green-400 mt-1">
              {matches.filter((m) => m.status === 'LIVE').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
