import { NextRequest, NextResponse } from 'next/server';
import type { GenerateContentResult } from '@google/generative-ai';
import { buildGeminiModel } from '../_gemini';
import { extractSentenceTargets } from '@/lib/humanness/engine';
import type { AICheckApiResult, SentenceInsight, SentenceTargetLike } from '@/lib/humanness/types';

interface FlagContext {
  sentenceIndex: number;
  label: string;
  reason: string;
  severity: 'critical' | 'warning' | 'info';
  matchedTerms: string[];
}

function coerceSentences(input: unknown): SentenceTargetLike[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const objectSentences = input
    .map((item, index) => {
      if (typeof item === 'string') {
        const text = item.trim();
        return text.length >= 20 ? { index, text } : null;
      }

      if (!item || typeof item !== 'object') {
        return null;
      }

      const sentence = item as Partial<SentenceTargetLike>;
      if (typeof sentence.text !== 'string' || sentence.text.trim().length < 20) {
        return null;
      }

      return {
        index: typeof sentence.index === 'number' && Number.isFinite(sentence.index) ? sentence.index : index,
        text: sentence.text.trim(),
      };
    })
    .filter((sentence): sentence is SentenceTargetLike => sentence !== null);

  return objectSentences;
}

function coerceFlagContexts(input: unknown): FlagContext[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const context = item as Partial<FlagContext>;
      if (typeof context.sentenceIndex !== 'number' || !Number.isFinite(context.sentenceIndex)) {
        return null;
      }

      if (typeof context.label !== 'string' || typeof context.reason !== 'string') {
        return null;
      }

      return {
        sentenceIndex: context.sentenceIndex,
        label: context.label,
        reason: context.reason,
        severity: context.severity === 'critical' || context.severity === 'warning' || context.severity === 'info'
          ? context.severity
          : 'warning',
        matchedTerms: Array.isArray(context.matchedTerms)
          ? context.matchedTerms.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          : [],
      };
    })
    .filter((context): context is FlagContext => context !== null);
}

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if ((message.includes('429') || message.includes('quota')) && attempt < maxRetries) {
        const retryMatch = message.match(/retry[^\d]*(\d+)/i);
        const waitMs = retryMatch ? parseInt(retryMatch[1], 10) * 1000 + 2000 : 30000;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      throw error;
    }
  }

  throw new Error('Hết retry khi gọi AI Check.');
}

function buildPrompt(sentences: SentenceTargetLike[], flagContexts: FlagContext[]): string {
  const sentenceSection = sentences
    .slice(0, 24)
    .map((sentence) => `[${sentence.index}] ${sentence.text}`)
    .join('\n');

  const flagMap = new Map<number, FlagContext[]>();
  for (const context of flagContexts) {
    const list = flagMap.get(context.sentenceIndex) || [];
    list.push(context);
    flagMap.set(context.sentenceIndex, list);
  }

  const localSignalSection = Array.from(flagMap.entries())
    .slice(0, 16)
    .map(([sentenceIndex, items]) => {
      const detail = items
        .map((item) => {
          const matched = item.matchedTerms.length ? ` | terms: ${item.matchedTerms.join(', ')}` : '';
          return `- ${item.severity.toUpperCase()} | ${item.label}: ${item.reason}${matched}`;
        })
        .join('\n');
      return `Sentence ${sentenceIndex}\n${detail}`;
    })
    .join('\n\n');

  return `Bạn đang là AI editor kiểm tra humanness cho bài viết tiếng Việt.

Mục tiêu:
1. Chấm điểm tone consistency của toàn bài theo thang 0-100.
2. Với từng câu dưới đây, xác định risk SAFE/WARNING/DANGER.
3. Nếu câu bị WARNING/DANGER, viết lại 1 câu tự nhiên hơn.

Nguyên tắc bắt buộc:
- Giữ nguyên ý chính và số liệu gốc nếu có.
- Giữ giọng chân thật, chuyên nghiệp, gần gũi.
- Không thêm từ/cụm máy móc kiểu AI hoặc marketing quá tay.
- Suggestion phải ngắn, áp dụng trực tiếp được trong editor.

Danh sách câu:
${sentenceSection}

Local signals từ scanner:
${localSignalSection || 'Không có local signal đáng chú ý.'}

Trả về JSON object đúng schema sau:
{
  "toneConsistencyScore": number,
  "toneSummary": string,
  "sentenceInsights": [
    {
      "index": number,
      "risk": "SAFE" | "WARNING" | "DANGER",
      "reasons": ["string"],
      "suggestion": "string"
    }
  ]
}

Luôn trả đủ tất cả câu đã nhận trong sentenceInsights. Chỉ trả JSON object, không giải thích thêm.`;
}

