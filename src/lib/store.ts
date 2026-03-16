import { kv } from '@vercel/kv';
import { AgentRunLog } from './types';

const LOGS_KEY = 'agent-run-logs';
const MAX_LOGS = 500;

// In-memory fallback for development
let memoryStore: AgentRunLog[] = [];

function isKVAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function getLogs(): Promise<AgentRunLog[]> {
  if (!isKVAvailable()) {
    return memoryStore;
  }
  try {
    const logs = await kv.get<AgentRunLog[]>(LOGS_KEY);
    return logs || [];
  } catch {
    console.warn('KV unavailable, using memory store');
    return memoryStore;
  }
}

export async function addLog(log: AgentRunLog): Promise<void> {
  if (!isKVAvailable()) {
    memoryStore = [log, ...memoryStore].slice(0, MAX_LOGS);
    return;
  }
  try {
    const logs = await getLogs();
    const updated = [log, ...logs].slice(0, MAX_LOGS);
    await kv.set(LOGS_KEY, updated);
  } catch {
    console.warn('KV unavailable, using memory store');
    memoryStore = [log, ...memoryStore].slice(0, MAX_LOGS);
  }
}

export async function getLogsByAgent(agentId: string): Promise<AgentRunLog[]> {
  const logs = await getLogs();
  return logs.filter((l) => l.agentId === agentId);
}

export async function getLatestLogByAgent(agentId: string): Promise<AgentRunLog | null> {
  const logs = await getLogsByAgent(agentId);
  return logs[0] || null;
}
