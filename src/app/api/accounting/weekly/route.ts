import { NextRequest, NextResponse } from 'next/server';
import { accountingConfig } from '@/agents';
import { runAgent } from '@/lib/agent-runner';
import { getOrders, calculateSalesSummary } from '@/lib/shopify';

export const maxDuration = 60;

/**
 * GET /api/accounting/weekly — Monday Cron for weekly P&L.
 * Schedule: 0 12 * * 1 (Monday at noon UTC / 8 AM ET)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Current week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    // Prior week for comparison
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksStr = twoWeeksAgo.toISOString().split('T')[0];

    const [currentOrders, priorOrders] = await Promise.all([
      getOrders(`${weekAgoStr}T00:00:00-05:00`),
      getOrders(`${twoWeeksStr}T00:00:00-05:00`, `${weekAgoStr}T00:00:00-05:00`),
    ]);

    const currentSummary = calculateSalesSummary(currentOrders);
    const priorSummary = calculateSalesSummary(priorOrders);

    // Count refunds
    const refundedOrders = currentOrders.filter(
      (o) => o.financial_status === 'refunded' || o.financial_status === 'partially_refunded'
    );
    const refundRate =
      currentOrders.length > 0
        ? ((refundedOrders.length / currentOrders.length) * 100).toFixed(1)
        : '0';

    // Count discount usage
    const discountedOrders = currentOrders.filter(
      (o) => parseFloat(o.total_discounts) > 0
    );
    const discountRate =
      currentOrders.length > 0
        ? ((discountedOrders.length / currentOrders.length) * 100).toFixed(1)
        : '0';

    const isFirstOfMonth = new Date().getDate() <= 7;
    const reportType = isFirstOfMonth ? 'monthly close summary' : 'weekly P&L';

    let financialData = `# Financial Data — Week of ${weekAgoStr}\n\n`;
    financialData += `## Current Week\n`;
    financialData += `| Metric | Value |\n| --- | --- |\n`;
    financialData += `| Gross Sales | $${currentSummary.grossSales.toFixed(2)} |\n`;
    financialData += `| Discounts | -$${currentSummary.totalDiscounts.toFixed(2)} |\n`;
    financialData += `| Net Sales | $${currentSummary.netSales.toFixed(2)} |\n`;
    financialData += `| Tax Collected | $${currentSummary.totalTax.toFixed(2)} |\n`;
    financialData += `| Total Orders | ${currentSummary.totalOrders} |\n`;
    financialData += `| AOV | $${currentSummary.aov.toFixed(2)} |\n`;
    financialData += `| Refund Rate | ${refundRate}% (${refundedOrders.length} orders) |\n`;
    financialData += `| Discount Usage | ${discountRate}% of orders |\n\n`;

    financialData += `## Prior Week (Comparison)\n`;
    financialData += `| Metric | Value |\n| --- | --- |\n`;
    financialData += `| Gross Sales | $${priorSummary.grossSales.toFixed(2)} |\n`;
    financialData += `| Net Sales | $${priorSummary.netSales.toFixed(2)} |\n`;
    financialData += `| Total Orders | ${priorSummary.totalOrders} |\n`;
    financialData += `| AOV | $${priorSummary.aov.toFixed(2)} |\n\n`;

    const revenueChange = priorSummary.grossSales > 0
      ? (((currentSummary.grossSales - priorSummary.grossSales) / priorSummary.grossSales) * 100).toFixed(1)
      : 'N/A';
    financialData += `## Week-over-Week\n`;
    financialData += `Revenue Change: ${revenueChange}%\n\n`;

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
    console.error('Accounting weekly error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
