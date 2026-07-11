import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

// ─── GET: Danh sách bài Facebook post ─────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page     = Math.max(1, parseInt(searchParams.get('page')  || '1'));
    const limit    = Math.min(50, parseInt(searchParams.get('limit') || '20'));
    const search   = searchParams.get('search') || '';
    const status   = searchParams.get('status') || '';
    const tone     = searchParams.get('tone')   || '';

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { keyword: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { shopName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (tone)   where.tone   = tone;

    const [total, posts] = await Promise.all([
      prisma.facebookPost.count({ where }),
      prisma.facebookPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, keyword: true, shopName: true, industry: true,
          tone: true, template: true, wordCount: true, emojiCount: true,
          status: true, note: true, publishedAt: true, createdAt: true, updatedAt: true,
          // Trả về 200 ký tự đầu của content để preview
          content: true,
        },
      }),
    ]);

    // Truncate content cho list view
    const data = posts.map(p => ({
      ...p,
      contentPreview: p.content.slice(0, 200) + (p.content.length > 200 ? '…' : ''),
    }));

    return NextResponse.json({
      success: true,
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[facebook-posts GET]', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

// ─── POST: Tạo bài mới ────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { keyword, content, shopName, industry, tone, template, wordCount, emojiCount, note } = body;

    if (!keyword?.trim() || !content?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Thiếu keyword hoặc content' },
        { status: 400 },
      );
    }

    const post = await prisma.facebookPost.create({
      data: {
        keyword:    keyword.trim(),
        content:    content.trim(),
        shopName:   shopName?.trim()  || null,
        industry:   industry?.trim()  || null,
        tone:       tone?.trim()      || 'friendly',
        template:   template?.trim()  || null,
        wordCount:  wordCount  || 0,
        emojiCount: emojiCount || 0,
        note:       note?.trim()      || null,
        status:     'DRAFT',
      },
    });

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error('[facebook-posts POST]', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
