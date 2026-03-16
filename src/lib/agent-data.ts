/**
 * Agent-specific data fetchers — provides each agent with the data it needs.
 */

import { scanAllCompetitors } from './competitors';

/**
 * Fetch the required variables for a given agent before running it.
 */
export async function fetchAgentVariables(
  agentId: string
): Promise<Record<string, string>> {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  switch (agentId) {
    case 'competitor-intel': {
      const competitorData = await scanAllCompetitors();
      return { date, competitorData };
    }

    // Agents that need external APIs we may not have configured yet
    // return minimal variables so the agent can still run
    case 'website-analytics':
      return { date, ga4Data: 'GA4 data not yet configured. Provide a general status update based on your knowledge.' };

    case 'shopify-operations':
      return { date, reportType: 'daily alert', shopifyData: 'Shopify data not yet configured.' };

    case 'accounting':
      return { date, reportType: 'weekly P&L', financialData: 'Financial data not yet configured.', cogsData: 'COGS data not yet configured.' };

    case 'social-media':
      return { date, socialData: 'Social media data not yet configured.' };

    default:
      return { date };
  }
}
