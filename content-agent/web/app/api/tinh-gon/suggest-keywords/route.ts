import { NextRequest, NextResponse } from 'next/server';
import { buildKeywordSuggestionsFallback, normalizeKeywordList } from '@/lib/tinh-gon/keywords';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { extractJsonPayload } from '@/lib/tinh-gon/outline';
import { suggestKeywordsRequestSchema } from '@/lib/tinh-gon/schema';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = suggestKeywordsRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload không hợp lệ', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { keyword, count, model: modelId } = parsed.data;
    let keywords = buildKeywordSuggestionsFallback(keyword, count);

    try {
      const model = buildTinhGonModel(modelId || 'gemini-flash');
      const prompt = `
Bạn là SEO assistant. Hãy gợi ý ${count} từ khóa phụ liên quan sát nghĩa với từ khóa chính "${keyword}".

Yêu cầu:
- Ưu tiên search intent thực tế.
- Không lặp ý.
- Không trả lại đúng từ khóa gốc.
- Trả về JSON:
{
  "keywords": ["...", "..."]
}

Chỉ trả JSON.
`.trim();

      const result = await model.generateContent(prompt);
      const payload = extractJsonPayload(result.response.text());

      if (payload && typeof payload === 'object' && Array.isArray((payload as { keywords?: unknown[] }).keywords)) {
        keywords = normalizeKeywordList(
          (payload as { keywords: unknown[] }).keywords.filter((item): item is string => typeof item === 'string'),
          keyword,
          count,
        );
      }
    } catch {
      // fallback đã có sẵn ở trên
    }

    return NextResponse.json({ keywords });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
