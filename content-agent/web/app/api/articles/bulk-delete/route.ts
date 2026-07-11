import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

/**
 * POST /api/articles/bulk-delete
 * Soft delete multiple articles
 * 
 * Body: { ids: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid ids array' },
        { status: 400 }
      );
    }

    // Verify ownership and soft delete
    const result = await prisma.article.updateMany({
      where: {
        id: { in: ids },
        userId: user.userId,
        deletedAt: null,
      },
      data: {
        status: 'ARCHIVED',
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: result.count,
      },
    });

  } catch (error) {
    console.error('[POST /api/articles/bulk-delete] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
