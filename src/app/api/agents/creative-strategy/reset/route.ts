import { NextResponse } from 'next/server';
import { resetConversation } from '@/lib/bryce-chat';
import { fetchAgentVariables } from '@/lib/agent-data';

export const maxDuration = 30;

/**
 * POST /api/agents/creative-strategy/reset — start a fresh conversation,
 * snapshotting the latest Sloane intel as context.
 */
export async function POST() {
  const vars = await fetchAgentVariables('creative-strategy');
  const intel = vars.intel || 'No intel available.';
  const conversation = await resetConversation(intel);
  return NextResponse.json({ conversation });
}
