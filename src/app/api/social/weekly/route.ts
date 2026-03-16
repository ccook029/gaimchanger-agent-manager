import { NextRequest, NextResponse } from 'next/server';
import { socialMediaConfig } from '@/agents';
import { runAgent } from '@/lib/agent-runner';
import { scanSocialMedia } from '@/lib/apify';

export const maxDuration = 60;

/**
 * GET /api/social/weekly — Monday Cron for weekly social intelligence.
 * Schedule: 0 10 * * 1 (Monday at 10 UTC / 6 AM ET)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
    console.error('Social weekly error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
