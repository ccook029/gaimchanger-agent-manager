import { NextResponse } from 'next/server';
import { ensureIntel } from '@/lib/bryce-chat';
import { fetchAgentVariables } from '@/lib/agent-data';

export const maxDuration = 30;

/**
 * GET /api/agents/creative-strategy/conversation — return current Bryce convo.
 * If no intel has been snapshotted yet, auto-snapshot Sloane's latest report
 * so the chat input is usable on first page load.
 */
export async function GET() {
  const vars = await fetchAgentVariables('creative-strategy');
  const intel = vars.intel || 'No intel available.';
  const conversation = await ensureIntel(intel);
  return NextResponse.json({ conversation });
}
