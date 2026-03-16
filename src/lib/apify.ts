/**
 * Apify API client — Instagram & TikTok scraping.
 */

const OWN_ACCOUNTS = {
  instagram: 'gaimchangergolf',
  tiktok: '@gaimchangergolf',
};

const COMPETITOR_ACCOUNTS = {
  instagram: [
    'callawaygolf',
    'tabornesgolf', // TaylorMade
    'titleist',
    'pxg',
    'malbongolf',
    'sundaygolf',
    'ghostgolf',
    'vesselgolf',
  ],
  tiktok: [
    '@callawaygolf',
    '@taylormadegolf',
    '@titleist',
    '@pxg',
    '@malbongolf',
    '@sundaygolf',
  ],
};

interface SocialPost {
  account: string;
  platform: string;
  type: string;
  likes: number;
  comments: number;
  shares?: number;
  views?: number;
  caption: string;
  date: string;
  url: string;
}

interface AccountMetrics {
  account: string;
  platform: string;
  postCount: number;
  avgLikes: number;
  avgComments: number;
  engagementRate: number;
  topPost: SocialPost | null;
  contentMix: Record<string, number>;
}

/**
 * Run an Apify actor and wait for results.
 */
async function runApifyActor(actorId: string, input: Record<string, unknown>): Promise<unknown[]> {
  const apiKey = process.env.APIFY_API_KEY;
  if (!apiKey) {
    throw new Error('APIFY_API_KEY not set');
  }

  // Start the actor run
  const startRes = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  );

  if (!startRes.ok) {
    throw new Error(`Apify start error: ${await startRes.text()}`);
  }

  const runData = await startRes.json();
  const runId = runData.data?.id;
  if (!runId) throw new Error('No run ID returned from Apify');

  // Poll for completion (max 5 minutes)
  const maxWait = 300000;
  const pollInterval = 10000;
  let elapsed = 0;

  while (elapsed < maxWait) {
    await new Promise((r) => setTimeout(r, pollInterval));
    elapsed += pollInterval;

    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
    );
    const statusData = await statusRes.json();
    const status = statusData.data?.status;

    if (status === 'SUCCEEDED') {
      // Fetch dataset
      const datasetId = statusData.data?.defaultDatasetId;
      const dataRes = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}`
      );
      return dataRes.json();
    }

    if (status === 'FAILED' || status === 'ABORTED') {
      throw new Error(`Apify run ${status}: ${runId}`);
    }
  }

  throw new Error('Apify run timed out');
}

/**
 * Scrape Instagram profiles.
 */
async function scrapeInstagram(usernames: string[]): Promise<SocialPost[]> {
  try {
    const items = await runApifyActor('apify~instagram-post-scraper', {
      usernames,
      resultsLimit: 12,
    });

    return (items as Array<Record<string, unknown>>).map((item) => ({
      account: (item.ownerUsername as string) || '',
      platform: 'instagram',
      type: (item.type as string) || 'post',
      likes: (item.likesCount as number) || 0,
      comments: (item.commentsCount as number) || 0,
      caption: ((item.caption as string) || '').slice(0, 200),
      date: (item.timestamp as string) || '',
      url: (item.url as string) || '',
    }));
  } catch (error) {
    console.error('Instagram scrape error:', error);
    return [];
  }
}

/**
 * Scrape TikTok profiles.
 */
async function scrapeTikTok(profiles: string[]): Promise<SocialPost[]> {
  try {
    const items = await runApifyActor('clockworks~tiktok-scraper', {
      profiles,
      resultsPerPage: 12,
    });

    return (items as Array<Record<string, unknown>>).map((item) => ({
      account: (item.authorMeta as Record<string, string>)?.name || '',
      platform: 'tiktok',
      type: 'video',
      likes: (item.diggCount as number) || 0,
      comments: (item.commentCount as number) || 0,
      shares: (item.shareCount as number) || 0,
      views: (item.playCount as number) || 0,
      caption: ((item.text as string) || '').slice(0, 200),
      date: (item.createTimeISO as string) || '',
      url: (item.webVideoUrl as string) || '',
    }));
  } catch (error) {
    console.error('TikTok scrape error:', error);
    return [];
  }
}

/**
 * Calculate metrics for an account.
 */
function calcAccountMetrics(posts: SocialPost[], account: string, platform: string): AccountMetrics {
  const accountPosts = posts.filter((p) => p.account === account);
  const postCount = accountPosts.length;

  if (postCount === 0) {
    return {
      account,
      platform,
      postCount: 0,
      avgLikes: 0,
      avgComments: 0,
      engagementRate: 0,
      topPost: null,
      contentMix: {},
    };
  }

  const totalLikes = accountPosts.reduce((s, p) => s + p.likes, 0);
  const totalComments = accountPosts.reduce((s, p) => s + p.comments, 0);

  const contentMix: Record<string, number> = {};
  for (const p of accountPosts) {
    contentMix[p.type] = (contentMix[p.type] || 0) + 1;
  }

  const topPost = accountPosts.reduce((best, p) =>
    p.likes + p.comments > (best.likes + best.comments) ? p : best
  );

  return {
    account,
    platform,
    postCount,
    avgLikes: Math.round(totalLikes / postCount),
    avgComments: Math.round(totalComments / postCount),
    engagementRate: postCount > 0 ? ((totalLikes + totalComments) / postCount) : 0,
    topPost,
    contentMix,
  };
}

/**
 * Run full social media scan and return markdown for Claude.
 */
export async function scanSocialMedia(): Promise<string> {
  const allIGAccounts = [OWN_ACCOUNTS.instagram, ...COMPETITOR_ACCOUNTS.instagram];
  const allTTAccounts = [OWN_ACCOUNTS.tiktok, ...COMPETITOR_ACCOUNTS.tiktok];

  // Run Instagram and TikTok scrapes in parallel
  const [igPosts, ttPosts] = await Promise.all([
    scrapeInstagram(allIGAccounts),
    scrapeTikTok(allTTAccounts),
  ]);

  // Calculate metrics
  const igMetrics = allIGAccounts.map((a) => calcAccountMetrics(igPosts, a, 'instagram'));
  const ttMetrics = allTTAccounts.map((a) => calcAccountMetrics(ttPosts, a.replace('@', ''), 'tiktok'));

  // Build markdown
  let md = `# Social Media Intelligence Data\n\n`;
  md += `**Scan Date:** ${new Date().toISOString().split('T')[0]}\n`;
  md += `**Gaimchanger Accounts:** @${OWN_ACCOUNTS.instagram} (IG), ${OWN_ACCOUNTS.tiktok} (TT)\n\n`;

  md += `## Instagram Performance\n\n`;
  md += `| Account | Posts | Avg Likes | Avg Comments | Engagement |\n`;
  md += `| --- | --- | --- | --- | --- |\n`;
  for (const m of igMetrics) {
    const isOwn = m.account === OWN_ACCOUNTS.instagram ? ' ⭐' : '';
    md += `| @${m.account}${isOwn} | ${m.postCount} | ${m.avgLikes} | ${m.avgComments} | ${m.engagementRate.toFixed(0)} |\n`;
  }

  md += `\n## TikTok Performance\n\n`;
  md += `| Account | Posts | Avg Likes | Avg Comments | Engagement |\n`;
  md += `| --- | --- | --- | --- | --- |\n`;
  for (const m of ttMetrics) {
    md += `| @${m.account} | ${m.postCount} | ${m.avgLikes} | ${m.avgComments} | ${m.engagementRate.toFixed(0)} |\n`;
  }

  // Top content section
  md += `\n## Top Performing Content (All Accounts)\n\n`;
  const allPosts = [...igPosts, ...ttPosts]
    .sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))
    .slice(0, 10);

  for (const post of allPosts) {
    md += `### @${post.account} (${post.platform})\n`;
    md += `- Type: ${post.type} | Likes: ${post.likes} | Comments: ${post.comments}`;
    if (post.views) md += ` | Views: ${post.views}`;
    md += `\n- Caption: ${post.caption}\n`;
    md += `- ${post.url}\n\n`;
  }

  return md;
}
