import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { runId: string } }
) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { runId } = params;

    const article = await prisma.article.findFirst({
      where: {
        runId,
        userId: user.userId,
      },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!article) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: article,
    });

  } catch (error) {
    console.error('[by-runid] Error:', error);
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
