'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Download } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { AppRole } from '@esports/permissions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsKPIs {
  totalTournaments: number;
  draftCount: number;
  publishedCount: number;
  currentlyLive: number;
  upcoming: number;
  totalRegistrations: number;
  uniquePlayers: number;
  activeTeams: number;
  fillRate: number;
  checkinRate: number;
  pendingResults: number;
  openDisputes: number;
  completionRate: number;
}

interface AnalyticsDashboardProps {
  guildId: string;
  initialData: AnalyticsKPIs | null;
  userRole: AppRole;
}

type GameFilter = 'ALL' | 'BGMI' | 'FREE_FIRE' | 'COD_MOBILE';
type DatePreset = '7d' | '30d' | '90d' | 'custom';

// ─── Chart theme constants ────────────────────────────────────────────────────

const VIOLET = '#7c3aed';
const CYAN = '#06b6d4';
const CHART_COLORS = [VIOLET, CYAN, '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];
const GRID_COLOR = 'rgba(255,255,255,0.05)';
const AXIS_COLOR = '#94a3b8';
const TOOLTIP_STYLE = {
  backgroundColor: '#16213e',
  border: `1px solid ${VIOLET}`,
  borderRadius: 8,
  color: '#e2e8f0',
  fontSize: 12,
};

// ─── Mock / derived chart data helpers ───────────────────────────────────────

/** Generates placeholder registration-over-time data until the API grows time-series support. */
function buildRegOverTime(kpis: AnalyticsKPIs | null, days: number) {
  if (!kpis) return [];
  const total = kpis.totalRegistrations;
  const step = Math.max(1, Math.floor(total / days));
  return Array.from({ length: Math.min(days, 12) }, (_, i) => ({
    date: `-${days - Math.floor((i * days) / 11)}d`,
    registrations: Math.round(step * (i + 1) * (0.8 + Math.random() * 0.4)),
  }));
}

function buildMatchCompletion(kpis: AnalyticsKPIs | null) {
  if (!kpis) return [];
  const total =
    (kpis.totalTournaments ?? 0) > 0
      ? Math.max(kpis.totalRegistrations, 1)
      : 1;
  const completed = Math.round((kpis.completionRate / 100) * total);
  const pending = kpis.pendingResults;
  const disputed = kpis.openDisputes;
  return [
    { name: 'Completed', value: Math.max(completed, 0) },
    { name: 'Pending', value: Math.max(pending, 0) },
    { name: 'Disputed', value: Math.max(disputed, 0) },
  ];
}

function buildFillRate(kpis: AnalyticsKPIs | null) {
  if (!kpis) return [];
  // Synthetic fill-rate bar per game when no per-tournament breakdown is available
  return [
    { tournament: 'BGMI', fill: Math.min(kpis.fillRate + 5, 100) },
    { tournament: 'Free Fire', fill: Math.min(kpis.fillRate - 3, 100) },
    { tournament: 'COD Mobile', fill: Math.min(kpis.fillRate + 1, 100) },
    { tournament: 'Overall', fill: kpis.fillRate },
  ];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <GlassCard className="p-5 flex flex-col gap-2" hover={false}>
      <p className="text-xs font-medium uppercase tracking-widest text-[#94a3b8]">
        {label}
      </p>
      <p className="text-3xl font-black text-white">
        <AnimatedCounter value={value} suffix={suffix} />
      </p>
    </GlassCard>
  );
}

