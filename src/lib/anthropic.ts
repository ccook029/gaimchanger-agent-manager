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
