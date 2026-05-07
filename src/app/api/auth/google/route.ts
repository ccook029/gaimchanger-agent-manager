import { NextRequest, NextResponse } from 'next/server';
import { buildAuthUrl } from '@/lib/google-oauth';

export const maxDuration = 30;

/**
 * GET /api/auth/google — kicks off OAuth consent flow for GA4 access.
 */
export async function GET(request: NextRequest) {
  try {
    const origin = new URL(request.url).origin;
    const state = crypto.randomUUID();
    const url = buildAuthUrl(origin, state);
    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
