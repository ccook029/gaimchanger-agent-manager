'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getAllAgentConfigs } from '@/agents';
import { AgentRunLog, AgentConfig } from '@/lib/types';

const departmentColors: Record<string, string> = {
  'Business Intelligence': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Operations: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Finance: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Marketing: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Strategy: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

export default function DashboardPage() {
  const agents = getAllAgentConfigs();
  const [logs, setLogs] = useState<AgentRunLog[]>([]);
  const [running, setRunning] = useState(false);
  const [runningAgent, setRunningAgent] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/agents/logs');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const runAllAgents = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendEmail: false }),
      });
      const data = await res.json();
      if (data.logs) {
        setLogs((prev) => [...data.logs, ...prev]);
      }
      await fetchLogs();
    } catch (err) {
      console.error('Failed to run agents:', err);
    }
    setRunning(false);
  };

  const runSingleAgent = async (agentId: string) => {
    setRunningAgent(agentId);
    try {
      const res = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, sendEmail: false }),
      });
      const data = await res.json();
      // Use the log from the response directly (works even without KV)
      if (data.log) {
        setLogs((prev) => [data.log, ...prev.filter((l) => l.id !== data.log.id)]);
      }
      await fetchLogs();
    } catch (err) {
      console.error('Failed to run agent:', err);
    }
    setRunningAgent(null);
  };

  const getLatestLog = (agentId: string): AgentRunLog | undefined => {
    return logs.find((l) => l.agentId === agentId);
  };

  const getAgentReportCount = (agentId: string): number => {
    return logs.filter((l) => l.agentId === agentId && l.status === 'success').length;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Operations Dashboard</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Monitor and manage all AI agents
          </p>
        </div>
        <button
          onClick={runAllAgents}
          disabled={running}
          className="px-4 py-2 bg-[#2d8a4e] hover:bg-[#24713f] text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Run All Agents
            </>
          )}
        </button>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => {
          const latestLog = getLatestLog(agent.id);
          const reportCount = getAgentReportCount(agent.id);
          const isAgentRunning = runningAgent === agent.id;

          return (
            <AgentCard
              key={agent.id}
              agent={agent}
              latestLog={latestLog}
              reportCount={reportCount}
              isRunning={isAgentRunning}
              onRun={() => runSingleAgent(agent.id)}
            />
          );
        })}
      </div>

      {/* Recent Activity */}
      {logs.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
          <div className="space-y-2">
            {logs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 bg-neutral-900/50 border border-neutral-800 rounded-lg text-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      log.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <span className="text-neutral-300 font-medium">{log.agentName}</span>
                  <span className="text-neutral-600">
                    {new Date(log.startedAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-neutral-500 text-xs">
                  <span>{(log.durationMs / 1000).toFixed(1)}s</span>
                  <span>{(log.inputTokens + log.outputTokens).toLocaleString()} tokens</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AgentCard({
  agent,
  latestLog,
  reportCount,
  isRunning,
  onRun,
}: {
  agent: AgentConfig;
  latestLog?: AgentRunLog;
  reportCount: number;
  isRunning: boolean;
  onRun: () => void;
}) {
  return (
    <div className="p-5 bg-neutral-900/50 border border-neutral-800 rounded-xl">
      <div className="flex items-start justify-between mb-4">
        <Link href={`/dashboard/${agent.id}`} className="flex items-start gap-3 group">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: agent.avatar.color }}
          >
            {agent.avatar.initials}
          </div>
          <div>
            <h3 className="font-semibold text-white group-hover:text-[#2d8a4e] transition-colors">
              {agent.name}
            </h3>
            <p className="text-neutral-500 text-xs">{agent.title}</p>
          </div>
        </Link>
        <span
          className={`text-xs px-2 py-0.5 rounded-full border ${
            departmentColors[agent.department] || 'bg-neutral-800 text-neutral-400 border-neutral-700'
          }`}
        >
          {agent.department}
        </span>
      </div>

      {/* Status */}
      <div className="space-y-2 mb-4 text-xs text-neutral-500">
        <div className="flex justify-between">
          <span>Status</span>
          <span className={latestLog?.status === 'error' ? 'text-red-400' : 'text-green-400'}>
            {latestLog ? (latestLog.status === 'success' ? 'Last run OK' : 'Last run failed') : 'No runs yet'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Last Run</span>
          <span className="text-neutral-400">
            {latestLog
              ? new Date(latestLog.startedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Reports</span>
          <span className="text-neutral-400">{reportCount}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onRun}
          disabled={isRunning}
          className="flex-1 py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          {isRunning ? (
            <>
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Running...
            </>
          ) : (
            'Run Now'
          )}
        </button>
        <Link
          href={`/dashboard/${agent.id}`}
          className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium transition-colors"
        >
          View
        </Link>
      </div>
    </div>
  );
}
