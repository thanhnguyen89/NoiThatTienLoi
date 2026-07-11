import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import {
  buildAnalyzePrompt,
  crawlMany,
  fallbackSemantic,
  fetchGoogleContext,
  parseSemanticResponse,
} from '@/lib/viet-bai-thong-minh/server';
import type { VbtStep1State } from '@/lib/viet-bai-thong-minh/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

function buildCompetitorData(items: Array<{ url: string; text: string }>): string {
  return items
    .map((item, index) => `### Competitor ${index + 1}: ${item.url}\n${item.text}`)
    .join('\n\n---\n\n');
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json() as VbtStep1State;

    if (!body.keyword?.trim() || body.keyword.trim().length < 3) {
      return NextResponse.json({ error: 'Keyword không hợp lệ.' }, { status: 400 });
    }

    const competitorItems = await crawlMany(body.competitorUrls || [], 3);
    const competitorData = buildCompetitorData(competitorItems);
    const googleData = body.dataSourceMode === 'google_search'
      ? await fetchGoogleContext(body.keyword, body.language)
      : '';
    const competitorInsights = '';

    try {
      const model = buildTinhGonModel('gemini-flash');
      const prompt = buildAnalyzePrompt(body, competitorData, googleData);
      const result = await model.generateContent(prompt);
      const semantic = parseSemanticResponse(result.response.text(), body, competitorInsights);
      return NextResponse.json(semantic);
    } catch {
      return NextResponse.json(fallbackSemantic(body, competitorInsights));
    }
  } catch (error) {
    const status = error instanceof Error && error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json(
      { error: status === 401 ? 'Chưa được xác thực.' : 'Không thể phân tích.' },
      { status },
    );
  }
}
