// ============================================================================
// LLM Client — abstracción multi-proveedor (OpenAI + Anthropic)
// Rutas por tipo de query:
//   EXPLANATION → claude-claude-sonnet-4-6 (razonamiento legal complejo)
//   AGGREGATION → claude-claude-sonnet-4-6 (análisis multi-datos)
//   DIRECT_INTENT, TEMPORAL_FOLLOWUP, EMPLOYEE_FOLLOWUP → gpt-4o-mini (rápido)
// ============================================================================

export const MODEL_ROUTING = {
  EXPLANATION: 'claude-sonnet-4-6',
  AGGREGATION: 'claude-sonnet-4-6',
  DIRECT_INTENT: 'gpt-4o-mini',
  TEMPORAL_FOLLOWUP: 'gpt-4o-mini',
  EMPLOYEE_FOLLOWUP: 'gpt-4o-mini',
} as const;

export type LLMModel = typeof MODEL_ROUTING[keyof typeof MODEL_ROUTING];

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

interface LLMResponse {
  content: string;
  model: string;
}

export class LLMClient {
  private openaiKey: string | null = null;
  private anthropicKey: string | null = null;

  constructor(openaiKey?: string, anthropicKey?: string) {
    this.openaiKey = openaiKey || null;
    this.anthropicKey = anthropicKey || null;
  }

  getModelForQueryType(queryType: string): LLMModel {
    return MODEL_ROUTING[queryType as keyof typeof MODEL_ROUTING] ?? 'gpt-4o-mini';
  }

  async complete(
    model: LLMModel,
    messages: Message[],
    options: LLMOptions = {}
  ): Promise<LLMResponse> {
    if (model.startsWith('claude')) {
      return this.anthropicComplete(model, messages, options);
    }
    return this.openaiComplete(model, messages, options);
  }

  // Returns a ReadableStream for streaming responses (only used in streaming path)
  async stream(
    model: LLMModel,
    messages: Message[],
    options: LLMOptions = {}
  ): Promise<ReadableStream | null> {
    if (model.startsWith('claude')) {
      return this.anthropicStream(model, messages, options);
    }
    return this.openaiStream(model, messages, options);
  }

  private async openaiComplete(
    model: string,
    messages: Message[],
    options: LLMOptions
  ): Promise<LLMResponse> {
    if (!this.openaiKey) throw new Error('OpenAI key not configured');

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options.maxTokens ?? 1000,
        temperature: options.temperature ?? 0.7,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`OpenAI error ${resp.status}: ${err}`);
    }

    const data = await resp.json();
    return {
      content: data.choices[0]?.message?.content ?? '',
      model,
    };
  }

  private async anthropicComplete(
    model: string,
    messages: Message[],
    options: LLMOptions
  ): Promise<LLMResponse> {
    if (!this.anthropicKey) {
      console.warn('[LLMClient] Anthropic key not set, falling back to gpt-4o-mini');
      return this.openaiComplete('gpt-4o-mini', messages, options);
    }

    // Anthropic separates system from conversation messages
    const systemMsg = messages.find(m => m.role === 'system')?.content ?? '';
    const userMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        system: systemMsg,
        messages: userMessages,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.7,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error(`[LLMClient] Anthropic error ${resp.status}: ${err}`);
      // Fallback to OpenAI on Anthropic error
      console.warn('[LLMClient] Falling back to gpt-4o-mini after Anthropic error');
      return this.openaiComplete('gpt-4o-mini', messages, options);
    }

    const data = await resp.json();
    return {
      content: data.content[0]?.text ?? '',
      model,
    };
  }

  private async openaiStream(
    model: string,
    messages: Message[],
    options: LLMOptions
  ): Promise<ReadableStream | null> {
    if (!this.openaiKey) return null;

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options.maxTokens ?? 1000,
        temperature: options.temperature ?? 0.7,
        stream: true,
      }),
    });

    if (!resp.ok || !resp.body) return null;
    return resp.body;
  }

  private async anthropicStream(
    model: string,
    messages: Message[],
    options: LLMOptions
  ): Promise<ReadableStream | null> {
    if (!this.anthropicKey) {
      // Fallback: use openai stream
      return this.openaiStream('gpt-4o-mini', messages, options);
    }

    const systemMsg = messages.find(m => m.role === 'system')?.content ?? '';
    const userMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        system: systemMsg,
        messages: userMessages,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.7,
        stream: true,
      }),
    });

    if (!resp.ok || !resp.body) {
      // Fallback to OpenAI streaming
      return this.openaiStream('gpt-4o-mini', messages, options);
    }

    // Normalize Anthropic SSE to OpenAI SSE format for frontend compatibility
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    return new ReadableStream({
      async start(controller) {
        try {
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              break;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6);
              if (data === '[DONE]') { controller.close(); return; }
              try {
                const parsed = JSON.parse(data);
                // Anthropic uses content_block_delta for text
                if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                  // Normalize to OpenAI format
                  const normalized = {
                    choices: [{ delta: { content: parsed.delta.text } }]
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(normalized)}\n\n`));
                }
              } catch { /* skip malformed */ }
            }
          }
        } catch (err) {
          controller.error(err);
        }
      }
    });
  }
}
