'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getAgentConfig } from '@/agents';
import { AgentRunLog } from '@/lib/types';
import { ReportFiles } from '@/components/report-files';

const departmentColors: Record<string, string> = {
  'Business Intelligence': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Operations: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Finance: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Marketing: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Strategy: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.agentId as string;
  const agent = getAgentConfig(agentId);

  const [logs, setLogs] = useState<AgentRunLog[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'files'>('history');
  const [running, setRunning] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/logs?agentId=${agentId}`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  }, [agentId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, sendEmail: false }),
      });
      const data = await res.json();
      if (data.log) {
        setLogs((prev) => [data.log, ...prev.filter((l) => l.id !== data.log.id)]);
      }
      await fetchLogs();
    } catch (err) {
      console.error('Failed to run agent:', err);
    }
    setRunning(false);
  };

  if (!agent) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Agent Not Found</h1>
        <p className="text-neutral-400 mb-8">
          No agent with ID &quot;{agentId}&quot; exists.
        </p>
        <Link
          href="/dashboard"
          className="text-[#B5A36B] hover:text-[#3aa85e] transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const successCount = logs.filter((l) => l.status === 'success').length;
  const errorCount = logs.filter((l) => l.status === 'error').length;
  const totalTokens = logs.reduce((s, l) => s + l.inputTokens + l.outputTokens, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-500 mb-6">
        <Link href="/dashboard" className="hover:text-white transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-neutral-300">{agent.name}</span>
      </div>

      {/* Agent Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0"
            style={{ backgroundColor: agent.avatar.color }}
          >
            {agent.avatar.initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
            <p className="text-neutral-400">{agent.title}</p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  departmentColors[agent.department] || 'bg-neutral-800 text-neutral-400 border-neutral-700'
                }`}
              >
                {agent.department}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  agent.status === 'active'
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                }`}
              >
                {agent.status === 'active' ? '● Active' : '○ Standby'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={running}
          className="px-4 py-2 bg-[#B5A36B] hover:bg-[#C9BA88] text-black font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {running ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Running...
            </>
          ) : (
            'Run Now'
          )}
        </button>
      </div>

      {/* Bio */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5 mb-8">
        <p className="text-neutral-400 text-sm leading-relaxed">{agent.bio}</p>
        <div className="flex items-center gap-2 mt-3 text-xs text-neutral-600">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {agent.schedule}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
          <p className="text-xs text-neutral-500 mb-1">Total Runs</p>
          <p className="text-xl font-bold text-white">{logs.length}</p>
        </div>
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
          <p className="text-xs text-neutral-500 mb-1">Successful</p>
          <p className="text-xl font-bold text-green-400">{successCount}</p>
        </div>
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
          <p className="text-xs text-neutral-500 mb-1">Errors</p>
          <p className="text-xl font-bold text-red-400">{errorCount}</p>
        </div>
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
          <p className="text-xs text-neutral-500 mb-1">Total Tokens</p>
          <p className="text-xl font-bold text-white">{totalTokens.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-800 mb-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'text-white border-[#B5A36B]'
                : 'text-neutral-500 border-transparent hover:text-neutral-300'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'files'
                ? 'text-white border-[#B5A36B]'
                : 'text-neutral-500 border-transparent hover:text-neutral-300'
            }`}
          >
            Files
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'history' && <ReportFiles logs={logs} />}
      {activeTab === 'files' && (
        <div className="space-y-3">
          {logs.filter((l) => l.pdfBase64).length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <p>No PDF reports yet. Run the agent to generate a branded report.</p>
            </div>
          ) : (
            logs
              .filter((l) => l.pdfBase64)
              .map((log) => {
                const date = new Date(log.startedAt);
                const filename = `${agent.id}-report-${date.toISOString().split('T')[0]}.pdf`;
                return (
                  <a
                    key={log.id}
                    href={`/api/agents/pdf?logId=${log.id}`}
                    download
                    className="flex items-center justify-between p-4 bg-neutral-900/50 border border-neutral-800 rounded-lg hover:border-[#B5A36B]/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-300 font-medium group-hover:text-[#B5A36B] transition-colors">
                          {filename}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {date.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}{' '}
                          at{' '}
                          {date.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#B5A36B]">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </div>
                  </a>
                );
              })
          )}
        </div>
      )}

      {/* Agent Config Info */}
      <div className="mt-12 bg-neutral-900/50 border border-neutral-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-neutral-300 mb-3">Agent Configuration</h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-neutral-500">Agent ID:</span>
            <span className="text-neutral-300 ml-2 font-mono">{agent.id}</span>
          </div>
          <div>
            <span className="text-neutral-500">Model:</span>
            <span className="text-neutral-300 ml-2 font-mono">{agent.model}</span>
          </div>
          <div>
            <span className="text-neutral-500">Max Tokens:</span>
            <span className="text-neutral-300 ml-2">{agent.maxTokens}</span>
          </div>
          <div>
            <span className="text-neutral-500">Temperature:</span>
            <span className="text-neutral-300 ml-2">{agent.temperature}</span>
          </div>
          <div>
            <span className="text-neutral-500">Cron:</span>
            <span className="text-neutral-300 ml-2 font-mono">{agent.cronSchedule}</span>
          </div>
          <div>
            <span className="text-neutral-500">API Endpoint:</span>
            <span className="text-neutral-300 ml-2 font-mono">POST /api/agents/run</span>
          </div>
        </div>
      </div>
    </div>
  );
}
