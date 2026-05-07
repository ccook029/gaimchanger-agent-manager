/**
 * Content Marketing data — pulls Shopify products and competitor trends
 * to fuel the content marketing agent.
 */

import { getProducts, getOrders, calculateSalesSummary } from './shopify';

const MARKETING_ANGLES = ['A', 'B', 'C'] as const;
type Angle = (typeof MARKETING_ANGLES)[number];

const ANGLE_LABELS: Record<Angle, string> = {
  A: 'Lifestyle & Aspiration',
  B: 'Product & Feature Focus',
  C: 'Education & Tips',
};

export function generateBatchId(): string {
  const d = new Date();
  const dateStr = d.toISOString().split('T')[0].replace(/-/g, '');
  return `batch_${dateStr}`;
}

export function getAnglePair(): { angles: string; focusAngles: Angle[] } {
  const day = new Date().getDay();
  const pairs: Angle[][] = [
    ['A', 'B'],
    ['B', 'C'],
    ['A', 'C'],
  ];
  const pair = pairs[day % pairs.length];
  return {
    angles: pair.map((a) => `${a} (${ANGLE_LABELS[a]})`).join(' and '),
    focusAngles: pair,
  };
}

export function getSeasonalNotes(): string {
  const month = new Date().getMonth();
  const notes: Record<number, string> = {
    0: "New Year's resolutions, fresh start on the course. Winter golf in warm states.",
    1: "Valentine's Day gift guide for golfers. Presidents' Day sales.",
    2: 'Spring golf season starting. Masters hype building. Daylight saving time = more evening rounds.',
    3: "Masters week! Peak golf content. Tax refund spending. Spring gear refresh.",
    4: "Mother's Day/Father's Day gift angles. Peak golf season. Memorial Day weekend golf.",
    5: "Father's Day is THE golf gift holiday. US Open. Summer golf trips.",
    6: 'The Open Championship. Peak summer golf. 4th of July golf.',
    7: 'Back-to-school but golf season still strong. End-of-summer deals.',
    8: 'Fall golf season. Labor Day. Ryder Cup / Presidents Cup years.',
    9: 'Fall foliage golf content. Halloween fun golf content.',
    10: 'Black Friday / Cyber Monday prep. Holiday gift guides. End of season deals.',
    11: 'Holiday gift guides. Christmas for golfers. Year-end content.',
  };
  return notes[month] || 'Standard content cycle.';
}

export function buildTrackingLink(
  path: string,
  platform: string,
  angle: string,
  batchId: string
): string {
  const params = new URLSearchParams({
    utm_source: platform,
    utm_medium: 'organic',
    utm_campaign: batchId,
    utm_content: `angle_${angle.toLowerCase()}`,
  });
  return `https://gaimchangergolf.com${path}?${params.toString()}`;
}

export async function fetchContentMarketingData(): Promise<{
  productData: string;
  topSellers: string;
  competitorTrends: string;
  batchId: string;
  angles: string;
  seasonalNotes: string;
}> {
  const batchId = generateBatchId();
  const { angles } = getAnglePair();
  const seasonalNotes = getSeasonalNotes();

  let productData = 'Product data not available. Use general golf accessories messaging.';
  let topSellers = 'Top seller data not available. Focus on brand-level messaging.';

  try {
    const [products, orders] = await Promise.all([
      getProducts(),
      getOrders(
        new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0] +
          'T00:00:00-05:00'
      ),
    ]);

    if (products.length > 0) {
      productData = '| Product | Price | In Stock |\n| --- | --- | --- |\n';
      for (const p of products.filter((p) => p.status === 'active')) {
        const variant = p.variants[0];
        if (variant) {
          productData += `| ${p.title} | $${variant.price} | ${variant.inventory_quantity > 0 ? 'Yes' : 'Low/OOS'} |\n`;
        }
      }
    }

    if (orders.length > 0) {
      const summary = calculateSalesSummary(orders);
      if (summary.topProducts.length > 0) {
        topSellers =
          '| Product | Units Sold (30d) | Revenue |\n| --- | --- | --- |\n';
        for (const p of summary.topProducts.slice(0, 10)) {
          topSellers += `| ${p.title} | ${p.units} | $${p.revenue.toFixed(2)} |\n`;
        }
      }
    }
  } catch (err) {
    console.error('Content marketing data fetch failed:', err);
  }

  const competitorTrends = await fetchCompetitorContentTrends();

  return {
    productData,
    topSellers,
    competitorTrends,
    batchId,
    angles,
    seasonalNotes,
  };
}

async function fetchCompetitorContentTrends(): Promise<string> {
  const competitors = [
    'Malbon Golf',
    'Sunday Golf',
    'Ghost Golf',
    'Vessel Golf',
    'Callaway',
    'TaylorMade',
  ];

  let trends = '## Competitor Social Content Trends\n\n';

  try {
    const Parser = (await import('rss-parser')).default;
    const parser = new Parser();

    const results = await Promise.all(
      competitors.slice(0, 4).map(async (comp) => {
        try {
          const query = encodeURIComponent(
            `"${comp}" social media marketing golf 2026`
          );
          const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
          const feed = await parser.parseURL(url);
          const items = (feed.items || []).slice(0, 3);
          return { comp, items };
        } catch {
          return { comp, items: [] };
        }
      })
    );

    for (const { comp, items } of results) {
      if (items.length > 0) {
        trends += `**${comp}:**\n`;
        for (const item of items) {
          trends += `- ${item.title}\n`;
        }
        trends += '\n';
      }
    }

    if (results.every((r) => r.items.length === 0)) {
      trends +=
        'No recent competitor social content news. Focus on original content strategy.\n';
    }
  } catch {
    trends +=
      'Competitor trend data unavailable. Focus on original content strategy.\n';
  }

  return trends;
}
