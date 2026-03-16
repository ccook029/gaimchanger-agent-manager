import { NextRequest, NextResponse } from 'next/server';
import { websiteAnalyticsConfig } from '@/agents';
import { runAgent } from '@/lib/agent-runner';
import { pullGA4Data } from '@/lib/ga4';

/**
 * GET /api/analytics/daily — Cron endpoint for daily analytics.
 * Schedule: 0 12 * * 1-5 (weekdays at noon UTC / 8 AM ET)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { markdown } = await pullGA4Data();
    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const log = await runAgent(websiteAnalyticsConfig, {
      variables: { date, ga4Data: markdown },
      sendEmailReport: true,
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error('Analytics daily error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
