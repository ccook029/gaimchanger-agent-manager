/**
 * Predis.ai API client — content generation and scheduling.
 *
 * NOTE: Predis publishes auth as an API key sent in the `Authorization` header,
 * with form-encoded bodies. Endpoints below match their public Brand & Content
 * API as of late 2025. If your account's docs show different paths or fields,
 * tweak PREDIS_BASE / endpoint paths / param names here — the rest of the app
 * only depends on the exported functions, not the wire format.
 */

import { MarketingPlanItem } from './types';

const PREDIS_BASE =
  process.env.PREDIS_API_BASE || 'https://brain.predis.ai/predis_api/v1';

function getApiKey(): string {
  const key = process.env.PREDIS_API_KEY;
  if (!key) throw new Error('PREDIS_API_KEY not set');
  return key;
}

function getBrandId(): string {
  const id = process.env.PREDIS_BRAND_ID;
  if (!id) throw new Error('PREDIS_BRAND_ID not set');
  return id;
}

interface CreatePostResult {
  postId: string;
  status: string;
  raw: unknown;
}

/**
 * Submit a brief to Predis to generate a draft post (image + caption).
 * Returns the Predis post ID; the actual asset is generated async — poll
 * with getPostStatus.
 */
export async function createPostFromBrief(
  item: MarketingPlanItem
): Promise<CreatePostResult> {
  const brief = buildBrief(item);

  const body = new URLSearchParams({
    brand_id: getBrandId(),
    text: brief,
    media_type: mapFormatToMediaType(item.format),
    post_type: 'generic',
  });

  const res = await fetch(`${PREDIS_BASE}/create_post/`, {
    method: 'POST',
    headers: {
      Authorization: getApiKey(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Predis create_post failed (${res.status}): ${JSON.stringify(data)}`);
  }

  const postId = data.post_id || data.id || data.data?.post_id;
  if (!postId) {
    throw new Error(`Predis create_post returned no post id: ${JSON.stringify(data)}`);
  }

  return {
    postId,
    status: data.status || 'generating',
    raw: data,
  };
}

interface PostStatus {
  status: 'generating' | 'ready' | 'scheduled' | 'published' | 'error' | 'unknown';
  previewUrl?: string;
  error?: string;
  raw: unknown;
}

/**
 * Poll Predis for the current state of a generated post.
 */
export async function getPostStatus(postId: string): Promise<PostStatus> {
  const params = new URLSearchParams({
    brand_id: getBrandId(),
    post_id: postId,
  });

  const res = await fetch(`${PREDIS_BASE}/get_posts/?${params.toString()}`, {
    method: 'GET',
    headers: { Authorization: getApiKey() },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Predis get_posts failed (${res.status}): ${JSON.stringify(data)}`);
  }

  const post = Array.isArray(data.posts) ? data.posts[0] : data.post || data;
  const rawStatus = (post?.status || '').toLowerCase();

  let status: PostStatus['status'] = 'unknown';
  if (rawStatus.includes('progress') || rawStatus.includes('generat')) status = 'generating';
  else if (rawStatus.includes('ready') || rawStatus.includes('completed')) status = 'ready';
  else if (rawStatus.includes('scheduled')) status = 'scheduled';
  else if (rawStatus.includes('publish')) status = 'published';
  else if (rawStatus.includes('error') || rawStatus.includes('fail')) status = 'error';

  return {
    status,
    previewUrl: post?.preview_url || post?.thumbnail_url,
    error: post?.error_message,
    raw: data,
  };
}

/**
 * Schedule a Predis-generated post to publish at a specific time on a platform.
 * Time format: ISO 8601.
 */
export async function schedulePost(
  postId: string,
  publishAt: string,
  platform: 'instagram' | 'facebook'
): Promise<void> {
  const body = new URLSearchParams({
    brand_id: getBrandId(),
    post_id: postId,
    platform,
    schedule_time: publishAt,
  });

  const res = await fetch(`${PREDIS_BASE}/schedule_post/`, {
    method: 'POST',
    headers: {
      Authorization: getApiKey(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const data = await res.text();
    throw new Error(`Predis schedule_post failed (${res.status}): ${data}`);
  }
}

function mapFormatToMediaType(format: MarketingPlanItem['format']): string {
  switch (format) {
    case 'video':
    case 'reel':
      return 'video';
    case 'carousel':
      return 'carousel';
    case 'story':
    case 'static':
    default:
      return 'single_image';
  }
}

function buildBrief(item: MarketingPlanItem): string {
  const parts = [
    `Theme: ${item.theme}`,
    `Format: ${item.format}`,
    `Hook: ${item.hook}`,
    `Caption: ${item.caption}`,
    `Visual concept: ${item.visualConcept}`,
  ];
  if (item.hashtags.length) {
    parts.push(`Hashtags: ${item.hashtags.join(' ')}`);
  }
  return parts.join('\n');
}

function combineDateAndTime(date: string, time: string): string {
  const datePart = date.includes('T') ? date.split('T')[0] : date;
  const cleaned = time.trim();
  const m = cleaned.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
  if (!m) return `${datePart}T12:00:00-05:00`;
  let hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  const meridiem = m[3]?.toUpperCase();
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return `${datePart}T${hh}:${mm}:00-05:00`;
}

export function buildPublishAt(item: MarketingPlanItem): string {
  return combineDateAndTime(item.date, item.postTime);
}
