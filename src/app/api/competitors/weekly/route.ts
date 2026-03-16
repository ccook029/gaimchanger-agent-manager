import { NextRequest, NextResponse } from 'next/server';
import { competitorIntelConfig } from '@/agents';
import { runAgent } from '@/lib/agent-runner';
import { scanAllCompetitors } from '@/lib/competitors';

export const maxDuration = 60;

/**
 * GET /api/competitors/weekly — Wednesday Cron for competitive intelligence.
 * Schedule: 0 12 * * 3 (Wednesday at noon UTC / 8 AM ET)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const competitorData = await scanAllCompetitors();
    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const log = await runAgent(competitorIntelConfig, {
      variables: { date, competitorData },
      sendEmailReport: true,
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error('Competitors weekly error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
