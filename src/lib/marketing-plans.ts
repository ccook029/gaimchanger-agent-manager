/**
 * Marketing plan storage — Redis-backed list of plans Sloane drafts and
 * the user approves/rejects. Approved plans drive Predis content generation.
 */

import { Redis } from '@upstash/redis';
import { v4 as uuidv4 } from 'uuid';
import { MarketingPlan, MarketingPlanItem, MarketingPlanStatus } from './types';

const PLANS_KEY = 'marketing-plans';
const MAX_PLANS = 50;

let memoryStore: MarketingPlan[] = [];

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

export async function listPlans(): Promise<MarketingPlan[]> {
  const redis = getRedis();
  if (!redis) return memoryStore;
  try {
    const plans = await redis.get<MarketingPlan[]>(PLANS_KEY);
    return plans || [];
  } catch {
    return memoryStore;
  }
}

export async function getPlan(id: string): Promise<MarketingPlan | null> {
  const plans = await listPlans();
  return plans.find((p) => p.id === id) || null;
}

export async function savePlan(plan: MarketingPlan): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    memoryStore = [plan, ...memoryStore.filter((p) => p.id !== plan.id)].slice(
      0,
      MAX_PLANS
    );
    return;
  }
  try {
    const plans = await listPlans();
    const updated = [plan, ...plans.filter((p) => p.id !== plan.id)].slice(
      0,
      MAX_PLANS
    );
    await redis.set(PLANS_KEY, updated);
  } catch {
    memoryStore = [plan, ...memoryStore.filter((p) => p.id !== plan.id)].slice(
      0,
      MAX_PLANS
    );
  }
}

export async function updatePlanStatus(
  id: string,
  status: MarketingPlanStatus,
  patch?: Partial<MarketingPlan>
): Promise<MarketingPlan | null> {
  const plan = await getPlan(id);
  if (!plan) return null;
  const updated = { ...plan, ...patch, status };
  await savePlan(updated);
  return updated;
}

export async function updatePlanItem(
  planId: string,
  itemId: string,
  patch: Partial<MarketingPlanItem>
): Promise<MarketingPlan | null> {
  const plan = await getPlan(planId);
  if (!plan) return null;
  const updated: MarketingPlan = {
    ...plan,
    items: plan.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
  };
  await savePlan(updated);
  return updated;
}

/**
 * Parse Sloane's report and extract the json-plan code block into a
 * MarketingPlan. Returns null if no plan block is found or parsing fails.
 */
export function extractPlanFromReport(
  agentId: string,
  report: string
): MarketingPlan | null {
  const match = report.match(/```json-plan\s*([\s\S]*?)```/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[1].trim());
    const items: MarketingPlanItem[] = (parsed.items || []).map(
      (it: Partial<MarketingPlanItem>): MarketingPlanItem => ({
        id: uuidv4(),
        date: it.date || '',
        postTime: it.postTime || '',
        platform: (it.platform || 'instagram') as MarketingPlanItem['platform'],
        format: (it.format || 'static') as MarketingPlanItem['format'],
        theme: it.theme || '',
        hook: it.hook || '',
        caption: it.caption || '',
        visualConcept: it.visualConcept || '',
        hashtags: Array.isArray(it.hashtags) ? it.hashtags : [],
        predisStatus: 'pending',
      })
    );

    if (items.length === 0) return null;

    return {
      id: uuidv4(),
      agentId,
      status: 'draft',
      createdAt: new Date().toISOString(),
      weekOf: parsed.weekOf || new Date().toISOString().split('T')[0],
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      themes: Array.isArray(parsed.themes) ? parsed.themes : [],
      items,
      rawReport: report,
    };
  } catch (err) {
    console.error('Failed to parse json-plan block:', err);
    return null;
  }
}
