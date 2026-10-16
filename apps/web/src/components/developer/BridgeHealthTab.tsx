'use client'

import { GlassCard } from '@/components/ui/GlassCard';
import { StatusPulse } from '@/components/ui/StatusPulse';
import { formatDistanceToNow } from 'date-fns';

type BridgeHealthCheck = {
  id: string;
  guildId: string;
  component: string;
  status: string;
  latencyMs: number | null;
  metadata: unknown;
  checkedAt: Date;
  createdAt: Date;
};

interface BridgeHealthTabProps {
  data: BridgeHealthCheck[];
}

const GREEN = '#22c55e';
const AMBER = '#f59e0b';
const RED = '#ef4444';

function getStatusVariant(status: string): 'synced' | 'pending' | 'offline' {
  if (status === 'healthy') return 'synced';
  if (status === 'degraded') return 'pending';
  return 'offline';
}

function getStatusColor(status: string): string {
  if (status === 'healthy') return GREEN;
  if (status === 'degraded') return AMBER;
  return RED;
}

export function BridgeHealthTab({ data }: BridgeHealthTabProps) {
  if (data.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <p className="text-white/60">No bridge health checks recorded yet.</p>
      </GlassCard>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((check) => (
        <GlassCard key={check.id} className="p-6" hover={false}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg text-white capitalize">
              {check.component.replace(/_/g, ' ')}
            </h3>
            <div className="flex items-center gap-2">
              <StatusPulse variant={getStatusVariant(check.status)} />
              <span
                className="text-sm font-medium capitalize"
                style={{ color: getStatusColor(check.status) }}
              >
                {check.status}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {check.latencyMs !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Latency</span>
                <span className="text-white font-mono">{check.latencyMs}ms</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Last check</span>
              <span className="text-white">
                {formatDistanceToNow(new Date(check.checkedAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
