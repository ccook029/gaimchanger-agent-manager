import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export interface ClaudeRequest {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ClaudeResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

/**
 * Replace {{variable}} placeholders in a template with provided values.
 */
export function substituteTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

/**
 * Call Claude API with system + user prompts.
 */
export async function callClaude(request: ClaudeRequest): Promise<ClaudeResponse> {
  const model = request.model || 'claude-sonnet-4-20250514';
  const maxTokens = request.maxTokens || 4096;
  const temperature = request.temperature ?? 0.1;

  const response = await getClient().messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system: request.systemPrompt,
    messages: [
      {
        role: 'user',
        content: request.userPrompt,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === 'text');
  const content = textContent ? textContent.text : '';

  return {
    content,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    model,
  };
}

export interface ClaudeMessagesRequest {
  systemPrompt: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  enableWebTools?: boolean;
}

/**
 * Call Claude with a multi-turn message history (for chat). When
 * enableWebTools is true, declares web_search (Anthropic server-side) and
 * fetch_url (custom) and runs a tool-use loop until Claude returns a final
 * text reply.
 */
export async function callClaudeMessages(
  request: ClaudeMessagesRequest
): Promise<ClaudeResponse> {
  const model = request.model || 'claude-sonnet-4-20250514';
  const maxTokens = request.maxTokens || 4096;
  const temperature = request.temperature ?? 0.6;

  if (!request.enableWebTools) {
    const response = await getClient().messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: request.systemPrompt,
      messages: request.messages,
    });
    const textContent = response.content.find((c) => c.type === 'text');
    return {
      content: textContent && textContent.type === 'text' ? textContent.text : '',
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model,
    };
  }

  // Tool-use path
  const { fetchUrl } = await import('./web-tools');

  // Server-side web_search and a custom fetch_url
  const tools = [
    {
      type: 'web_search_20250305',
      name: 'web_search',
      max_uses: 5,
    },
    {
      name: 'fetch_url',
      description:
        'Fetch the content of a specific URL and return its text. Use this when the user asks you to look at a particular site, or when you need to read the Gaimchanger Golf brand website (gaimchangergolf.com).',
      input_schema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The full URL to fetch, including https://',
          },
        },
        required: ['url'],
      },
    },
  ];

  type Msg = { role: 'user' | 'assistant'; content: unknown };
  const messages: Msg[] = request.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let totalInput = 0;
  let totalOutput = 0;
  const MAX_LOOPS = 6;

  for (let i = 0; i < MAX_LOOPS; i++) {
    const response = await getClient().messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: request.systemPrompt,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: tools as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: messages as any,
    });

    totalInput += response.usage.input_tokens;
    totalOutput += response.usage.output_tokens;

    if (response.stop_reason !== 'tool_use') {
      const textBlock = response.content.find((c) => c.type === 'text');
      return {
        content: textBlock && textBlock.type === 'text' ? textBlock.text : '',
        inputTokens: totalInput,
        outputTokens: totalOutput,
        model,
      };
    }

    // Echo the assistant turn back so the next call has full context
    messages.push({ role: 'assistant', content: response.content });

    // Execute custom tool_use blocks; Anthropic resolves server tools internally
    const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      if (block.name === 'fetch_url') {
        const url = (block.input as { url: string }).url;
        const result = await fetchUrl(url);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        });
      }
    }

    if (toolResults.length === 0) {
      const textBlock = response.content.find((c) => c.type === 'text');
      return {
        content: textBlock && textBlock.type === 'text' ? textBlock.text : '',
        inputTokens: totalInput,
        outputTokens: totalOutput,
        model,
      };
    }

    messages.push({ role: 'user', content: toolResults });
  }

  return {
    content:
      "I tried to look something up but exceeded my tool-use budget. Try a more specific question.",
    inputTokens: totalInput,
    outputTokens: totalOutput,
    model,
  };
}
