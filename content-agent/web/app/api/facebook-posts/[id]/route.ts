import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

// ─── GET: Chi tiết bài ────────────────────────────────────────────────────────
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAuth();
    if (!authResult) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const post = await prisma.facebookPost.findUnique({ where: { id: params.id } });
    if (!post) return NextResponse.json({ success: false, error: 'Không tìm thấy' }, { status: 404 });

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error('[facebook-posts GET id]', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

// ─── PATCH: Cập nhật nội dung / trạng thái ───────────────────────────────────
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAuth();
    if (!authResult) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { content, status, note, wordCount, emojiCount, publishedAt } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (content    !== undefined) updateData.content    = content.trim();
    if (status     !== undefined) updateData.status     = status;
    if (note       !== undefined) updateData.note       = note?.trim() || null;
    if (wordCount  !== undefined) updateData.wordCount  = wordCount;
    if (emojiCount !== undefined) updateData.emojiCount = emojiCount;
    if (publishedAt !== undefined) {
      updateData.publishedAt = publishedAt ? new Date(publishedAt) : null;
    }
    // Khi đổi status sang PUBLISHED, tự set publishedAt nếu chưa có
    if (status === 'PUBLISHED' && !publishedAt) {
      updateData.publishedAt = new Date();
    }

    const post = await prisma.facebookPost.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error('[facebook-posts PATCH]', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAuth();
    if (!authResult) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    await prisma.facebookPost.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[facebook-posts DELETE]', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
