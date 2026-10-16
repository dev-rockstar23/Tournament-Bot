'use client'

import { GlassCard } from '@/components/ui/GlassCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type BotAnalytics = {
  totalCommands: number;
  uniqueCommands?: number;
  topCommands: Array<{ name: string; count: number }>;
  avgResponseTimeMs?: number | null;
};

interface BotAnalyticsTabProps {
  data: BotAnalytics;
}

const VIOLET = '#7c3aed';

export function BotAnalyticsTab({ data }: BotAnalyticsTabProps) {
  const chartData = data.topCommands.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-6" hover={false}>
          <div className="text-white/60 text-sm mb-2">Total Commands</div>
          <div className="text-3xl font-bold text-white">{data.totalCommands.toLocaleString()}</div>
        </GlassCard>

        <GlassCard className="p-6" hover={false}>
          <div className="text-white/60 text-sm mb-2">Unique Commands</div>
          <div className="text-3xl font-bold text-white">
            {data.uniqueCommands?.toLocaleString() ?? data.topCommands.length}
          </div>
        </GlassCard>

        <GlassCard className="p-6" hover={false}>
          <div className="text-white/60 text-sm mb-2">Avg Response Time</div>
          <div className="text-3xl font-bold text-white">
            {data.avgResponseTimeMs !== null && data.avgResponseTimeMs !== undefined
              ? `${Math.round(data.avgResponseTimeMs)}ms`
              : 'N/A'}
          </div>
        </GlassCard>
      </div>

      {/* Top Commands Chart */}
      <GlassCard className="p-6" hover={false}>
        <h3 className="text-xl font-semibold text-white mb-4">Top Commands</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis type="number" stroke="#ffffff60" />
              <YAxis dataKey="name" type="category" stroke="#ffffff60" width={90} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                cursor={{ fill: 'rgba(124, 58, 237, 0.1)' }}
              />
              <Bar dataKey="count" fill={VIOLET} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-white/60">
            No command data available
          </div>
        )}
      </GlassCard>
    </div>
  );
}
