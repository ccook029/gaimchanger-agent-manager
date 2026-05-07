/**
 * Orchestrator — runs all scheduled agents and generates manager summary.
 */

import { AgentRunLog } from './types';
import { runAgent } from './agent-runner';
import { fetchAgentVariables } from './agent-data';
import { generateManagerSummary } from './manager';
import { sendEmail, getDefaultRecipients, buildReportEmail } from './email';
import { getAllAgentConfigs } from '../agents';

/**
 * Run all active agents and send manager summary digest.
 */
export async function runAllAgents(): Promise<{
  logs: AgentRunLog[];
  managerSummary: string;
}> {
  const configs = getAllAgentConfigs();
  const activeConfigs = configs.filter((c) => c.status === 'active');

  // Run all agents in parallel — each gets its own data variables
  const logs = await Promise.all(
    activeConfigs.map(async (config) => {
      const variables = await fetchAgentVariables(config.id);
      return runAgent(config, { variables, sendEmailReport: true });
    })
  );

  // Generate manager summary
  let managerSummary = '';
  try {
    managerSummary = await generateManagerSummary(logs);

    // Send digest email
    const recipients = getDefaultRecipients();
    if (recipients.length > 0) {
      const date = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const hasUrgent = logs.some(
        (l) => l.status === 'success' && l.report.includes('🚨')
      );
      const prefix = hasUrgent ? '[URGENT] ' : '';

      await sendEmail({
        to: recipients,
        subject: `${prefix}Gaimchanger Golf — Daily Agent Digest | ${date}`,
        html: buildReportEmail(
          'Chief of Staff',
          'Executive Summary',
          managerSummary,
          date
        ),
        text: managerSummary,
      });
    }
  } catch (err) {
    console.error('Manager summary generation failed:', err);
  }

  return { logs, managerSummary };
}
