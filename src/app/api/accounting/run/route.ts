import { NextRequest, NextResponse } from 'next/server';
import { accountingConfig } from '@/agents';
import { runAgent } from '@/lib/agent-runner';
import { getOrders, calculateSalesSummary } from '@/lib/shopify';

/**
 * POST /api/accounting/run — Manual trigger for accounting agent.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { reportType = 'weekly P&L' } = body as { reportType?: string };

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksStr = twoWeeksAgo.toISOString().split('T')[0];

    const [currentOrders, priorOrders] = await Promise.all([
      getOrders(`${weekAgoStr}T00:00:00-05:00`),
      getOrders(`${twoWeeksStr}T00:00:00-05:00`, `${weekAgoStr}T00:00:00-05:00`),
    ]);

    const currentSummary = calculateSalesSummary(currentOrders);
    const priorSummary = calculateSalesSummary(priorOrders);

    const refundedOrders = currentOrders.filter(
      (o) => o.financial_status === 'refunded' || o.financial_status === 'partially_refunded'
    );
    const refundRate =
      currentOrders.length > 0
        ? ((refundedOrders.length / currentOrders.length) * 100).toFixed(1)
        : '0';

    let financialData = `# Financial Data — Week of ${weekAgoStr}\n\n`;
    financialData += `## Current Week\n`;
    financialData += `| Metric | Value |\n| --- | --- |\n`;
    financialData += `| Gross Sales | $${currentSummary.grossSales.toFixed(2)} |\n`;
    financialData += `| Discounts | -$${currentSummary.totalDiscounts.toFixed(2)} |\n`;
    financialData += `| Net Sales | $${currentSummary.netSales.toFixed(2)} |\n`;
    financialData += `| Tax Collected | $${currentSummary.totalTax.toFixed(2)} |\n`;
    financialData += `| Total Orders | ${currentSummary.totalOrders} |\n`;
    financialData += `| AOV | $${currentSummary.aov.toFixed(2)} |\n`;
    financialData += `| Refund Rate | ${refundRate}% (${refundedOrders.length} orders) |\n\n`;

    financialData += `## Prior Week\n`;
    financialData += `| Metric | Value |\n| --- | --- |\n`;
    financialData += `| Gross Sales | $${priorSummary.grossSales.toFixed(2)} |\n`;
    financialData += `| Net Sales | $${priorSummary.netSales.toFixed(2)} |\n`;
    financialData += `| Total Orders | ${priorSummary.totalOrders} |\n\n`;

    financialData += `## Top Revenue Products\n`;
    financialData += `| Product | Units | Revenue |\n| --- | --- | --- |\n`;
    for (const p of currentSummary.topProducts.slice(0, 10)) {
      financialData += `| ${p.title} | ${p.units} | $${p.revenue.toFixed(2)} |\n`;
    }

    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const log = await runAgent(accountingConfig, {
      variables: {
        date,
        reportType,
        financialData,
        cogsData: 'COGS data not yet configured. Use estimated margins.',
      },
      sendEmailReport: true,
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error('Accounting run error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
