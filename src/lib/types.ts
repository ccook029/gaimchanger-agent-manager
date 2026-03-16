export interface AgentConfig {
  id: string;
  name: string;
  title: string;
  department: string;
  avatar: { initials: string; color: string };
  model: string;
  maxTokens: number;
  temperature: number;
  schedule: string;
  cronSchedule: string;
  status: 'active' | 'standby';
  systemPrompt: string;
  userPromptTemplate: string;
  taskTypes?: string[];
  bio: string;
}

export interface AgentRunLog {
  id: string;
  agentId: string;
  agentName: string;
  status: 'success' | 'error';
  model: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  report: string;
  error?: string;
  emailError?: string;
}

export interface GA4Metric {
  name: string;
  value: number;
  previousValue?: number;
  changePercent?: number;
}

export interface ShopifyOrder {
  id: number;
  name: string;
  created_at: string;
  total_price: string;
  subtotal_price: string;
  total_discounts: string;
  total_tax: string;
  financial_status: string;
  fulfillment_status: string | null;
  line_items: ShopifyLineItem[];
}

export interface ShopifyLineItem {
  id: number;
  title: string;
  quantity: number;
  price: string;
  sku: string;
  product_id: number;
  variant_id: number;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  status: string;
  variants: ShopifyVariant[];
  created_at: string;
  updated_at: string;
}

export interface ShopifyVariant {
  id: number;
  title: string;
  sku: string;
  price: string;
  inventory_quantity: number;
  inventory_item_id: number;
}

export interface InventoryAlert {
  level: 'critical' | 'warning' | 'info';
  emoji: string;
  message: string;
  sku?: string;
  productTitle?: string;
}

export interface CompetitorIntel {
  competitor: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  headline: string;
  summary: string;
  source: string;
  date: string;
}

export interface SocialMetrics {
  account: string;
  platform: string;
  posts: number;
  engagementRate: number;
  followers?: number;
  topContent?: string;
}