function normalizeParsedInsight(
  raw: unknown,
  fallback: SentenceTargetLike,
): SentenceInsight {
  if (!raw || typeof raw !== 'object') {
    return {
      index: fallback.index,
      risk: 'SAFE',
      reasons: [],
      suggestion: '',
    };
  }

  const insight = raw as Partial<SentenceInsight>;
  return {
    index: typeof insight.index === 'number' && Number.isFinite(insight.index) ? insight.index : fallback.index,
    risk: insight.risk === 'DANGER' || insight.risk === 'WARNING' || insight.risk === 'SAFE' ? insight.risk : 'SAFE',
    reasons: Array.isArray(insight.reasons)
      ? insight.reasons.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [],
    suggestion: typeof insight.suggestion === 'string' ? insight.suggestion.trim() : '',
  };
}

function buildFallbackResult(sentences: SentenceTargetLike[], flagContexts: FlagContext[]): AICheckApiResult {
  const contextMap = new Map<number, FlagContext[]>();
  for (const context of flagContexts) {
    const list = contextMap.get(context.sentenceIndex) || [];
    list.push(context);
    contextMap.set(context.sentenceIndex, list);
  }

  const sentenceInsights = sentences.map((sentence) => {
    const contexts = contextMap.get(sentence.index) || [];
    if (contexts.length === 0) {
      return {
        index: sentence.index,
        risk: 'SAFE',
        reasons: [],
        suggestion: '',
      } satisfies SentenceInsight;
    }

    const hasCritical = contexts.some((context) => context.severity === 'critical');
    return {
      index: sentence.index,
      risk: hasCritical ? 'DANGER' : 'WARNING',
      reasons: contexts.map((context) => context.label),
      suggestion: '',
    } satisfies SentenceInsight;
  });

  const criticalSignals = flagContexts.filter((context) => context.severity === 'critical').length;
  const toneConsistencyScore = Math.max(55, 84 - criticalSignals * 6 - Math.min(flagContexts.length, 5) * 3);

  return {
    toneConsistencyScore,
    toneSummary: criticalSignals > 0
      ? 'Tone bị gãy ở một vài câu dễ lộ AI, nên chỉnh lại những câu đã bị đánh dấu.'
      : 'Tone tương đối ổn nhưng vẫn nên rà lại các câu đang bị cảnh báo.',
    sentenceInsights,
  };
}

async function analyzeWithGemini(
  sentences: SentenceTargetLike[],
  flagContexts: FlagContext[],
  modelId?: string,
): Promise<AICheckApiResult> {
  const model = buildGeminiModel('flash', modelId || undefined);
  const prompt = buildPrompt(sentences, flagContexts);
  const response = await callWithRetry(() => model.generateContent(prompt)) as GenerateContentResult;
  const text = response.response.text();
  const objectMatch = text.match(/\{[\s\S]*\}/);

  if (!objectMatch) {
    throw new Error('AI Check không trả JSON hợp lệ.');
  }

  const parsed = JSON.parse(objectMatch[0]) as Partial<AICheckApiResult>;
  const sentenceInsights = sentences.map((sentence, index) =>
    normalizeParsedInsight(parsed.sentenceInsights?.[index], sentence),
  );

  return {
    toneConsistencyScore: typeof parsed.toneConsistencyScore === 'number' && Number.isFinite(parsed.toneConsistencyScore)
      ? Math.max(0, Math.min(100, Math.round(parsed.toneConsistencyScore)))
      : 82,
    toneSummary: typeof parsed.toneSummary === 'string' && parsed.toneSummary.trim().length > 0
      ? parsed.toneSummary.trim()
      : 'Tone nhìn chung ổn, nhưng vẫn nên ưu tiên sửa các câu đang bị gắn cờ.',
    sentenceInsights,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      html?: string;
      model?: string;
      sentences?: unknown;
      localFlags?: unknown;
    };

    if (!body.html?.trim()) {
      return NextResponse.json({ success: false, error: 'Thiếu nội dung bài viết.' }, { status: 400 });
    }

    const sentences = coerceSentences(body.sentences);
    const sentenceTargets = sentences.length > 0 ? sentences : extractSentenceTargets(body.html);
    const flagContexts = coerceFlagContexts(body.localFlags);

    if (sentenceTargets.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          toneConsistencyScore: 82,
          toneSummary: 'Chưa đủ dữ liệu để chấm tone.',
          sentenceInsights: [],
        } satisfies AICheckApiResult,
      });
    }

    const fallback = buildFallbackResult(sentenceTargets, flagContexts);

    try {
      const aiResult = await analyzeWithGemini(sentenceTargets, flagContexts, body.model);
      return NextResponse.json({ success: true, data: aiResult });
    } catch (error) {
      console.error('[ai-check] Gemini fallback:', error);
      return NextResponse.json({ success: true, data: fallback });
    }
  } catch (error) {
    console.error('[ai-check] Error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
