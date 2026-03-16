/**
 * Manager Summary Layer — Digests all agent outputs into a single executive summary.
 */

import { callClaude } from './anthropic';
import { AgentRunLog } from './types';

/**
 * Generate a manager summary digest from all agent run outputs.
 */
export async function generateManagerSummary(logs: AgentRunLog[]): Promise<string> {
  const successfulLogs = logs.filter((l) => l.status === 'success');

  if (successfulLogs.length === 0) {
    return 'No successful agent runs to summarize.';
  }

  const agentReports = successfulLogs
    .map(
      (log) =>
        `## ${log.agentName}\n**Status:** ${log.status} | **Duration:** ${log.durationMs}ms\n\n${log.report}`
    )
    .join('\n\n---\n\n');

  const systemPrompt = `You are the Chief of Staff at Gaimchanger Golf Corporate HQ. Your job is to synthesize reports from the AI agent team into a concise executive summary for the founders (Chris Cook and Steve Bennedetti).

Your summary should:
1. Start with an "Executive Pulse" — 3-5 bullet points of the most important findings
2. Highlight any URGENT items (🚨) that need immediate attention
3. Summarize each department's key findings in 2-3 sentences
4. End with "Recommended Actions" — specific next steps the founders should take
5. Keep the total summary under 500 words
6. Use golf metaphors where appropriate (e.g., "staying on the fairway", "below par performance")`;

  const userPrompt = `Here are today's reports from the Gaimchanger Golf AI agent team. Synthesize these into an executive summary:\n\n${agentReports}`;

  const response = await callClaude({
    systemPrompt,
    userPrompt,
    model: 'claude-sonnet-4-20250514',
    maxTokens: 2048,
    temperature: 0.2,
  });

  return response.content;
}
