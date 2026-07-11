import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildOutlineFallback, buildOutlinePrompt, extractJsonPayload, normalizeOutlinePayload } from '@/lib/tinh-gon/outline';
import { buildTinhGonContentType, buildTinhGonSnapshot } from '@/lib/tinh-gon/persistence';
import { outlineRequestSchema } from '@/lib/tinh-gon/schema';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const rawBody = await request.json();
    const parsed = outlineRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload không hợp lệ', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { config, articleId } = parsed.data;
    const fallback = buildOutlineFallback(config);

    try {
      const model = buildTinhGonModel(config.model);
      const result = await model.generateContent(buildOutlinePrompt(config));
      const payload = extractJsonPayload(result.response.text());
      const outline = normalizeOutlinePayload(payload, config);

      if (articleId) {
        const article = await prisma.article.findFirst({
          where: {
            id: articleId,
            userId: user.userId,
            deletedAt: null,
          },
        });

        if (!article) {
          return NextResponse.json({ error: 'Article not found' }, { status: 404 });
        }

        await prisma.article.update({
          where: { id: articleId },
          data: {
            keyword: config.keyword,
            language: config.language,
            contentType: buildTinhGonContentType(config.outlineType),
            targetLength: config.targetLength,
            aiProvider: config.model,
            brandConfig: config.brandConfig,
            selectedTitle: outline.selectedTitle,
            userNotes: outline.userNotes || config.notes || null,
            secondaryKeywords: config.secondaryKeywords,
            outline: buildTinhGonSnapshot({
              stage: 'outline',
              config,
              outline,
            }),
            status: 'DRAFT',
          },
        });
      }

      return NextResponse.json({
        outline,
        source: payload ? 'ai' : 'fallback',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tạo outline bằng AI';

      if (articleId) {
        await prisma.article.update({
          where: { id: articleId },
          data: {
            keyword: config.keyword,
            language: config.language,
            contentType: buildTinhGonContentType(config.outlineType),
            targetLength: config.targetLength,
            aiProvider: config.model,
            brandConfig: config.brandConfig,
            selectedTitle: fallback.selectedTitle,
            userNotes: fallback.userNotes || config.notes || null,
            secondaryKeywords: config.secondaryKeywords,
            outline: buildTinhGonSnapshot({
              stage: 'outline',
              config,
              outline: fallback,
            }),
            status: 'DRAFT',
          },
        });
      }

      return NextResponse.json({
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
