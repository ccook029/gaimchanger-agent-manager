import { NextRequest, NextResponse } from 'next/server';
import { getPlan, savePlan } from '@/lib/marketing-plans';
import { getPostStatus, schedulePost, buildPublishAt } from '@/lib/predis';
import { MarketingPlanItem } from '@/lib/types';

export const maxDuration = 60;

/**
 * POST /api/social/plans/[id]/sync — poll Predis for each item's current
 * state, persist, and schedule any items that are now ready. Idempotent.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const plan = await getPlan(id);
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  const updated: MarketingPlanItem[] = [];
  for (const item of plan.items) {
    if (!item.predisPostId) {
      updated.push(item);
      continue;
    }

    if (item.predisStatus === 'published' || item.predisStatus === 'scheduled') {
      updated.push(item);
      continue;
    }

    try {
      const status = await getPostStatus(item.predisPostId);

      // If the post is ready and we haven't scheduled yet, schedule it.
      if (status.status === 'ready' && item.platform !== 'tiktok') {
        try {
          const publishAt = buildPublishAt(item);
          await schedulePost(item.predisPostId, publishAt, item.platform as 'instagram' | 'facebook');
          updated.push({
            ...item,
            predisStatus: 'scheduled',
            predisPreviewUrl: status.previewUrl,
          });
          continue;
        } catch (schedErr) {
          updated.push({
            ...item,
            predisStatus: 'error',
            predisError: `Schedule failed: ${schedErr instanceof Error ? schedErr.message : String(schedErr)}`,
            predisPreviewUrl: status.previewUrl,
          });
          continue;
        }
      }

      updated.push({
        ...item,
        predisStatus: status.status === 'unknown' ? item.predisStatus : status.status,
        predisPreviewUrl: status.previewUrl ?? item.predisPreviewUrl,
        predisError: status.error,
      });
    } catch (err) {
      updated.push({
        ...item,
        predisStatus: 'error',
        predisError: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // If every item is published or scheduled, mark the whole plan completed.
  const allDone = updated.every(
    (it) => it.predisStatus === 'published' || it.predisStatus === 'scheduled'
  );

  const finalPlan = {
    ...plan,
    items: updated,
    status: allDone && plan.status === 'in-progress' ? ('completed' as const) : plan.status,
  };
  await savePlan(finalPlan);

  return NextResponse.json({ plan: finalPlan });
}
