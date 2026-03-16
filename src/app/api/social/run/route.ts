import { NextResponse } from 'next/server';
import { socialMediaConfig } from '@/agents';
import { runAgent } from '@/lib/agent-runner';
import { scanSocialMedia } from '@/lib/apify';

/**
 * POST /api/social/run — Manual trigger for social media agent.
 */
export async function POST() {
  try {
    const socialData = await scanSocialMedia();
    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const log = await runAgent(socialMediaConfig, {
      variables: { date, socialData },
      sendEmailReport: true,
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error('Social run error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
