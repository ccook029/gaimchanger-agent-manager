import { AgentConfig } from '@/lib/types';
import { websiteAnalyticsConfig } from './website-analytics-agent.config';
import { shopifyOperationsConfig } from './shopify-operations-agent.config';
import { accountingConfig } from './accounting-agent.config';
import { socialMediaConfig } from './social-media-agent.config';
import { competitorIntelConfig } from './competitor-intel-agent.config';

const agentConfigs: AgentConfig[] = [
  websiteAnalyticsConfig,
  shopifyOperationsConfig,
  accountingConfig,
  socialMediaConfig,
  competitorIntelConfig,
];

export function getAllAgentConfigs(): AgentConfig[] {
  return agentConfigs;
}

export function getAgentConfig(id: string): AgentConfig | undefined {
  return agentConfigs.find((c) => c.id === id);
}

export {
  websiteAnalyticsConfig,
  shopifyOperationsConfig,
  accountingConfig,
  socialMediaConfig,
  competitorIntelConfig,
};
