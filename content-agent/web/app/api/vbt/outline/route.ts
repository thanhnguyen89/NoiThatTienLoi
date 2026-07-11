import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import {
  buildOutlinePrompt,
  parseOutlineResponse,
} from '@/lib/viet-bai-thong-minh/server';
import type { ContentType, SemanticAnalysis } from '@/lib/viet-bai-thong-minh/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface OutlineRequest {
  keyword: string;
  secondaryKeywords?: string[];
  contentType: ContentType;
  objective: string;
  size: string;
  language: string;
  semantic?: SemanticAnalysis | null;
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json() as OutlineRequest;
    if (!body.keyword?.trim()) {
      return NextResponse.json({ error: 'Keyword không hợp lệ.' }, { status: 400 });
    }

    try {
      const model = buildTinhGonModel('gemini-flash');
      const prompt = buildOutlinePrompt({
        keyword: body.keyword,
        secondaryKeywords: body.secondaryKeywords || [],
        contentType: body.contentType,
        objective: body.objective,
        size: body.size,
        language: body.language,
        semantic: body.semantic || null,
      });
      const result = await model.generateContent(prompt);
      return NextResponse.json({ outline: parseOutlineResponse(result.response.text(), body.keyword) });
    } catch {
      return NextResponse.json({ outline: parseOutlineResponse('', body.keyword) });
    }
  } catch (error) {
    const status = error instanceof Error && error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json(
      { error: status === 401 ? 'Chưa được xác thực.' : 'Không thể sinh outline.' },
      { status },
    );
  }
}
