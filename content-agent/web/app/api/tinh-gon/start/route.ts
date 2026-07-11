import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { buildArticleMeta } from '@/lib/shared/article-meta';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildOutlineFallback, buildOutlinePrompt, extractJsonPayload, normalizeOutlinePayload } from '@/lib/tinh-gon/outline';
import { buildTinhGonContentType, buildTinhGonSnapshot, createTinhGonRunId } from '@/lib/tinh-gon/persistence';
import { startRequestSchema } from '@/lib/tinh-gon/schema';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const rawBody = await request.json();
    const parsed = startRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload không hợp lệ', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { config } = parsed.data;
    const runId = createTinhGonRunId(config.keyword);
    const fallback = buildOutlineFallback(config);

    const article = await prisma.article.create({
      data: {
        userId: user.userId,
        runId,
        status: 'DRAFT',
        keyword: config.keyword,
        language: config.language,
        contentType: buildTinhGonContentType(config.outlineType),
        sourceType: config.dataSource ?? 'ai_only',
        targetLength: config.targetLength,
        aiProvider: config.model,
        brandConfig: config.brandConfig,
        meta: buildArticleMeta('viet_tinh_gon', {
          outlineType: config.outlineType,
          dataSource: config.dataSource ?? 'ai_only',
          hasNotes: Boolean(config.notes?.trim()),
          secondaryKeywordCount: config.secondaryKeywords.length,
        }),
        outline: buildTinhGonSnapshot({
          stage: 'config',
          config,
          outline: null,
        }),
        selectedTitle: config.keyword,
        userNotes: config.notes || null,
        secondaryKeywords: config.secondaryKeywords,
        htmlContent: '',
        competitorUrls: [],
      },
    });

    try {
      const model = buildTinhGonModel(config.model);
      const result = await model.generateContent(buildOutlinePrompt(config));
      const payload = extractJsonPayload(result.response.text());
      const outline = normalizeOutlinePayload(payload, config);

      await prisma.article.update({
        where: { id: article.id },
        data: {
          selectedTitle: outline.selectedTitle,
          userNotes: outline.userNotes || config.notes || null,
          secondaryKeywords: config.secondaryKeywords,
          outline: buildTinhGonSnapshot({
            stage: 'outline',
            config,
            outline,
          }),
          meta: buildArticleMeta('viet_tinh_gon', {
            outlineType: config.outlineType,
            dataSource: config.dataSource ?? 'ai_only',
            outlineSource: payload ? 'ai' : 'fallback',
            secondaryKeywordCount: config.secondaryKeywords.length,
          }),
        },
      });

      return NextResponse.json({
        articleId: article.id,
        runId,
        outline,
        source: payload ? 'ai' : 'fallback',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tạo outline bằng AI';

      await prisma.article.update({
        where: { id: article.id },
        data: {
          selectedTitle: fallback.selectedTitle,
          userNotes: fallback.userNotes || config.notes || null,
          outline: buildTinhGonSnapshot({
            stage: 'outline',
            config,
            outline: fallback,
          }),
          meta: buildArticleMeta('viet_tinh_gon', {
            outlineType: config.outlineType,
            dataSource: config.dataSource ?? 'ai_only',
            outlineSource: 'fallback',
            warning: message,
            secondaryKeywordCount: config.secondaryKeywords.length,
          }),
        },
      });

      return NextResponse.json({
        articleId: article.id,
        runId,
        outline: fallback,
        source: 'fallback',
        warning: message,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
