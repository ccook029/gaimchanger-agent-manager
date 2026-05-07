/**
 * Google OAuth2 helpers — authorization-code flow with persisted refresh token.
 * Used as an alternative to service-account auth for personal Gmail accounts
 * where service accounts can't be added to GA4 properties.
 */

import { Redis } from '@upstash/redis';

const REFRESH_TOKEN_KEY = 'google_oauth_refresh_token';

const SCOPES = ['https://www.googleapis.com/auth/analytics.readonly'];

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null;
  }
  if (!_redis) {
    _redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
  return _redis;
}

export function getOAuthRedirectUri(origin: string): string {
  return `${origin}/api/auth/google/callback`;
}

export function buildAuthUrl(origin: string, state: string): string {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_OAUTH_CLIENT_ID not set');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getOAuthRedirectUri(origin),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  origin: string
): Promise<{ refreshToken: string; accessToken: string }> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET not set');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getOAuthRedirectUri(origin),
      grant_type: 'authorization_code',
    }).toString(),
  });

  const data = await res.json();
  if (!res.ok || !data.refresh_token) {
    throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);
  }

  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
  };
}

export async function saveRefreshToken(refreshToken: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    throw new Error('Redis not configured — cannot persist refresh token');
  }
  await redis.set(REFRESH_TOKEN_KEY, refreshToken);
}

export async function loadRefreshToken(): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  return redis.get<string>(REFRESH_TOKEN_KEY);
}

export async function getAccessTokenFromRefresh(): Promise<string> {
  const refreshToken = await loadRefreshToken();
  if (!refreshToken) {
    throw new Error(
      'No Google OAuth refresh token stored. Visit /api/auth/google to authorize.'
    );
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET not set');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Refresh token exchange failed: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}
