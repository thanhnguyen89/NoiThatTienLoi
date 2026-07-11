/**
 * _gemini.ts — Gemini via OpenAI-compatible proxy
 *
 * Dùng OpenAI SDK với baseURL trỏ tới proxy.
 * Load model configuration từ database.
 */

import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

// Cache model config để tránh query DB liên tục
let cachedModel: {
  modelId: string;
  apiKey: string;
  baseUrl: string;
  timestamp: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 phút

async function getModelConfig() {
  // Check cache
  if (cachedModel && Date.now() - cachedModel.timestamp < CACHE_TTL) {
    console.log('[getModelConfig] Using cached model:', cachedModel.modelId);
    return cachedModel;
  }

  // Load from database
  try {
    const defaultModel = await prisma.aIModel.findFirst({
      where: {
        isDefault: true,
        isActive: true,
      },
    });

    if (defaultModel) {
      console.log('[getModelConfig] Loaded from DB:', {
        modelId: defaultModel.modelId,
        provider: defaultModel.provider,
        hasApiKey: !!defaultModel.apiKey,
        hasBaseUrl: !!defaultModel.baseUrl,
      });
      
      cachedModel = {
        modelId: defaultModel.modelId,
        apiKey: defaultModel.apiKey || process.env.GEMINI_API_KEY || '',
        baseUrl: defaultModel.baseUrl || process.env.GEMINI_BASE_URL || '',
        timestamp: Date.now(),
      };
      return cachedModel;
    }
  } catch (err) {
    console.error('[getModelConfig] Database error:', err);
  }

  // Fallback to env variables
  console.log('[getModelConfig] Fallback to env variables');
  return {
    modelId: process.env.GEMINI_MODEL || 'DevGOVietnam-Frontier',
    apiKey: process.env.GEMINI_API_KEY || '',
    baseUrl: process.env.GEMINI_BASE_URL || '',
    timestamp: Date.now(),
  };
}

async function getClient(): Promise<OpenAI> {
  const config = await getModelConfig();

  if (!config.apiKey) {
    throw new Error('GEMINI_API_KEY chưa được cấu hình (database hoặc .env.local)');
  }
  if (!config.baseUrl) {
    throw new Error('GEMINI_BASE_URL chưa được cấu hình (database hoặc .env.local)');
  }

  return new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl });
}

async function getModelName(modelOverride?: string): Promise<string> {
  if (modelOverride) return modelOverride;
  
  const config = await getModelConfig();
  return config.modelId;
}

// ─── Interface giữ nguyên để không phải sửa call sites ────────────────────────

export interface GeminiModel {
  generateContent: (prompt: string) => Promise<{ response: { text: () => string } }>;
  generateContentStream: (prompt: string) => Promise<AsyncIterable<{ text: () => string }>>;
}

export function buildGeminiModel(_variant: 'flash' | 'pro' = 'flash', modelOverride?: string): GeminiModel {
  return {
    // Non-streaming call
    generateContent: async (prompt: string) => {
      try {
        const client = await getClient();
        const modelName = await getModelName(modelOverride);

        console.log('[buildGeminiModel] Calling API with model:', modelName);

        const completion = await client.chat.completions.create({
          model: modelName,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        });
        
        const text = completion.choices[0]?.message?.content ?? '';
        return { response: { text: () => text } };
      } catch (error) {
        // Nếu 403 → xóa cache để lần sau load lại từ DB
        if ((error as { status?: number })?.status === 403) {
          console.warn('[buildGeminiModel] 403 detected — clearing model cache');
          cachedModel = null;
        }
        console.error('[buildGeminiModel] Error:', error);
        throw error;
      }
    },

    // Streaming call (dùng cho generate-outline SSE)
    generateContentStream: async (prompt: string) => {
      try {
        const client = await getClient();
        const modelName = await getModelName(modelOverride);

        console.log('[buildGeminiModel] Streaming with model:', modelName);

        const stream = await client.chat.completions.create({
          model: modelName,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          stream: true,
        });

        async function* gen() {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content ?? '';
            if (delta) yield { text: () => delta };
          }
        }

        return gen();
      } catch (error) {
        console.error('[buildGeminiModel] Streaming error:', error);
        throw error;
      }
    },
  };
}

