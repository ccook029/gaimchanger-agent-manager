import { NextResponse } from 'next/server';
import { contentMarketingConfig } from '@/agents';
import { runAgent } from '@/lib/agent-runner';
import { fetchContentMarketingData } from '@/lib/content-marketing';

export const maxDuration = 60;

export async function POST() {
  try {
    const cmData = await fetchContentMarketingData();
    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const log = await runAgent(contentMarketingConfig, {
      variables: {
        date,
        productData: cmData.productData,
        topSellers: cmData.topSellers,
        competitorTrends: cmData.competitorTrends,
        batchId: cmData.batchId,
        angles: cmData.angles,
        seasonalNotes: cmData.seasonalNotes,
      },
      sendEmailReport: false,
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error('Content marketing run error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
