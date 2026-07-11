import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const style = searchParams.get('style') || '';
    const search = searchParams.get('search') || '';
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 20)));

    const where: Prisma.FacebookCommentBrandWhereInput = {
      userId: user.userId,
    };

    if (style) where.style = style;
    if (search) where.postContent = { contains: search, mode: 'insensitive' };

    const [total, items] = await Promise.all([
      prisma.facebookCommentBrand.count({ where }),
      prisma.facebookCommentBrand.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          createdAt: true,
          postContent: true,
          style: true,
          count: true,
          comments: true,
          notes: true,
        },
      }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      hasMore: page * limit < total,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Loi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
