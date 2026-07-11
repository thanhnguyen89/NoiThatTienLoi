import OpenAI from 'openai';
import { buildGeminiModel } from '@/app/api/pipeline/_gemini';

export interface TinhGonStreamChunk {
  text: () => string;
}

export interface TinhGonTextModel {
  generateContent: (prompt: string) => Promise<{ response: { text: () => string } }>;
  generateContentStream: (prompt: string) => Promise<AsyncIterable<TinhGonStreamChunk>>;
}

function buildSingleChunkStream(text: string): AsyncIterable<TinhGonStreamChunk> {
  return {
    async *[Symbol.asyncIterator]() {
      if (text) yield { text: () => text };
    },
  };
}

function buildOpenAiCompatibleModel(options: {
  apiKey: string;
  model: string;
  baseUrl?: string;
}): TinhGonTextModel {
  const client = new OpenAI({
    apiKey: options.apiKey,
    baseURL: options.baseUrl,
  });

  return {
    generateContent: async (prompt: string) => {
      const completion = await client.chat.completions.create({
        model: options.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });

      const text = completion.choices[0]?.message?.content ?? '';
      return { response: { text: () => text } };
    },
    generateContentStream: async (prompt: string) => {
      const stream = await client.chat.completions.create({
        model: options.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        stream: true,
      });

      async function* iterator() {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? '';
          if (delta) yield { text: () => delta };
        }
      }

      return iterator();
    },
  };
}

function buildClaudeModel(): TinhGonTextModel {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '';
  const model = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-latest';

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY hoặc CLAUDE_API_KEY chưa được cấu hình.');
  }

  async function callClaude(prompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API lỗi ${response.status}: ${errorText.slice(0, 180)}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload.content)) return '';
    return payload.content
      .filter((block: { type?: string; text?: string }) => block.type === 'text')
      .map((block: { text?: string }) => block.text || '')
      .join('');
  }

  return {
    generateContent: async (prompt: string) => {
      const text = await callClaude(prompt);
      return { response: { text: () => text } };
    },
    generateContentStream: async (prompt: string) => buildSingleChunkStream(await callClaude(prompt)),
  };
}

export function buildTinhGonModel(modelId: string): TinhGonTextModel {
  switch (modelId) {
    case 'gemini-pro':
      return buildGeminiModel('pro');
    case 'gpt-4o':
    case 'gpt-4o-mini': {
      const apiKey = process.env.OPENAI_API_KEY || '';
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY chưa được cấu hình.');
      }

      return buildOpenAiCompatibleModel({
        apiKey,
        model: modelId,
      });
    }
    case 'grok': {
      const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY || '';
      if (!apiKey) {
        throw new Error('GROK_API_KEY hoặc XAI_API_KEY chưa được cấu hình.');
      }

      return buildOpenAiCompatibleModel({
        apiKey,
        model: process.env.GROK_MODEL || 'grok-3-mini',
        baseUrl: 'https://api.x.ai/v1',
      });
    }
    case 'claude':
      return buildClaudeModel();
    case 'gemini-flash':
    default:
      return buildGeminiModel('flash');
  }
}
