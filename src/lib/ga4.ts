/**
 * GA4 Data Pipeline — Pulls analytics from Google Analytics 4 via service account.
 */

const GA4_METRICS = [
  'sessions',
  'totalUsers',
  'newUsers',
  'engagementRate',
  'averageSessionDuration',
  'screenPageViews',
  'conversions',
  'purchaseRevenue',
];

const GA4_DIMENSIONS = [
  'sessionSource',
  'sessionMedium',
  'pagePath',
  'deviceCategory',
  'country',
  'region',
];

interface GA4ReportRow {
  dimensions: Record<string, string>;
  metrics: Record<string, number>;
}

interface GA4DataResult {
  currentPeriod: GA4ReportRow[];
  previousPeriod: GA4ReportRow[];
  dateRange: { start: string; end: string };
  comparisonRange: { start: string; end: string };
}

/**
 * Get Google access token from service account credentials.
 */
async function getAccessToken(): Promise<string> {
  const credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!credsJson) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON not set');
  }

  const creds = JSON.parse(Buffer.from(credsJson, 'base64').toString());

  // Build JWT for Google OAuth2
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: creds.client_email,
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  ).toString('base64url');

  // Sign with crypto
  const crypto = await import('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(creds.private_key, 'base64url');

  const jwt = `${header}.${payload}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

/**
 * Run a GA4 report for a given date range and dimension.
 */
async function runGA4Report(
  accessToken: string,
  propertyId: string,
  startDate: string,
  endDate: string,
  dimension: string
): Promise<GA4ReportRow[]> {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const body = {
    dateRanges: [{ startDate, endDate }],
    metrics: GA4_METRICS.map((m) => ({ name: m })),
    dimensions: [{ name: dimension }],
    limit: 25,
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`GA4 API error (${res.status}): ${error}`);
  }

  const data = await res.json();
  const rows: GA4ReportRow[] = [];

  if (data.rows) {
    for (const row of data.rows) {
      const dims: Record<string, string> = {};
      row.dimensionValues?.forEach((dv: { value: string }, i: number) => {
        dims[dimension] = dv.value;
      });

      const mets: Record<string, number> = {};
      row.metricValues?.forEach((mv: { value: string }, i: number) => {
        mets[GA4_METRICS[i]] = parseFloat(mv.value);
      });

      rows.push({ dimensions: dims, metrics: mets });
    }
  }

  return rows;
}

/**
 * Determine date ranges based on day of week.
 * Monday: Saturday + Sunday vs prior weekend
 * Tue-Fri: Yesterday vs same day last week
 */
function getDateRanges(): {
  current: { start: string; end: string };
  previous: { start: string; end: string };
  isMonday: boolean;
} {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  if (dayOfWeek === 1) {
    // Monday: cover Sat+Sun
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - 1);
    const saturday = new Date(now);
    saturday.setDate(now.getDate() - 2);
    const prevSunday = new Date(now);
    prevSunday.setDate(now.getDate() - 8);
    const prevSaturday = new Date(now);
    prevSaturday.setDate(now.getDate() - 9);
    return {
      current: { start: fmt(saturday), end: fmt(sunday) },
      previous: { start: fmt(prevSaturday), end: fmt(prevSunday) },
      isMonday: true,
    };
  }

  // Tue-Fri: Yesterday vs same day last week
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const lastWeek = new Date(now);
  lastWeek.setDate(now.getDate() - 8);

  return {
    current: { start: fmt(yesterday), end: fmt(yesterday) },
    previous: { start: fmt(lastWeek), end: fmt(lastWeek) },
    isMonday: false,
  };
}

/**
 * Pull full GA4 analytics data — runs all dimensions in parallel.
 */
export async function pullGA4Data(): Promise<{
  markdown: string;
  dateRanges: ReturnType<typeof getDateRanges>;
}> {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) {
    throw new Error('GA4_PROPERTY_ID not set');
  }

  const accessToken = await getAccessToken();
  const ranges = getDateRanges();

  // Run all dimensions in parallel for both date ranges
  const [currentResults, previousResults] = await Promise.all([
    Promise.all(
      GA4_DIMENSIONS.map((dim) =>
        runGA4Report(accessToken, propertyId, ranges.current.start, ranges.current.end, dim)
      )
    ),
    Promise.all(
      GA4_DIMENSIONS.map((dim) =>
        runGA4Report(accessToken, propertyId, ranges.previous.start, ranges.previous.end, dim)
      )
    ),
  ]);

  // Build markdown tables
  let markdown = `# GA4 Analytics Data\n\n`;
  markdown += `**Current Period:** ${ranges.current.start} to ${ranges.current.end}\n`;
  markdown += `**Comparison Period:** ${ranges.previous.start} to ${ranges.previous.end}\n`;
  markdown += ranges.isMonday
    ? `**Report Type:** Weekend Summary (Saturday + Sunday)\n\n`
    : `**Report Type:** Daily (Yesterday vs Same Day Last Week)\n\n`;

  GA4_DIMENSIONS.forEach((dim, i) => {
    markdown += `## ${dim}\n\n`;
    markdown += `### Current Period\n`;
    markdown += formatRowsAsTable(currentResults[i], dim);
    markdown += `\n### Previous Period\n`;
    markdown += formatRowsAsTable(previousResults[i], dim);
    markdown += `\n\n`;
  });

  return { markdown, dateRanges: ranges };
}

function formatRowsAsTable(rows: GA4ReportRow[], dimension: string): string {
  if (rows.length === 0) return 'No data\n';

  const headers = [dimension, ...GA4_METRICS];
  let table = `| ${headers.join(' | ')} |\n`;
  table += `| ${headers.map(() => '---').join(' | ')} |\n`;

  for (const row of rows) {
    const values = [
      row.dimensions[dimension] || '-',
      ...GA4_METRICS.map((m) => formatMetric(m, row.metrics[m])),
    ];
    table += `| ${values.join(' | ')} |\n`;
  }

  return table;
}

function formatMetric(name: string, value: number): string {
  if (name === 'purchaseRevenue') return `$${value.toFixed(2)}`;
  if (name === 'engagementRate') return `${(value * 100).toFixed(1)}%`;
  if (name === 'averageSessionDuration') return `${value.toFixed(1)}s`;
  return Math.round(value).toLocaleString();
}
