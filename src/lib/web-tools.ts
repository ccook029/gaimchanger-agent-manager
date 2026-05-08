/**
 * Web tools that Bryce can call during chat — fetches a URL and returns
 * cleaned-up text content suitable for an LLM context window.
 */

const FETCH_TIMEOUT_MS = 15000;
const MAX_BODY_BYTES = 250000;
const MAX_TEXT_CHARS = 18000;

/**
 * Fetch a URL and return readable text (HTML stripped).
 */
export async function fetchUrl(url: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return `Error: "${url}" is not a valid URL.`;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return `Error: only http/https URLs are supported.`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; GaimchangerBot/1.0; +https://gaimchanger-agent-manager.vercel.app)',
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      return `Error: ${res.status} ${res.statusText} for ${parsed.toString()}`;
    }

    const contentType = res.headers.get('content-type') || '';
    const reader = res.body?.getReader();
    if (!reader) {
      return `Error: empty body from ${parsed.toString()}`;
    }

    let received = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BODY_BYTES) {
        chunks.push(value.slice(0, MAX_BODY_BYTES - (received - value.byteLength)));
        break;
      }
      chunks.push(value);
    }
    const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    const raw = buf.toString('utf8');

    if (!contentType.includes('text/') && !contentType.includes('json')) {
      return `Error: unsupported content-type "${contentType}" — fetch_url only handles text/HTML.`;
    }

    const text = stripHtml(raw).slice(0, MAX_TEXT_CHARS);
    const truncated = text.length === MAX_TEXT_CHARS;

    return `URL: ${parsed.toString()}\nContent-Type: ${contentType}\n\n${text}${
      truncated ? '\n\n[…content truncated]' : ''
    }`;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      return `Error: fetch timed out after ${FETCH_TIMEOUT_MS}ms`;
    }
    return `Error fetching ${parsed.toString()}: ${
      err instanceof Error ? err.message : 'unknown'
    }`;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Strip HTML tags and collapse whitespace, leaving readable text.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
