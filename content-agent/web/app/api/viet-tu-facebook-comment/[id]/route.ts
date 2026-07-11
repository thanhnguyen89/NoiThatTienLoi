import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const record = await prisma.facebookCommentBrand.findFirst({
      where: { id: params.id, userId: user.userId },
    });

    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(record);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Loi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    await prisma.facebookCommentBrand.deleteMany({
      where: { id: params.id, userId: user.userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Loi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
