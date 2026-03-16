import { NextRequest, NextResponse } from 'next/server';
import { runAllAgents } from '@/lib/orchestrator';

/**
 * GET /api/cron/run-agents — Vercel Cron endpoint to run all agents.
 * Schedule: 0 12 * * * (daily at noon UTC)
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runAllAgents();

    return NextResponse.json({
      success: true,
      agentsRun: result.logs.length,
      successCount: result.logs.filter((l) => l.status === 'success').length,
      errorCount: result.logs.filter((l) => l.status === 'error').length,
    });
  } catch (error) {
    console.error('Cron run-agents error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