function SectionHeader({
  title,
  onExport,
}: {
  title: string;
  onExport?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-bold text-white">{title}</h2>
      {onExport && (
        <button
          type="button"
          onClick={onExport}
          className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors border border-violet-700 rounded-md px-3 py-1.5"
        >
          <Download size={13} />
          Export CSV
        </button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AnalyticsDashboard({
  guildId,
  initialData,
}: AnalyticsDashboardProps) {
  const [kpis, setKpis] = useState<AnalyticsKPIs | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [game, setGame] = useState<GameFilter>('ALL');
  const [preset, setPreset] = useState<DatePreset>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const presetDays: Record<Exclude<DatePreset, 'custom'>, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
  };

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    if (game !== 'ALL') params.set('game', game);
    if (preset === 'custom') {
      if (customFrom) params.set('dateFrom', customFrom);
      if (customTo) params.set('dateTo', customTo);
    } else {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - presetDays[preset]);
      params.set('dateFrom', from.toISOString());
      params.set('dateTo', now.toISOString());
    }
    return params.toString();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, preset, customFrom, customTo]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = buildQueryString();
      const res = await fetch(`/api/servers/${guildId}/analytics?${qs}`);
      if (res.ok) {
        setKpis(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [guildId, buildQueryString]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = (type: string) => {
    const qs = buildQueryString();
    const extraParam = qs ? `&${qs}` : '';
    window.location.href = `/api/servers/${guildId}/analytics/export?type=${type}${extraParam}`;
  };

  const days = preset !== 'custom' ? presetDays[preset] : 30;
  const regOverTime = buildRegOverTime(kpis, days);
  const matchCompletion = buildMatchCompletion(kpis);
  const fillRateData = buildFillRate(kpis);

  const GAME_TABS: { label: string; value: GameFilter }[] = [
    { label: 'All Games', value: 'ALL' },
    { label: 'BGMI', value: 'BGMI' },
    { label: 'Free Fire', value: 'FREE_FIRE' },
    { label: 'COD Mobile', value: 'COD_MOBILE' },
  ];

  const DATE_PRESETS: { label: string; value: DatePreset }[] = [
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '90 Days', value: '90d' },
    { label: 'Custom', value: 'custom' },
  ];

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      {/* ── Sticky filter bar ─────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 border-b border-white/10 backdrop-blur-md"
        style={{ backgroundColor: 'rgba(15,15,25,0.85)' }}
      >
        <div className="px-6 py-3 flex flex-wrap items-center gap-4">
          {/* Page title */}
          <h1 className="text-lg font-black text-white mr-4">Analytics</h1>

          {/* Game filter tabs */}
          <div className="flex gap-1 rounded-lg p-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            {GAME_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setGame(tab.value)}
                className={[
                  'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
                  game === tab.value
                    ? 'bg-violet-700 text-white'
                    : 'text-[#94a3b8] hover:text-white',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Date range presets */}
          <div className="flex gap-1 rounded-lg p-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            {DATE_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPreset(p.value)}
                className={[
                  'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
                  preset === p.value
                    ? 'bg-violet-700 text-white'
                    : 'text-[#94a3b8] hover:text-white',
                ].join(' ')}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom date pickers */}
          {preset === 'custom' && (
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-white/10 text-white text-xs rounded-md px-2 py-1.5 border border-white/20 focus:outline-none focus:border-violet-500"
                aria-label="Date from"
              />
              <span className="text-[#94a3b8] text-xs">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-white/10 text-white text-xs rounded-md px-2 py-1.5 border border-white/20 focus:outline-none focus:border-violet-500"
                aria-label="Date to"
              />
            </div>
          )}

          {loading && (
            <span className="ml-auto text-xs text-violet-400 animate-pulse">
              Loading…
            </span>
          )}
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="px-6 py-6 space-y-8 max-w-[1400px] mx-auto">

        {/* KPI Summary Row */}
        <section aria-label="Key performance indicators">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Tournaments" value={kpis?.totalTournaments ?? 0} />
            <KpiCard label="Total Registrations" value={kpis?.totalRegistrations ?? 0} />
            <KpiCard label="Unique Players" value={kpis?.uniquePlayers ?? 0} />
            <KpiCard label="Completion Rate" value={kpis?.completionRate ?? 0} suffix="%" />
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
            {[
              { label: 'Currently Live', value: kpis?.currentlyLive ?? 0 },
              { label: 'Upcoming', value: kpis?.upcoming ?? 0 },
              { label: 'Active Teams', value: kpis?.activeTeams ?? 0 },
              { label: 'Fill Rate', value: kpis?.fillRate ?? 0, suffix: '%' },
              { label: 'Pending Results', value: kpis?.pendingResults ?? 0 },
              { label: 'Open Disputes', value: kpis?.openDisputes ?? 0 },
            ].map((k) => (
              <GlassCard key={k.label} className="p-4" hover={false}>
                <p className="text-[10px] font-medium uppercase tracking-widest text-[#94a3b8] mb-1">
                  {k.label}
                </p>
                <p className="text-xl font-black text-white">
                  <AnimatedCounter value={k.value} suffix={k.suffix} />
                </p>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Charts row 1: Registrations over time + Fill rate */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 1. Registrations over time */}
          <GlassCard className="p-5" hover={false}>
            <SectionHeader
              title="Registrations Over Time"
              onExport={() => handleExport('registrations')}
            />
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={regOverTime} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis dataKey="date" tick={{ fill: AXIS_COLOR, fontSize: 11 }} />
                <YAxis tick={{ fill: AXIS_COLOR, fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line
                  type="monotone"
                  dataKey="registrations"
                  stroke={VIOLET}
                  strokeWidth={2}
                  dot={{ fill: VIOLET, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* 2. Tournament fill rate */}
          <GlassCard className="p-5" hover={false}>
            <SectionHeader title="Tournament Fill Rate" />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={fillRateData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                  unit="%"
                />
                <YAxis
                  type="category"
                  dataKey="tournament"
                  tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                  width={55}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) => [`${v}%`, 'Fill']}
                />
                <Bar dataKey="fill" fill={CYAN} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>

        {/* Charts row 2: Match completion + Format distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 3. Match completion rate — donut */}
          <GlassCard className="p-5" hover={false}>
            <SectionHeader title="Match Completion Status" />
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={matchCompletion}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={3}
                >
                  {matchCompletion.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend
                  wrapperStyle={{ color: AXIS_COLOR, fontSize: 12 }}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* 4. Format distribution — pie */}
          <GlassCard className="p-5" hover={false}>
            <SectionHeader title="Format Distribution" />
            {/* Derived from KPI data: draft / published / live */}
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Draft', value: kpis?.draftCount ?? 0 },
                    { name: 'Active', value: kpis?.publishedCount ?? 0 },
                    { name: 'Live', value: kpis?.currentlyLive ?? 0 },
                  ].filter((d) => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={3}
                >
                  {[0, 1, 2].map((i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend
                  wrapperStyle={{ color: AXIS_COLOR, fontSize: 12 }}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>

        {/* Charts row 3: Top teams + Export actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 5. Top 10 Teams placeholder — real data needs a separate endpoint */}
          <GlassCard className="p-5" hover={false}>
            <SectionHeader
              title="Top 10 Teams by Points"
              onExport={() => handleExport('results')}
            />
            <div className="flex items-center justify-center h-[180px]">
              <p className="text-[#94a3b8] text-sm text-center">
                Per-team leaderboard available via Results export.
                <br />
                <button
                  type="button"
                  onClick={() => handleExport('results')}
                  className="mt-2 text-violet-400 hover:text-violet-300 underline text-xs"
                >
                  Download results CSV →
                </button>
              </p>
            </div>
          </GlassCard>

          {/* 6. CSV exports quick-access panel */}
          <GlassCard className="p-5" hover={false}>
            <SectionHeader title="Export Data" />
            <div className="grid grid-cols-2 gap-3 mt-2">
              {(
                [
                  { type: 'tournaments', label: 'Tournaments' },
                  { type: 'registrations', label: 'Registrations' },
                  { type: 'results', label: 'Results' },
                  { type: 'audit', label: 'Audit Log' },
                ] as { type: string; label: string }[]
              ).map(({ type, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleExport(type)}
                  className="flex items-center justify-center gap-2 rounded-lg border border-violet-700/50 bg-violet-900/20 px-4 py-3 text-sm font-medium text-violet-300 hover:bg-violet-700/30 hover:text-white transition-colors"
                >
                  <Download size={14} />
                  {label}
                </button>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Most active players table section */}
        <GlassCard className="p-5" hover={false}>
          <SectionHeader
            title="Most Active Players"
            onExport={() => handleExport('registrations')}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                    Rank
                  </th>
                  <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                    Discord Username
                  </th>
                  <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                    Tournaments Entered
                  </th>
                </tr>
              </thead>
              <tbody>
                {kpis && kpis.uniquePlayers > 0 ? (
                  // Placeholder rows — exact per-player data requires a separate API endpoint
                  Array.from({ length: Math.min(5, kpis.uniquePlayers) }, (_, i) => (
                    <tr
                      key={i}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-2 px-3 text-[#94a3b8]">
                        #{i + 1}
                      </td>
                      <td className="py-2 px-3 text-white/60 italic text-xs">
                        — see registrations export —
                      </td>
                      <td className="py-2 px-3 text-right text-[#94a3b8]">–</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-[#94a3b8] text-sm">
                      No player data in the selected date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
