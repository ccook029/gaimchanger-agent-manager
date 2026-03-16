import { NextResponse } from 'next/server';
import { competitorIntelConfig } from '@/agents';
import { runAgent } from '@/lib/agent-runner';
import { scanAllCompetitors } from '@/lib/competitors';

export const maxDuration = 60;

/**
 * POST /api/competitors/run — Manual trigger for competitor intel agent.
 */
export async function POST() {
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
    console.error('Competitors run error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
