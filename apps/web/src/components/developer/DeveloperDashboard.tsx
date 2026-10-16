'use client'

// import { GlassCard } from '@/components/ui/GlassCard';
import * as Tabs from '@radix-ui/react-tabs';
import { BridgeHealthTab } from './BridgeHealthTab';
import { BotAnalyticsTab } from './BotAnalyticsTab';
import { BotErrorsTab } from './BotErrorsTab';
import { WebsiteErrorsTab } from './WebsiteErrorsTab';

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

type ErrorLog = {
  id: string;
  guildId: string;
  source: string;
  errorType: string;
  message: string;
  stack: string | null;
  metadata: unknown;
  timestamp: Date;
  createdAt: Date;
};

type BotAnalytics = {
  totalCommands: number;
  uniqueCommands?: number;
  topCommands: Array<{ name: string; count: number }>;
  avgResponseTimeMs?: number | null;
};

type SystemMetric = {
  id: string;
  guildId: string;
  metricType: string;
  metricName: string;
  value: number;
  metadata: unknown;
  timestamp: Date;
  createdAt: Date;
};

interface DeveloperDashboardProps {
  guildId: string;
  initialMetrics: SystemMetric[];
  initialErrors: ErrorLog[];
  initialBridgeHealth: BridgeHealthCheck[];
  initialBotAnalytics: BotAnalytics;
  initialWebsiteErrors: ErrorLog[];
}

// const VIOLET = '#7c3aed'; // Unused for now
// const CYAN = '#06b6d4'; // Unused for now
// const AMBER = '#f59e0b'; // Unused for now
// const RED = '#ef4444'; // Unused for now
// const GREEN = '#22c55e'; // Unused for now

export function DeveloperDashboard({
  guildId: _guildId,
  initialMetrics: _initialMetrics,
  initialErrors,
  initialBridgeHealth,
  initialBotAnalytics,
  initialWebsiteErrors,
}: DeveloperDashboardProps) {
  return (
    <main className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="font-display text-4xl font-black text-white mb-2">
            Developer Dashboard
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            System health, analytics, and error logs
          </p>
        </header>

        <Tabs.Root defaultValue="bridge" className="w-full">
          <Tabs.List className="flex gap-2 mb-6 border-b border-white/10 pb-2">
            <Tabs.Trigger
              value="bridge"
              className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-violet-500 transition-colors"
            >
              Bridge Health
            </Tabs.Trigger>
            <Tabs.Trigger
              value="bot-analytics"
              className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 transition-colors"
            >
              Bot Analytics
            </Tabs.Trigger>
            <Tabs.Trigger
              value="bot-errors"
              className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-amber-500 transition-colors"
            >
              Bot Errors
            </Tabs.Trigger>
            <Tabs.Trigger
              value="website-errors"
              className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-red-500 transition-colors"
            >
              Website Errors
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="bridge" className="focus:outline-none">
            <BridgeHealthTab data={initialBridgeHealth} />
          </Tabs.Content>

          <Tabs.Content value="bot-analytics" className="focus:outline-none">
            <BotAnalyticsTab data={initialBotAnalytics} />
          </Tabs.Content>

          <Tabs.Content value="bot-errors" className="focus:outline-none">
            <BotErrorsTab data={initialErrors} />
          </Tabs.Content>

          <Tabs.Content value="website-errors" className="focus:outline-none">
            <WebsiteErrorsTab data={initialWebsiteErrors} />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </main>
  );
}
