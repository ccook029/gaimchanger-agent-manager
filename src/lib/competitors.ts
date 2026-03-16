/**
 * Competitive Intelligence — Google News RSS + optional Serper.dev API
 */

import Parser from 'rss-parser';

const OEM_COMPETITORS = [
  'Callaway',
  'TaylorMade',
  'Titleist',
  'Cleveland Srixon',
  'Cobra Golf',
  'PXG',
  'Ping',
];

const DTC_COMPETITORS = [
  'Malbon Golf',
  'Sunday Golf',
  'Ghost Golf',
  'Vessel Golf',
  'Stitch Golf',
  'Jones Sports Co',
];

export const ALL_COMPETITORS = [...OEM_COMPETITORS, ...DTC_COMPETITORS];

interface NewsItem {
  competitor: string;
  title: string;
  link: string;
  pubDate: string;
  source: string;
  snippet: string;
}

/**
 * Fetch Google News RSS for a competitor.
 */
async function fetchGoogleNews(competitor: string): Promise<NewsItem[]> {
  const parser = new Parser();
  const query = encodeURIComponent(`"${competitor}" golf`);
  const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

  try {
    const feed = await parser.parseURL(url);
    return (feed.items || []).slice(0, 5).map((item) => ({
      competitor,
      title: item.title || '',
      link: item.link || '',
      pubDate: item.pubDate || '',
      source: 'Google News',
      snippet: item.contentSnippet || item.content || '',
    }));
  } catch (error) {
    console.warn(`Failed to fetch Google News for ${competitor}:`, error);
    return [];
  }
}

/**
 * Optional: Fetch results from Serper.dev for deeper search.
 */
async function fetchSerper(competitor: string): Promise<NewsItem[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch('https://google.serper.dev/news', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: `"${competitor}" golf`,
        num: 5,
        tbs: 'qdr:w', // past week
      }),
    });

    if (!res.ok) return [];

    const data = await res.json();
    return (data.news || []).slice(0, 5).map((item: { title: string; link: string; date: string; snippet: string }) => ({
      competitor,
      title: item.title,
      link: item.link,
      pubDate: item.date || '',
      source: 'Serper.dev',
      snippet: item.snippet || '',
    }));
  } catch {
    return [];
  }
}

/**
 * Scan all competitors in parallel.
 */
export async function scanAllCompetitors(): Promise<string> {
  const allResults: NewsItem[] = [];

  // Run Google News fetches in parallel (batched to avoid overwhelming)
  const batchSize = 4;
  for (let i = 0; i < ALL_COMPETITORS.length; i += batchSize) {
    const batch = ALL_COMPETITORS.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.flatMap((c) => [fetchGoogleNews(c), fetchSerper(c)])
    );
    allResults.push(...results.flat());
  }

  // Format as markdown
  let markdown = `# Competitive Intelligence Data\n\n`;
  markdown += `**Scan Date:** ${new Date().toISOString().split('T')[0]}\n`;
  markdown += `**Competitors Monitored:** ${ALL_COMPETITORS.length}\n`;
  markdown += `**Articles Found:** ${allResults.length}\n\n`;

  // Group by competitor
  const byCompetitor: Record<string, NewsItem[]> = {};
  for (const item of allResults) {
    if (!byCompetitor[item.competitor]) {
      byCompetitor[item.competitor] = [];
    }
    byCompetitor[item.competitor].push(item);
  }

  // OEM section
  markdown += `## Major OEMs\n\n`;
  for (const comp of OEM_COMPETITORS) {
    const items = byCompetitor[comp] || [];
    markdown += `### ${comp} (${items.length} articles)\n`;
    if (items.length === 0) {
      markdown += `No recent news found.\n\n`;
      continue;
    }
    for (const item of items) {
      markdown += `- **${item.title}** (${item.pubDate})\n`;
      if (item.snippet) markdown += `  ${item.snippet.slice(0, 200)}\n`;
      markdown += `  Source: ${item.source} | ${item.link}\n`;
    }
    markdown += `\n`;
  }

  // DTC section
  markdown += `## DTC / Lifestyle Brands\n\n`;
  for (const comp of DTC_COMPETITORS) {
    const items = byCompetitor[comp] || [];
    markdown += `### ${comp} (${items.length} articles)\n`;
    if (items.length === 0) {
      markdown += `No recent news found.\n\n`;
      continue;
    }
    for (const item of items) {
      markdown += `- **${item.title}** (${item.pubDate})\n`;
      if (item.snippet) markdown += `  ${item.snippet.slice(0, 200)}\n`;
      markdown += `  Source: ${item.source} | ${item.link}\n`;
    }
    markdown += `\n`;
  }

  return markdown;
}
