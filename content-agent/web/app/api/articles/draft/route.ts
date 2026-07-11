import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { createTinhGonRunId } from '@/lib/tinh-gon/persistence';

export const runtime = 'nodejs';

const schema = z.object({
  articleId: z.string().optional(),
  draft: z.object({
    feature: z.string().min(1).max(80),
    keyword: z.string().default(''),
    language: z.string().default('Vietnamese'),
    contentType: z.string().min(1).max(80),
    targetLength: z.number().int().min(0).max(100000).default(0),
    aiProvider: z.string().default('gemini-flash'),
    brandConfig: z.unknown().optional(),
    selectedTitle: z.string().default(''),
    userNotes: z.string().nullable().optional(),
    secondaryKeywords: z.array(z.string()).default([]),
    competitorUrls: z.array(z.string()).default([]),
    outline: z.unknown().optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const rawBody = await request.json();
    const parsed = schema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ', issues: parsed.error.flatten() }, { status: 400 });
    }

    const { articleId, draft } = parsed.data;

    let existing = null;
    if (articleId) {
      existing = await prisma.article.findFirst({
        where: {
          id: articleId,
          userId: user.userId,
          deletedAt: null,
          status: 'DRAFT',
        },
      });
    }

    const keyword = draft.keyword.trim() || draft.selectedTitle.trim() || `${draft.feature} draft`;

    if (existing) {
      const updated = await prisma.article.update({
        where: { id: existing.id },
        data: {
          keyword,
          language: draft.language,
          contentType: draft.contentType,
          targetLength: draft.targetLength,
          aiProvider: draft.aiProvider,
          brandConfig: (draft.brandConfig ?? existing.brandConfig ?? {}) as never,
          selectedTitle: draft.selectedTitle.trim() || keyword,
          userNotes: draft.userNotes ?? null,
          secondaryKeywords: draft.secondaryKeywords,
          competitorUrls: draft.competitorUrls,
          outline: (draft.outline ?? existing.outline) as never,
          status: 'DRAFT',
        },
      });

      return NextResponse.json({
        articleId: updated.id,
        runId: updated.runId,
      });
    }

    const runId = createTinhGonRunId(keyword);
    const created = await prisma.article.create({
      data: {
        userId: user.userId,
        runId,
        status: 'DRAFT',
        keyword,
        language: draft.language,
        contentType: draft.contentType,
        targetLength: draft.targetLength,
        aiProvider: draft.aiProvider,
        brandConfig: (draft.brandConfig ?? {}) as never,
        selectedTitle: draft.selectedTitle.trim() || keyword,
        userNotes: draft.userNotes ?? null,
        secondaryKeywords: draft.secondaryKeywords,
        competitorUrls: draft.competitorUrls,
        outline: (draft.outline ?? { flow: draft.feature, stage: 'config' }) as never,
        htmlContent: '',
      },
    });

    return NextResponse.json({
      articleId: created.id,
      runId: created.runId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
