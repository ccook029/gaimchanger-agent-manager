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
 * POST /api/shopify/run — Manual trigger for Shopify operations agent.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { reportType = 'daily alert' } = body as { reportType?: string };

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysStr = ninetyDaysAgo.toISOString().split('T')[0];

    const [orders, products, ninetyDayOrders] = await Promise.all([
      getOrders(`${weekAgoStr}T00:00:00-05:00`),
      getProducts(),
      getOrders(`${ninetyDaysStr}T00:00:00-05:00`),
    ]);

    const salesSummary = calculateSalesSummary(orders);
    const inventoryAnalysis = analyzeInventory(products);
    const deadStock = identifyDeadStock(products, ninetyDayOrders);

    const shopifyData = formatShopifyDataAsMarkdown(
      salesSummary,
      inventoryAnalysis,
      deadStock,
      `${reportType === 'weekly summary' ? 'Weekly' : 'Daily'} — ${weekAgoStr} to ${new Date().toISOString().split('T')[0]}`
    );

    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const log = await runAgent(shopifyOperationsConfig, {
      variables: { date, reportType, shopifyData },
      sendEmailReport: true,
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error('Shopify run error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
