import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

const saveSchema = z.object({
  topic: z.string().min(1),
  videoType: z.string().default('product_demo'),
  hookStyle: z.string().default('number'),
  ctaStyle: z.string().default('inbox'),
  title: z.string().optional().nullable(),
  content: z.string().min(1),
  hashtags: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  language: z.string().default('Vietnamese'),
  emojiLevel: z.string().default('medium'),
  wordCount: z.number().int().nullable().optional(),
  charCount: z.number().int().nullable().optional(),
  brandProfileId: z.string().optional().nullable(),
  brandName: z.string().optional().nullable(),
  modelId: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const rawBody = await request.json();
    const parsed = saveSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Payload không hợp lệ' },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const brandProfile = data.brandProfileId
      ? await prisma.brandProfile.findUnique({ where: { id: data.brandProfileId } })
      : null;

    const post = await prisma.tiktokPost.create({
      data: {
        topic: data.topic.trim(),
        videoType: data.videoType || 'product_demo',
        hookStyle: data.hookStyle || 'number',
        ctaStyle: data.ctaStyle || 'inbox',
        title: data.title?.trim() || null,
        content: data.content.trim(),
        hashtags: Array.isArray(data.hashtags)
          ? data.hashtags.join(' ')
          : data.hashtags?.trim() || null,
        language: data.language || 'Vietnamese',
        useEmoji: data.emojiLevel !== 'none',
        emojiLevel: data.emojiLevel || 'medium',
        wordCount: data.wordCount ?? null,
        charCount: data.charCount ?? null,
        brandProfileId: brandProfile?.id || null,
        brandName: data.brandName?.trim() || brandProfile?.shopName || null,
        modelId: data.modelId?.trim() || null,
        userId: user.userId,
      },
    });

    return NextResponse.json({ success: true, id: post.id, data: post });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
