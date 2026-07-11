import OpenAI from 'openai';
import { buildGeminiModel } from '@/app/api/pipeline/_gemini';
import { prisma } from '@/lib/prisma';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';

const NATIVE_MODEL_IDS = new Set([
  'gemini-flash',
  'gemini-pro',
  'gpt-4o',
  'gpt-4o-mini',
  'grok',
  'claude',
]);

function getEnvApiKey(provider: string): string {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY || '';
    case 'grok':
      return process.env.GROK_API_KEY || process.env.XAI_API_KEY || '';
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '';
    default:
      return process.env.GEMINI_API_KEY || '';
  }
}

function getEnvBaseUrl(provider: string): string {
  switch (provider) {
    case 'grok':
      return 'https://api.x.ai/v1';
    case 'gemini':
      return process.env.GEMINI_BASE_URL || '';
    default:
      return '';
  }
}

async function callOpenAiCompatible(options: {
  apiKey: string;
  baseUrl?: string;
  model: string;
  prompt: string;
}): Promise<string> {
  const client = new OpenAI({
    apiKey: options.apiKey,
    baseURL: options.baseUrl,
  });

  const completion = await client.chat.completions.create({
    model: options.model,
    messages: [{ role: 'user', content: options.prompt }],
    temperature: 0.75,
  });

  return completion.choices[0]?.message?.content ?? '';
}

async function callAnthropic(model: string, apiKey: string, prompt: string): Promise<string> {
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
      temperature: 0.75,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API loi ${response.status}: ${errorText.slice(0, 180)}`);
  }

  const payload = await response.json() as {
    content?: Array<{ type?: string; text?: string }>;
  };

  if (!Array.isArray(payload.content)) return '';
  return payload.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text || '')
    .join('');
}

export async function generateFacebookPostText(modelId: string, prompt: string): Promise<string> {
  const trimmedModelId = modelId.trim();

  if (!trimmedModelId) {
    const model = buildTinhGonModel('gemini-flash');
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }

  const dbModel = await prisma.aIModel.findFirst({
    where: {
      modelId: trimmedModelId,
      isActive: true,
    },
  });

  if (!dbModel) {
    if (NATIVE_MODEL_IDS.has(trimmedModelId)) {
      const model = buildTinhGonModel(trimmedModelId);
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    }

    const result = await buildGeminiModel('flash', trimmedModelId).generateContent(prompt);
    return result.response.text().trim();
  }

  const provider = dbModel.provider.toLowerCase();
  const apiKey = dbModel.apiKey || getEnvApiKey(provider);
  const baseUrl = dbModel.baseUrl || getEnvBaseUrl(provider) || undefined;

  if (provider === 'anthropic') {
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY hoac CLAUDE_API_KEY chua duoc cau hinh.');
    }
    return (await callAnthropic(dbModel.modelId, apiKey, prompt)).trim();
  }

  if (provider === 'gemini' && !baseUrl) {
    const result = await buildGeminiModel('flash', dbModel.modelId).generateContent(prompt);
    return result.response.text().trim();
  }

  if (!apiKey) {
    throw new Error(`API key cho provider "${provider}" chua duoc cau hinh.`);
  }

  return (await callOpenAiCompatible({
    apiKey,
    baseUrl,
    model: dbModel.modelId,
    prompt,
  })).trim();
}
