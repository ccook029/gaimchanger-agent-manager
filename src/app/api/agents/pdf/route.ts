import { NextRequest, NextResponse } from 'next/server';
import { getLogs } from '@/lib/store';

/**
 * GET /api/agents/pdf?logId=xxx — Download PDF report for a specific run.
 */
export async function GET(request: NextRequest) {
  const logId = request.nextUrl.searchParams.get('logId');
  if (!logId) {
    return NextResponse.json({ error: 'logId parameter required' }, { status: 400 });
  }

  const logs = await getLogs();
  const log = logs.find((l) => l.id === logId);

  if (!log) {
    return NextResponse.json({ error: 'Log not found' }, { status: 404 });
  }

  if (!log.pdfBase64) {
    return NextResponse.json({ error: 'No PDF available for this run' }, { status: 404 });
  }

  const pdfBuffer = Buffer.from(log.pdfBase64, 'base64');
  const date = new Date(log.startedAt).toISOString().split('T')[0];
  const filename = `${log.agentId}-report-${date}.pdf`;

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
