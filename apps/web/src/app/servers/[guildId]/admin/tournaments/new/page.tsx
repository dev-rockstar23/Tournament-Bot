import { TournamentWizard } from '@/components/admin/tournament-wizard/TournamentWizard'

interface PageProps {
  params: { guildId: string }
}

export default function NewTournamentPage({ params }: PageProps) {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-black text-white">Create Tournament</h1>
        <p className="text-white/50 text-sm mt-1">
          Follow the steps to set up your tournament.
        </p>
      </div>
      <TournamentWizard guildId={params.guildId} />
    </div>
  )
}
