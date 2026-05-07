/**
 * Bryce Studio chat — Redis-backed multi-turn conversation between
 * the GC Team and Bryce. The latest Sloane intel is snapshotted into the
 * conversation when it starts, so the discussion has consistent context
 * even if Sloane re-runs mid-chat.
 */

import { Redis } from '@upstash/redis';
import { BryceConversation, ChatMessage } from './types';

const CONVO_KEY = 'bryce-conversation';

let memoryStore: BryceConversation | null = null;

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

function emptyConversation(): BryceConversation {
  return {
    messages: [],
    intelSnapshot: '',
    intelTakenAt: null,
    updatedAt: new Date().toISOString(),
  };
}

export async function loadConversation(): Promise<BryceConversation> {
  const redis = getRedis();
  if (!redis) return memoryStore || emptyConversation();
  try {
    const convo = await redis.get<BryceConversation>(CONVO_KEY);
    return convo || emptyConversation();
  } catch {
    return memoryStore || emptyConversation();
  }
}

export async function saveConversation(convo: BryceConversation): Promise<void> {
  const updated = { ...convo, updatedAt: new Date().toISOString() };
  const redis = getRedis();
  if (!redis) {
    memoryStore = updated;
    return;
  }
  try {
    await redis.set(CONVO_KEY, updated);
  } catch {
    memoryStore = updated;
  }
}

export async function appendMessage(message: ChatMessage): Promise<BryceConversation> {
  const convo = await loadConversation();
  const updated: BryceConversation = {
    ...convo,
    messages: [...convo.messages, message],
  };
  await saveConversation(updated);
  return updated;
}

export async function resetConversation(intel: string): Promise<BryceConversation> {
  const fresh: BryceConversation = {
    messages: [],
    intelSnapshot: intel,
    intelTakenAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await saveConversation(fresh);
  return fresh;
}

export async function ensureIntel(intel: string): Promise<BryceConversation> {
  const convo = await loadConversation();
  if (!convo.intelSnapshot) {
    return resetConversation(intel);
  }
  return convo;
}
