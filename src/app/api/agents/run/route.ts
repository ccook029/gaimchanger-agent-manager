import { NextRequest, NextResponse } from 'next/server';
import { getAgentConfig, getAllAgentConfigs } from '@/agents';
import { runAgent } from '@/lib/agent-runner';
import { runAllAgents } from '@/lib/orchestrator';

/**
 * POST /api/agents/run — Trigger single or all agents.
 * Body: { agentId?: string, sendEmail?: boolean }
 * If agentId is omitted, runs all agents.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { agentId, sendEmail = false } = body as {
      agentId?: string;
      sendEmail?: boolean;
    };

    if (agentId) {
      // Run single agent
      const config = getAgentConfig(agentId);
      if (!config) {
        return NextResponse.json(
          { error: `Agent '${agentId}' not found` },
          { status: 404 }
        );
      }

      const log = await runAgent(config, { sendEmailReport: sendEmail });
      return NextResponse.json({ success: true, log });
    }

    // Run all agents
    const result = await runAllAgents();
    return NextResponse.json({
      success: true,
      logs: result.logs,
      managerSummary: result.managerSummary,
    });
  } catch (error) {
    console.error('Agent run error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/run — List available agents.
 */
export async function GET() {
  const configs = getAllAgentConfigs();
  return NextResponse.json({
    agents: configs.map((c) => ({
      id: c.id,
      name: c.name,
      title: c.title,
      department: c.department,
      status: c.status,
      schedule: c.schedule,
    })),
  });
}
