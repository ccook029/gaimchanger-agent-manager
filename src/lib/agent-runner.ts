/**
 * Single Agent Executor — runs one agent and logs the result.
 */

import { v4 as uuidv4 } from 'uuid';
import { AgentConfig, AgentRunLog } from './types';
import { callClaude, substituteTemplate } from './anthropic';
import { addLog } from './store';
import { sendEmail, getDefaultRecipients, buildReportEmail } from './email';
import { generateReportPDF } from './pdf';

export interface RunOptions {
  variables?: Record<string, string>;
  sendEmailReport?: boolean;
}

/**
 * Execute a single agent run.
 */
export async function runAgent(
  config: AgentConfig,
  options: RunOptions = {}
): Promise<AgentRunLog> {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  try {
    // Substitute variables into user prompt template
    const userPrompt = substituteTemplate(
      config.userPromptTemplate,
      options.variables || {}
    );

    // Call Claude
    const response = await callClaude({
      systemPrompt: config.systemPrompt,
      userPrompt,
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
    });

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startMs;

    const log: AgentRunLog = {
      id: uuidv4(),
      agentId: config.id,
      agentName: config.name,
      status: 'success',
      model: response.model,
      startedAt,
      completedAt,
      durationMs,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      report: response.content,
    };

    // Store log
    await addLog(log);

    // Send email if requested
    if (options.sendEmailReport) {
      await sendAgentEmail(config, response.content);
    }

    return log;
  } catch (error) {
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startMs;
    const errorMessage = error instanceof Error ? error.message : String(error);

    const log: AgentRunLog = {
      id: uuidv4(),
      agentId: config.id,
      agentName: config.name,
      status: 'error',
      model: config.model,
      startedAt,
      completedAt,
      durationMs,
      inputTokens: 0,
      outputTokens: 0,
      report: '',
      error: errorMessage,
    };

    await addLog(log);
    return log;
  }
}

/**
 * Send agent report via email with PDF attachment.
 */
async function sendAgentEmail(config: AgentConfig, report: string): Promise<void> {
  const recipients = getDefaultRecipients();
  if (recipients.length === 0) return;

  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Check for urgent flag
  const isUrgent = report.includes('🚨');
  const subjectPrefix = isUrgent ? '[URGENT] ' : '';
  const subject = `${subjectPrefix}${config.name} — ${config.title} Report | ${date}`;

  // Generate PDF
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generateReportPDF(
      config.name,
      config.title,
      config.department,
      report
    );
  } catch (err) {
    console.error('PDF generation failed, sending email without attachment:', err);
  }

  const html = buildReportEmail(config.name, config.title, report, date);

  await sendEmail({
    to: recipients,
    subject,
    html,
    text: report,
    attachments: pdfBuffer
      ? [
          {
            filename: `${config.id}-report-${new Date().toISOString().split('T')[0]}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ]
      : undefined,
  });
}
