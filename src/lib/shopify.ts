/**
 * Shopify Admin API client — handles orders, products, inventory.
 * Includes rate limiting (2 req/sec) and pagination.
 */

import { ShopifyOrder, ShopifyProduct, InventoryAlert } from './types';

const API_VERSION = '2024-01';

function getShopifyConfig() {
  const storeUrl = process.env.SHOPIFY_STORE_URL;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!storeUrl || !accessToken) {
    throw new Error('SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN must be set');
  }
  return { storeUrl, accessToken };
}

function getBaseUrl(): string {
  const { storeUrl } = getShopifyConfig();
  const domain = storeUrl.includes('://') ? new URL(storeUrl).hostname : storeUrl;
  return `https://${domain}/admin/api/${API_VERSION}`;
}

// Rate limiter: max 2 requests/second
let lastRequestTime = 0;
async function rateLimitedFetch(url: string, options: RequestInit): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 500) {
    await new Promise((resolve) => setTimeout(resolve, 500 - elapsed));
  }
  lastRequestTime = Date.now();

  const { accessToken } = getShopifyConfig();
  const res = await fetch(url, {
    ...options,
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '2', 10);
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return rateLimitedFetch(url, options);
  }

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Shopify API error (${res.status}): ${error}`);
  }

  return res;
}

/**
 * Fetch all pages of a Shopify resource.
 */
async function fetchAllPages<T>(endpoint: string, resourceKey: string): Promise<T[]> {
  const baseUrl = getBaseUrl();
  let url = `${baseUrl}${endpoint}`;
  const allItems: T[] = [];

  while (url) {
    const res = await rateLimitedFetch(url, { method: 'GET' });
    const data = await res.json();
    allItems.push(...(data[resourceKey] || []));

    // Parse Link header for pagination
    const linkHeader = res.headers.get('Link') || '';
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    url = nextMatch ? nextMatch[1] : '';
  }

  return allItems;
}

/**
 * Get orders for a date range.
 */
export async function getOrders(
  createdAtMin: string,
  createdAtMax?: string,
  status = 'any'
): Promise<ShopifyOrder[]> {
  let endpoint = `/orders.json?status=${status}&created_at_min=${createdAtMin}&limit=250`;
  if (createdAtMax) {
    endpoint += `&created_at_max=${createdAtMax}`;
  }
  return fetchAllPages<ShopifyOrder>(endpoint, 'orders');
}

/**
 * Get all products with inventory data.
 */
export async function getProducts(): Promise<ShopifyProduct[]> {
  return fetchAllPages<ShopifyProduct>('/products.json?limit=250', 'products');
}

/**
 * Calculate daily sales summary from orders.
 */
export function calculateSalesSummary(orders: ShopifyOrder[]) {
  const totalOrders = orders.length;
  let totalRevenue = 0;
  let totalDiscounts = 0;
  let totalTax = 0;
  let totalUnits = 0;

  const productSales: Record<string, { title: string; units: number; revenue: number }> = {};
  const fulfillmentStatus: Record<string, number> = {
    fulfilled: 0,
    unfulfilled: 0,
    partial: 0,
    pending: 0,
  };

  for (const order of orders) {
    totalRevenue += parseFloat(order.total_price);
    totalDiscounts += parseFloat(order.total_discounts);
    totalTax += parseFloat(order.total_tax);

    const fStatus = order.fulfillment_status || 'unfulfilled';
    fulfillmentStatus[fStatus] = (fulfillmentStatus[fStatus] || 0) + 1;

    for (const item of order.line_items) {
      totalUnits += item.quantity;
      const key = item.product_id.toString();
      if (!productSales[key]) {
        productSales[key] = { title: item.title, units: 0, revenue: 0 };
      }
      productSales[key].units += item.quantity;
      productSales[key].revenue += parseFloat(item.price) * item.quantity;
    }
  }

  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return {
    totalOrders,
    totalRevenue,
    totalDiscounts,
    totalTax,
    totalUnits,
    aov,
    topProducts,
    fulfillmentStatus,
    netSales: totalRevenue - totalDiscounts,
    grossSales: totalRevenue,
    shippingCollected: 0, // Would need shipping_lines data
  };
}

/**
 * Analyze inventory levels and generate alerts.
 */
export function analyzeInventory(
  products: ShopifyProduct[],
  reorderThreshold = 10
): {
  alerts: InventoryAlert[];
  summary: string;
} {
  const alerts: InventoryAlert[] = [];
  let totalSKUs = 0;
  let outOfStock = 0;
  let lowStock = 0;

  for (const product of products) {
    if (product.status !== 'active') continue;

    for (const variant of product.variants) {
      totalSKUs++;
      const qty = variant.inventory_quantity;

      if (qty <= 0) {
        outOfStock++;
        alerts.push({
          level: 'critical',
          emoji: '🔴',
          message: `OUT OF STOCK: ${product.title} - ${variant.title} (SKU: ${variant.sku})`,
          sku: variant.sku,
          productTitle: product.title,
        });
      } else if (qty <= reorderThreshold) {
        lowStock++;
        alerts.push({
          level: 'warning',
          emoji: '🟡',
          message: `LOW STOCK: ${product.title} - ${variant.title} — ${qty} units remaining (SKU: ${variant.sku})`,
          sku: variant.sku,
          productTitle: product.title,
        });
      }
    }
  }

  const summary = `Total SKUs: ${totalSKUs} | Out of Stock: ${outOfStock} | Low Stock: ${lowStock} | Healthy: ${totalSKUs - outOfStock - lowStock}`;

  return { alerts, summary };
}

/**
 * Identify dead stock (90+ days with zero sales).
 */
export function identifyDeadStock(
  products: ShopifyProduct[],
  orders: ShopifyOrder[]
): string[] {
  const soldProductIds = new Set<number>();
  for (const order of orders) {
    for (const item of order.line_items) {
      soldProductIds.add(item.product_id);
    }
  }

  const deadStock: string[] = [];
  for (const product of products) {
    if (product.status === 'active' && !soldProductIds.has(product.id)) {
      const hasInventory = product.variants.some((v) => v.inventory_quantity > 0);
      if (hasInventory) {
        deadStock.push(product.title);
      }
    }
  }

  return deadStock;
}

/**
 * Format Shopify data as markdown for Claude prompt.
 */
export function formatShopifyDataAsMarkdown(
  salesSummary: ReturnType<typeof calculateSalesSummary>,
  inventoryAnalysis: ReturnType<typeof analyzeInventory>,
  deadStock: string[],
  dateRange: string
): string {
  let md = `# Shopify Store Data — ${dateRange}\n\n`;

  md += `## Sales Summary\n`;
  md += `| Metric | Value |\n| --- | --- |\n`;
  md += `| Total Orders | ${salesSummary.totalOrders} |\n`;
  md += `| Gross Revenue | $${salesSummary.grossSales.toFixed(2)} |\n`;
  md += `| Discounts | -$${salesSummary.totalDiscounts.toFixed(2)} |\n`;
  md += `| Net Sales | $${salesSummary.netSales.toFixed(2)} |\n`;
  md += `| Tax Collected | $${salesSummary.totalTax.toFixed(2)} |\n`;
  md += `| Total Units | ${salesSummary.totalUnits} |\n`;
  md += `| AOV | $${salesSummary.aov.toFixed(2)} |\n\n`;

  md += `## Top Products\n`;
  md += `| Product | Units | Revenue |\n| --- | --- | --- |\n`;
  for (const p of salesSummary.topProducts) {
    md += `| ${p.title} | ${p.units} | $${p.revenue.toFixed(2)} |\n`;
  }

  md += `\n## Fulfillment Status\n`;
  md += `| Status | Count |\n| --- | --- |\n`;
  for (const [status, count] of Object.entries(salesSummary.fulfillmentStatus)) {
    if (count > 0) md += `| ${status} | ${count} |\n`;
  }

  md += `\n## Inventory Health\n${inventoryAnalysis.summary}\n\n`;
  if (inventoryAnalysis.alerts.length > 0) {
    md += `### Alerts\n`;
    for (const alert of inventoryAnalysis.alerts) {
      md += `${alert.emoji} ${alert.message}\n`;
    }
  }

  if (deadStock.length > 0) {
    md += `\n## Dead Stock (90+ days, zero sales)\n`;
    for (const item of deadStock) {
      md += `- ℹ️ ${item}\n`;
    }
  }

  return md;
}
