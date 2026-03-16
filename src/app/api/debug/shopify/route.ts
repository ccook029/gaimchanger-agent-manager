import { NextResponse } from 'next/server';

export const maxDuration = 30;

/**
 * GET /api/debug/shopify — Test Shopify API connection and diagnose issues.
 * Returns detailed info about env vars, token exchange, and API access.
 */
export async function GET() {
  const results: Record<string, unknown> = {};

  // Step 1: Check env vars
  const storeUrl = process.env.SHOPIFY_STORE_URL;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  results.envVars = {
    SHOPIFY_STORE_URL: storeUrl ? `${storeUrl.substring(0, 20)}...` : 'NOT SET',
    SHOPIFY_ACCESS_TOKEN: accessToken ? `${accessToken.substring(0, 10)}...` : 'NOT SET',
    SHOPIFY_CLIENT_ID: clientId ? `${clientId.substring(0, 10)}...` : 'NOT SET',
    SHOPIFY_CLIENT_SECRET: clientSecret ? `${clientSecret.substring(0, 10)}...` : 'NOT SET',
  };

  if (!storeUrl) {
    results.error = 'SHOPIFY_STORE_URL is not set';
    return NextResponse.json(results, { status: 400 });
  }

  const domain = storeUrl.includes('://') ? new URL(storeUrl).hostname : storeUrl;
  results.domain = domain;

  // Step 2: Try client credentials flow if available
  if (clientId && clientSecret) {
    try {
      const tokenRes = await fetch(`https://${domain}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${encodeURIComponent(clientSecret)}`,
      });

      const tokenBody = await tokenRes.text();
      results.tokenExchange = {
        status: tokenRes.status,
        statusText: tokenRes.statusText,
        body: tokenRes.ok ? JSON.parse(tokenBody) : tokenBody,
      };

      if (tokenRes.ok) {
        const tokenData = JSON.parse(tokenBody);
        const token = tokenData.access_token;

        // Step 3: Try fetching products with the token
        const apiRes = await fetch(`https://${domain}/admin/api/2024-01/products.json?limit=1`, {
          headers: {
            'X-Shopify-Access-Token': token,
            'Content-Type': 'application/json',
          },
        });

        const apiBody = await apiRes.text();
        results.apiTest = {
          status: apiRes.status,
          statusText: apiRes.statusText,
          body: apiRes.ok ? `Success - ${JSON.parse(apiBody).products?.length || 0} products returned` : apiBody,
        };
      }
    } catch (error) {
      results.tokenExchangeError = error instanceof Error ? error.message : String(error);
    }
  }

  // Step 3b: Try static token if available
  if (accessToken) {
    try {
      const apiRes = await fetch(`https://${domain}/admin/api/2024-01/products.json?limit=1`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });

      const apiBody = await apiRes.text();
      results.staticTokenTest = {
        status: apiRes.status,
        statusText: apiRes.statusText,
        body: apiRes.ok ? `Success - ${JSON.parse(apiBody).products?.length || 0} products returned` : apiBody.substring(0, 500),
      };
    } catch (error) {
      results.staticTokenError = error instanceof Error ? error.message : String(error);
    }
  }

  return NextResponse.json(results, { status: 200 });
}
