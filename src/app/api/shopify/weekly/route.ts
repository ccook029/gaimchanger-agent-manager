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
 * GET /api/shopify/weekly — Monday Cron for weekly Shopify summary.
 * Schedule: 0 11 * * 1 (Monday at 11 UTC / 7 AM ET)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get last 7 days of orders
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    // Get last 90 days for dead stock analysis
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysStr = ninetyDaysAgo.toISOString().split('T')[0];

    const [weekOrders, allProducts, ninetyDayOrders] = await Promise.all([
      getOrders(`${weekAgoStr}T00:00:00-05:00`),
      getProducts(),
      getOrders(`${ninetyDaysStr}T00:00:00-05:00`),
    ]);

    const salesSummary = calculateSalesSummary(weekOrders);
    const inventoryAnalysis = analyzeInventory(allProducts);
    const deadStock = identifyDeadStock(allProducts, ninetyDayOrders);

    const shopifyData = formatShopifyDataAsMarkdown(
      salesSummary,
      inventoryAnalysis,
      deadStock,
      `Weekly Summary — ${weekAgoStr} to ${new Date().toISOString().split('T')[0]}`
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
        reportType: 'weekly summary',
        shopifyData,
      },
      sendEmailReport: true,
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error('Shopify weekly error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
