import { Redis } from '@upstash/redis';
import { AgentRunLog } from './types';

const LOGS_KEY = 'agent-run-logs';
const MAX_LOGS = 500;

// In-memory fallback for development
let memoryStore: AgentRunLog[] = [];

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null;
  }
  if (!_redis) {
    _redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
  return _redis;
}

export async function getLogs(): Promise<AgentRunLog[]> {
  const redis = getRedis();
  if (!redis) {
    return memoryStore;
  }
  try {
    const logs = await redis.get<AgentRunLog[]>(LOGS_KEY);
    return logs || [];
  } catch {
    console.warn('Redis unavailable, using memory store');
    return memoryStore;
  }
}

export async function addLog(log: AgentRunLog): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    memoryStore = [log, ...memoryStore].slice(0, MAX_LOGS);
    return;
  }
  try {
    const logs = await getLogs();
    const updated = [log, ...logs].slice(0, MAX_LOGS);
    await redis.set(LOGS_KEY, updated);
  } catch {
    console.warn('Redis unavailable, using memory store');
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
