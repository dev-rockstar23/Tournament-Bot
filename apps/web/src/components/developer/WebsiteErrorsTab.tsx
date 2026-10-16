'use client'

import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatDistanceToNow } from 'date-fns';
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';

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

interface WebsiteErrorsTabProps {
  data: ErrorLog[];
}

const ROWS_PER_PAGE = 10;
const RED = '#ef4444';

function extractPath(metadata: unknown): string | null {
  if (metadata && typeof metadata === 'object') {
    const meta = metadata as Record<string, unknown>;
    if (typeof meta.path === 'string') {
      return meta.path;
    }
    if (meta.context && typeof meta.context === 'object') {
      const ctx = meta.context as Record<string, unknown>;
      if (typeof ctx.path === 'string') {
        return ctx.path;
      }
    }
  }
  return null;
}

export function WebsiteErrorsTab({ data }: WebsiteErrorsTabProps) {
  const [currentPage, setCurrentPage] = useState(0);

  if (data.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <p className="text-white/60">No website errors recorded yet.</p>
      </GlassCard>
    );
  }

  const totalPages = Math.ceil(data.length / ROWS_PER_PAGE);
  const startIndex = currentPage * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const currentData = data.slice(startIndex, endIndex);

  return (
    <GlassCard className="p-6" hover={false}>
      <h3 className="text-xl font-semibold text-white mb-4">Website Error Logs</h3>

      <div className="overflow-x-auto">
        <Accordion.Root type="single" collapsible>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Timestamp</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Path</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Message</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((error) => {
                const path = extractPath(error.metadata);
                return (
                  <Accordion.Item key={error.id} value={error.id}>
                    <Accordion.Header>
                      <Accordion.Trigger className="w-full hover:bg-white/5 transition-colors group">
                        <tr className="border-b border-white/5">
                          <td className="py-3 px-4 text-sm text-white/80">
                            {formatDistanceToNow(new Date(error.timestamp), { addSuffix: true })}
                          </td>
                          <td className="py-3 px-4 text-sm text-white/80">
                            <code className="px-2 py-1 bg-white/10 rounded text-xs" style={{ color: RED }}>
                              {path ?? 'N/A'}
                            </code>
                          </td>
                          <td className="py-3 px-4 text-sm text-white/80 truncate max-w-md">
                            {error.message}
                          </td>
                          <td className="py-3 px-4">
                            <ChevronDown
                              className="w-4 h-4 text-white/60 transition-transform group-data-[state=open]:rotate-180"
                            />
                          </td>
                        </tr>
                      </Accordion.Trigger>
                    </Accordion.Header>
                    <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                      <tr>
                        <td colSpan={4} className="p-4 bg-black/20">
                          <div className="space-y-2">
                            <div className="text-sm">
                              <span className="text-white/60">Error Type: </span>
                              <span className="text-white font-mono">{error.errorType}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-white/60">Source: </span>
                              <span className="text-white font-mono">{error.source}</span>
                            </div>
                            {error.stack && (
                              <div>
                                <div className="text-white/60 text-sm mb-1">Stack Trace:</div>
                                <pre className="text-xs p-3 bg-black/40 rounded overflow-x-auto text-red-400 max-h-64 overflow-y-auto">
                                  {error.stack}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    </Accordion.Content>
                  </Accordion.Item>
                );
              })}
            </tbody>
          </table>
        </Accordion.Root>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
          <div className="text-sm text-white/60">
            Showing {startIndex + 1}-{Math.min(endIndex, data.length)} of {data.length} errors
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-white/10 rounded hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className="px-4 py-2 text-sm font-medium text-white bg-white/10 rounded hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
