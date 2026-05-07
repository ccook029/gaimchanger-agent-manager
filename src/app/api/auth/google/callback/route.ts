import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, saveRefreshToken } from '@/lib/google-oauth';

export const maxDuration = 30;

/**
 * GET /api/auth/google/callback — handles the OAuth redirect from Google,
 * exchanges the code for a refresh token, and stores it in Redis.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    return new NextResponse(
      `<h1>Authorization failed</h1><p>${error}</p>`,
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    );
  }

  if (!code) {
    return new NextResponse(
      '<h1>Missing authorization code</h1>',
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    );
  }

  try {
    const { refreshToken } = await exchangeCodeForTokens(code, url.origin);
    await saveRefreshToken(refreshToken);

    return new NextResponse(
      `<!doctype html>
<html>
<head><title>Google Authorized</title></head>
<body style="font-family: system-ui; max-width: 600px; margin: 4rem auto; padding: 2rem;">
  <h1>✅ Google Analytics authorized</h1>
  <p>Dana Metrics can now pull GA4 data. You can close this tab.</p>
  <p><a href="/dashboard">Back to dashboard</a></p>
</body>
</html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new NextResponse(
      `<h1>Authorization failed</h1><pre>${message}</pre>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}
