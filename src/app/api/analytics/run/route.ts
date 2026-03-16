import { NextResponse } from 'next/server';
import { websiteAnalyticsConfig } from '@/agents';
import { runAgent } from '@/lib/agent-runner';
import { pullGA4Data } from '@/lib/ga4';

export const maxDuration = 60;

/**
 * POST /api/analytics/run — Manual trigger for analytics agent.
 */
export async function POST() {
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
    console.error('Analytics run error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
