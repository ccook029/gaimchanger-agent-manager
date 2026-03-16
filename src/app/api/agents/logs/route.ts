import { NextRequest, NextResponse } from 'next/server';
import { getLogs, getLogsByAgent } from '@/lib/store';

/**
 * GET /api/agents/logs — Fetch run history.
 * Query params: ?agentId=xxx&limit=50
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let logs;
    if (agentId) {
      logs = await getLogsByAgent(agentId);
    } else {
      logs = await getLogs();
    }

    return NextResponse.json({
      logs: logs.slice(0, limit),
      total: logs.length,
    });
  } catch (error) {
    console.error('Logs fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
