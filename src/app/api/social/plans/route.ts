import { NextResponse } from 'next/server';
import { listPlans } from '@/lib/marketing-plans';

export const maxDuration = 30;

/**
 * GET /api/social/plans — list all marketing plans, newest first.
 */
export async function GET() {
  const plans = await listPlans();
  return NextResponse.json({ plans });
}
