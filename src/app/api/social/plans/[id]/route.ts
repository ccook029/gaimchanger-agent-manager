import { NextRequest, NextResponse } from 'next/server';
import { getPlan } from '@/lib/marketing-plans';

export const maxDuration = 30;

/**
 * GET /api/social/plans/[id] — get one plan by id.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const plan = await getPlan(id);
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }
  return NextResponse.json({ plan });
}
