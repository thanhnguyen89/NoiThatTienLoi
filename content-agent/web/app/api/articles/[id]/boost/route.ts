import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

/**
 * POST /api/articles/:id/boost
 * Toggle boost status for article (priority in listing)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const article = await prisma.article.findFirst({
      where: {
        id: params.id,
        userId: user.userId,
        deletedAt: null,
      },
    });

    if (!article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    // Toggle boost
    const updated = await prisma.article.update({
      where: { id: params.id },
      data: {
        isBoosted: !article.isBoosted,
        boostedAt: !article.isBoosted ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        isBoosted: updated.isBoosted,
        boostedAt: updated.boostedAt,
      },
    });

  } catch (error) {
    console.error('[POST /api/articles/:id/boost] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
