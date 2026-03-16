/**
 * Agent-specific data fetchers — provides each agent with the data it needs.
 */

import { scanAllCompetitors } from './competitors';
import {
  getOrders,
  getProducts,
  calculateSalesSummary,
  analyzeInventory,
  identifyDeadStock,
  formatShopifyDataAsMarkdown,
} from './shopify';

/**
 * Fetch the required variables for a given agent before running it.
 */
export async function fetchAgentVariables(
  agentId: string
): Promise<Record<string, string>> {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  switch (agentId) {
    case 'competitor-intel': {
      const competitorData = await scanAllCompetitors();
      return { date, competitorData };
    }

    case 'shopify-operations': {
      const shopifyData = await fetchShopifyData('daily alert');
      return { date, reportType: 'daily alert', shopifyData };
    }

    case 'accounting': {
      const financialData = await fetchFinancialData();
      return { date, reportType: 'weekly P&L', financialData, cogsData: 'COGS data not yet configured. Use estimated margins.' };
    }

    case 'website-analytics':
      return { date, ga4Data: 'GA4 data not yet configured. Provide a general status update based on your knowledge.' };

    case 'social-media':
      return { date, socialData: 'Social media data not yet configured.' };

    default:
      return { date };
  }
}

async function fetchShopifyData(reportType: string): Promise<string> {
  try {
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

    return formatShopifyDataAsMarkdown(
      salesSummary,
      inventoryAnalysis,
      deadStock,
      `${reportType === 'weekly summary' ? 'Weekly' : 'Daily'} — ${weekAgoStr} to ${new Date().toISOString().split('T')[0]}`
    );
  } catch (error) {
    console.error('Shopify data fetch failed:', error);
    return `Shopify data fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}. Check SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN env vars.`;
  }
}

async function fetchFinancialData(): Promise<string> {
  try {
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

    return financialData;
  } catch (error) {
    console.error('Financial data fetch failed:', error);
    return `Financial data fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}. Check SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN env vars.`;
  }
}
