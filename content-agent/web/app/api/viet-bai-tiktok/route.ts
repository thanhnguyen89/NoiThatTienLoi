import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 20)));
    const videoType = searchParams.get('videoType') || '';
    const hookStyle = searchParams.get('hookStyle') || '';
    const q = searchParams.get('q') || searchParams.get('search') || '';

    const where: Prisma.TiktokPostWhereInput = {
      userId: user.userId,
    };

    if (videoType) where.videoType = videoType;
    if (hookStyle) where.hookStyle = hookStyle;
    if (q) {
      where.OR = [
        { topic: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
        { hashtags: { contains: q, mode: 'insensitive' } },
        { brandName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.tiktokPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          topic: true,
          title: true,
          content: true,
          hashtags: true,
          videoType: true,
          hookStyle: true,
          ctaStyle: true,
          emojiLevel: true,
          wordCount: true,
          charCount: true,
          brandName: true,
          createdAt: true,
        },
      }),
      prisma.tiktokPost.count({ where }),
    ]);

    return NextResponse.json({
      posts,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
