import { NextRequest, NextResponse } from 'next/server';
import { shopifyOperationsConfig } from '@/agents';
import { runAgent } from '@/lib/agent-runner';
import {
  getOrders,
  getProducts,
  calculateSalesSummary,
  analyzeInventory,
  identifyDeadStock,
  formatShopifyDataAsMarkdown,
} from '@/lib/shopify';

/**
 * GET /api/shopify/daily — Cron endpoint for daily Shopify alerts.
 * Schedule: 0 11 * * 1-5 (weekdays at 11 UTC / 7 AM ET)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const [orders, products] = await Promise.all([
      getOrders(`${yesterdayStr}T00:00:00-05:00`),
      getProducts(),
    ]);

    const salesSummary = calculateSalesSummary(orders);
    const inventoryAnalysis = analyzeInventory(products);

    // For daily, we don't check dead stock (that's weekly)
    const shopifyData = formatShopifyDataAsMarkdown(
      salesSummary,
      inventoryAnalysis,
      [],
      `Daily — ${yesterdayStr}`
    );

    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const log = await runAgent(shopifyOperationsConfig, {
      variables: {
        date,
        reportType: 'daily alert',
        shopifyData,
      },
      sendEmailReport: true,
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error('Shopify daily error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
