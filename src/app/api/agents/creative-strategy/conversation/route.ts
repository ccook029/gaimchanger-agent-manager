import { NextResponse } from 'next/server';
import { loadConversation } from '@/lib/bryce-chat';

export const maxDuration = 30;

/**
 * GET /api/agents/creative-strategy/conversation — return current Bryce convo.
 */
export async function GET() {
  const conversation = await loadConversation();
  return NextResponse.json({ conversation });
}
