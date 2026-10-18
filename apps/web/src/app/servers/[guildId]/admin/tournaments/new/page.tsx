import { TournamentWizard } from '@/components/admin/tournament-wizard/TournamentWizard'
import { NeonText } from '@/components/ui/NeonText'
import { CyberBreadcrumb } from '@/components/ui/CyberBreadcrumb'
import { StatusPulse } from '@/components/ui/StatusPulse'

interface PageProps {
  params: { guildId: string }
}

export const dynamic = 'force-dynamic'

export default function NewTournamentPage({ params }: PageProps) {
  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Page Header */}
      <div className="hud-grid-bg border-b border-[var(--color-neon-violet)] px-6 py-4">
        <CyberBreadcrumb
          labels={{
            servers: 'SERVERS',
            [params.guildId]: params.guildId.slice(-6).toUpperCase(),
            admin: 'ADMIN',
            tournaments: 'TOURNAMENTS',
            new: 'NEW',
          }}
          className="mb-3"
        />
        <div className="flex items-center gap-3 flex-wrap">
          <NeonText as="h1" color="violet" glitch className="text-2xl font-black tracking-widest uppercase">
            DEPLOY NEW TOURNAMENT
          </NeonText>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-[rgba(124,58,237,0.5)] text-[10px] font-mono text-violet-400">
            <StatusPulse variant="pending" />
            SETUP MODE
          </span>
        </div>
        <p className="text-[11px] font-mono text-white/40 tracking-widest uppercase mt-1">
          6-STEP CONFIGURATION — REGISTRATION FORMAT SCHEMA → CAPACITY MATRIX → APPROVAL GATES
        </p>

        {/* Step progress bar labels row */}
        <div className="mt-4 grid grid-cols-6 gap-1 text-[9px] font-mono tracking-widest uppercase text-white/30">
          {[
            'GENERAL INFO',
            'REG FORMAT',
            'SCHEDULE',
            'SCORING ENGINE',
            'AWARDS',
            'DISCORD SYNC',
          ].map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-violet-700/60 text-[9px] text-violet-500">
                {i + 1}
              </span>
              <span className="hidden sm:block">{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-6 max-w-4xl mx-auto">
        {/* Registration Format Schema */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'SOLO', desc: 'Individual players', icon: '👤', color: '#7c3aed' },
            { label: 'DUO', desc: '2-man squads', icon: '👥', color: '#06b6d4' },
            { label: 'TRIO', desc: '3-man squads', icon: '🎯', color: '#10b981' },
            { label: 'SQUAD', desc: '4-man full squad', icon: '⚡', color: '#f59e0b' },
            { label: 'SQUAD+1', desc: 'Squad with sub', icon: '🛡', color: '#ef4444' },
            { label: 'OPEN', desc: 'Custom roster', icon: '🔓', color: '#8b5cf6' },
          ].map(fmt => (
            <div
              key={fmt.label}
              className="glass-card p-3 rounded-xl border border-white/10 hover:border-violet-500/50 transition-all cursor-pointer text-center group"
            >
              <div className="text-xl mb-1 group-hover:scale-110 transition-transform">{fmt.icon}</div>
              <div className="text-[10px] font-mono font-bold tracking-widest uppercase" style={{ color: fmt.color }}>{fmt.label}</div>
              <div className="text-[9px] text-white/40 mt-0.5">{fmt.desc}</div>
            </div>
          ))}
        </div>

        {/* Wizard component */}
        <TournamentWizard guildId={params.guildId} />

        {/* Slot Force-Fill Manager panel */}
        <div className="mt-6 glass-card p-5 rounded-xl border border-cyan-500/20 hud-grid-bg">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-500/40 text-cyan-400 tracking-widest uppercase bg-cyan-500/10">
              ADVANCED
            </span>
            <NeonText as="h3" color="cyan" className="text-sm font-black tracking-widest uppercase">
              SLOT FORCE-FILL MANAGER
            </NeonText>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="space-y-2">
              <label className="text-white/40 uppercase tracking-widest text-[10px]">Auto-fill from waitlist</label>
              <div className="flex items-center gap-2">
                <div className="w-10 h-5 rounded-full bg-violet-700/40 border border-violet-500/50 cursor-pointer" />
                <span className="text-white/60">Enabled</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-white/40 uppercase tracking-widest text-[10px]">Fill trigger threshold</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  defaultValue={80}
                  className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-white focus:outline-none focus:border-violet-500"
                  readOnly
                />
                <span className="text-white/40">% capacity</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-white/40 uppercase tracking-widest text-[10px]">Capacity matrix</label>
              <div className="flex items-center gap-2 text-white/60">
                <span>Min slots: <span className="text-cyan-400">4</span></span>
                <span>|</span>
                <span>Max: <span className="text-violet-400">64</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Approval Gates + Registration Tariff */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-card p-4 rounded-xl border border-amber-500/20">
            <NeonText as="h3" color="violet" className="text-xs font-black tracking-widest uppercase mb-3">
              APPROVAL GATES
            </NeonText>
            <div className="space-y-2 text-xs font-mono text-white/60">
              {['Manual Approval', 'ID Verification', 'Discord Role Gate', 'Payment Verification'].map(gate => (
                <div key={gate} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border border-violet-500/50 bg-violet-500/10 flex-shrink-0" />
                  <span>{gate}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card p-4 rounded-xl border border-green-500/20">
            <NeonText as="h3" color="cyan" className="text-xs font-black tracking-widest uppercase mb-3">
              REGISTRATION TARIFF
            </NeonText>
            <div className="space-y-2 text-xs font-mono">
              {[
                { label: 'FREE', color: '#10b981' },
                { label: 'PAID (INR)', color: '#06b6d4' },
                { label: 'PAID (TOKENS)', color: '#7c3aed' },
                { label: 'SPONSOR LOCKED', color: '#f59e0b' },
              ].map(t => (
                <div key={t.label} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                  <span className="text-white/60">{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
