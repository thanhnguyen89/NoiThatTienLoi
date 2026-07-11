import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const post = await prisma.tiktokPost.findFirst({
      where: { id: params.id, userId: user.userId },
    });

    if (!post) {
      return NextResponse.json({ error: 'Không tìm thấy caption' }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const content = String(body.content || '').trim();
    const title = body.title === undefined ? undefined : String(body.title || '').trim();
    const hashtags = body.hashtags === undefined ? undefined : String(body.hashtags || '').trim();

    if (!content) {
      return NextResponse.json({ error: 'Nội dung không được để trống' }, { status: 400 });
    }

    const existing = await prisma.tiktokPost.findFirst({
      where: { id: params.id, userId: user.userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy caption' }, { status: 404 });
    }

    const post = await prisma.tiktokPost.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined ? { title: title || null } : {}),
        content,
        ...(hashtags !== undefined ? { hashtags: hashtags || null } : {}),
        wordCount: countWords(content),
        charCount: content.length,
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const existing = await prisma.tiktokPost.findFirst({
      where: { id: params.id, userId: user.userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy caption' }, { status: 404 });
    }

    await prisma.tiktokPost.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
