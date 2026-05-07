import { NextRequest, NextResponse } from 'next/server';
import { updatePlanStatus } from '@/lib/marketing-plans';

export const maxDuration = 30;

/**
 * POST /api/social/plans/[id]/reject — mark a plan as rejected.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const plan = await updatePlanStatus(id, 'rejected', {
    rejectedAt: new Date().toISOString(),
  });
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }
  return NextResponse.json({ plan });
}
