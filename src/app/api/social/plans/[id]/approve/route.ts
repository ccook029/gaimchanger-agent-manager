import { NextRequest, NextResponse } from 'next/server';
import {
  getPlan,
  savePlan,
  updatePlanStatus,
} from '@/lib/marketing-plans';
import { createPostFromBrief } from '@/lib/predis';
import { MarketingPlanItem } from '@/lib/types';

export const maxDuration = 60;

/**
 * POST /api/social/plans/[id]/approve — approve a plan and ship every
 * item to Predis for content generation. Each item's predisPostId and
 * status are recorded so the dashboard can poll for progress.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await getPlan(id);
  if (!existing) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  if (existing.status !== 'draft') {
    return NextResponse.json(
      { error: `Cannot approve plan with status "${existing.status}"` },
      { status: 400 }
    );
  }

  // Move to in-progress before kicking off Predis (so the UI reflects state
  // even if Predis calls take a while or partially fail).
  await updatePlanStatus(id, 'in-progress', {
    approvedAt: new Date().toISOString(),
  });

  const updatedItems: MarketingPlanItem[] = [];
  for (const item of existing.items) {
    try {
      const result = await createPostFromBrief(item);
      updatedItems.push({
        ...item,
        predisStatus: 'generating',
        predisPostId: result.postId,
        predisError: undefined,
      });
    } catch (err) {
      updatedItems.push({
        ...item,
        predisStatus: 'error',
        predisError: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const finalPlan = {
    ...existing,
    status: 'in-progress' as const,
    approvedAt: new Date().toISOString(),
    items: updatedItems,
  };
  await savePlan(finalPlan);

  return NextResponse.json({ plan: finalPlan });
}
