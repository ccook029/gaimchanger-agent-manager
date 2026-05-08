import { NextRequest, NextResponse } from 'next/server';
import { getPlan } from '@/lib/marketing-plans';
import { generatePlanPDF } from '@/lib/plan-pdf';

export const maxDuration = 60;

/**
 * GET /api/social/plans/[id]/pdf — download a Gaimchanger-branded PDF
 * of the marketing plan for review/approval.
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

  try {
    const pdf = await generatePlanPDF(plan);
    const filename = `gaimchanger-marketing-plan-${plan.weekOf}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'PDF generation failed' },
      { status: 500 }
    );
  }
}
