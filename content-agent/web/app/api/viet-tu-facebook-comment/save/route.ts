import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

const saveSchema = z.object({
  postContent: z.string().min(5),
  facebookPostId: z.string().nullable().optional(),
  style: z.string(),
  language: z.string(),
  count: z.number().int().min(1).max(50),
  modelId: z.string(),
  comments: z.array(z.string().min(1)).min(1),
  brandSnapshot: z.record(z.unknown()).optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const parsed = saveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Payload khong hop le' },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.facebookPostId) {
      const linkedPost = await prisma.facebookPost.findUnique({ where: { id: data.facebookPostId } });
      if (!linkedPost) {
        return NextResponse.json({ error: 'Facebook post khong ton tai' }, { status: 404 });
      }
    }

    const record = await prisma.facebookCommentBrand.create({
      data: {
        postContent: data.postContent.trim(),
        facebookPostId: data.facebookPostId || null,
        style: data.style,
        language: data.language,
        count: data.count,
        modelId: data.modelId,
        comments: data.comments.map((item) => item.trim()).filter(Boolean),
        brandSnapshot: (data.brandSnapshot || {}) as never,
        notes: data.notes?.trim() || null,
        userId: user.userId,
      },
    });

    return NextResponse.json({ id: record.id, savedCount: record.comments.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Loi luu du lieu';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
