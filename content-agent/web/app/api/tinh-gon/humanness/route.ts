import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildForbiddenList } from '@/lib/tinh-gon/forbidden';
import { analyzeHumanness } from '@/lib/tinh-gon/humanness';
import { humannessRequestSchema } from '@/lib/tinh-gon/schema';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = humannessRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload không hợp lệ', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { html, forbiddenExtra, mode } = parsed.data;

    // Load từ cấm từ DB — fallback về hardcode nếu DB rỗng
    const dbForbiddenConfig = await prisma.aIConfig.findFirst({
      where: { type: 'FORBIDDEN_WORDS', isActive: true },
      orderBy: { updatedAt: 'desc' },
    }).catch(() => null);
    const forbiddenList = buildForbiddenList(
      dbForbiddenConfig?.items ?? [],
      forbiddenExtra,
    );

    const result = analyzeHumanness(
      html,
      forbiddenList,
      mode === 'news'
        ? { minWords: 300, minSpecificDataHits: 2 }
        : undefined,
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
