import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

export const runtime = 'nodejs';

const schema = z.object({
  tags: z.array(z.string().trim().min(1).max(80)).max(50),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireAuth();
    const rawBody = await request.json();
    const parsed = schema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ', issues: parsed.error.flatten() }, { status: 400 });
    }

    const article = await prisma.article.findFirst({
      where: { id: params.id, userId: user.userId, deletedAt: null },
    });
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const updated = await prisma.article.update({
      where: { id: params.id },
      data: {
        secondaryKeywords: parsed.data.tags,
      },
    });

    return NextResponse.json({ success: true, tags: updated.secondaryKeywords });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
