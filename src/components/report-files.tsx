'use client';

import React, { useState } from 'react';
import { AgentRunLog } from '@/lib/types';
import { ReportRenderer } from './report-renderer';

interface ReportFilesProps {
  logs: AgentRunLog[];
}

export function ReportFiles({ logs }: ReportFilesProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-500">
        No reports yet. Run the agent to generate the first report.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div
          key={log.id}
          className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/50"
        >
          <button
            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-2 h-2 rounded-full ${
                  log.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-sm text-neutral-300">
                {new Date(log.startedAt).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="text-xs text-neutral-500">
                {new Date(log.startedAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-neutral-500">
              <span>{log.model}</span>
              <span>{(log.durationMs / 1000).toFixed(1)}s</span>
              <span>
                {log.inputTokens + log.outputTokens} tokens
              </span>
              <svg
                className={`w-4 h-4 transition-transform ${
                  expandedId === log.id ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {expandedId === log.id && (
            <div className="border-t border-neutral-800 px-4 py-4">
              {log.status === 'error' ? (
                <div className="bg-red-950/30 border border-red-900 rounded-lg p-4">
                  <p className="text-red-400 text-sm font-semibold mb-1">Error</p>
                  <p className="text-red-300 text-sm">{log.error}</p>
                </div>
              ) : (
                <ReportRenderer content={log.report} />
              )}

              <div className="mt-4 pt-3 border-t border-neutral-800 flex gap-6 text-xs text-neutral-500">
                <span>Status: {log.status}</span>
                <span>Model: {log.model}</span>
                <span>Duration: {(log.durationMs / 1000).toFixed(1)}s</span>
                <span>Input: {log.inputTokens.toLocaleString()} tokens</span>
                <span>Output: {log.outputTokens.toLocaleString()} tokens</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
