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
  pdfBase64?: string;
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

export type PlatformId = 'instagram' | 'facebook' | 'tiktok';
export type PostFormat = 'reel' | 'carousel' | 'static' | 'story' | 'video';

export type PredisItemStatus =
  | 'pending'
  | 'generating'
  | 'ready'
  | 'scheduled'
  | 'published'
  | 'error';

export interface MarketingPlanItem {
  id: string;
  date: string;
  postTime: string;
  platform: PlatformId;
  format: PostFormat;
  theme: string;
  hook: string;
  caption: string;
  visualConcept: string;
  hashtags: string[];
  predisStatus?: PredisItemStatus;
  predisPostId?: string;
  predisError?: string;
  predisPreviewUrl?: string;
}

export type MarketingPlanStatus =
  | 'draft'
  | 'approved'
  | 'rejected'
  | 'in-progress'
  | 'completed';

export interface MarketingPlan {
  id: string;
  agentId: string;
  status: MarketingPlanStatus;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  weekOf: string;
  goals: { metric: string; target: string }[];
  themes: string[];
  items: MarketingPlanItem[];
  rawReport: string;
}

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  timestamp: string;
}

export interface BryceConversation {
  messages: ChatMessage[];
  intelSnapshot: string;
  intelTakenAt: string | null;
  updatedAt: string;
}
