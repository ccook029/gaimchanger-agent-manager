import { AgentConfig } from '@/lib/types';

/**
 * Agent Config Template
 *
 * Copy this file and customize for each new agent.
 * Use {{variable}} syntax in userPromptTemplate for dynamic data injection.
 */
export const templateConfig: AgentConfig = {
  id: 'agent-id',
  name: 'Agent Name',
  title: 'Agent Title',
  department: 'Department',
  avatar: { initials: 'XX', color: '#000000' },
  model: 'claude-sonnet-4-20250514',
  maxTokens: 4096,
  temperature: 0.1,
  schedule: 'Description of schedule',
  cronSchedule: '0 12 * * *',
  status: 'standby',
  systemPrompt: `You are [Agent Name], [Title] at Gaimchanger Golf.`,
  userPromptTemplate: `{{data}}`,
  taskTypes: [],
  bio: 'Agent biography here.',
};
