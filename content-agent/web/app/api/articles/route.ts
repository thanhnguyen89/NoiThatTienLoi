import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

/**
 * GET /api/articles
 * List articles với filter, pagination, search
 * 
 * Query params:
 * - status: DRAFT | WRITING | WRITTEN | PUBLISHED | ARCHIVED | all
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * - search: string (search trong keyword, title)
 * - sort: createdAt | updatedAt | wordCount (default: createdAt)
 * - order: asc | desc (default: desc)
 */
export async function GET(request: NextRequest) {
  try {
    // ── Authentication ─────────────────────────────────────────────────────────
    const currentUser = await requireAuth();

    // ── Parse query params ─────────────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = searchParams.get('search')?.trim() || '';
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';

    // ── Build where clause ─────────────────────────────────────────────────────
    const where: any = {
      userId: currentUser.userId,
      deletedAt: null, // soft delete filter
    };

    if (status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { keyword: { contains: search, mode: 'insensitive' } },
        { selectedTitle: { contains: search, mode: 'insensitive' } },
        { plainText: { contains: search, mode: 'insensitive' } },
      ];
    }

    // ── Build orderBy ──────────────────────────────────────────────────────────
    const orderBy: any = [
      { isBoosted: 'desc' }, // boosted articles first
    ];

    if (sort === 'createdAt') orderBy.push({ createdAt: order });
    else if (sort === 'updatedAt') orderBy.push({ updatedAt: order });
    else if (sort === 'wordCount') orderBy.push({ wordCount: order });
    else orderBy.push({ createdAt: order });

    // ── Execute queries ────────────────────────────────────────────────────────
    const [articles, total, stats] = await Promise.all([
      // Get articles
      prisma.article.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          runId: true,
          keyword: true,
          contentType: true,
          selectedTitle: true,
          secondaryKeywords: true,
          featuredImage: true,
          status: true,
          wordCount: true,
          seoScore: true,
          humannessScore: true,
          isBoosted: true,
          createdAt: true,
          updatedAt: true,
          publishedAt: true,
          wordpressUrl: true,
        },
      }),

      // Count total
      prisma.article.count({ where }),

      // Get stats
      prisma.article.groupBy({
        by: ['status'],
        where: { userId: currentUser.userId, deletedAt: null },
        _count: { _all: true },
      }),
    ]);

    // ── Calculate stats ────────────────────────────────────────────────────────
    const statusCounts = stats.reduce((acc, item) => {
      acc[item.status] = item._count._all;
      return acc;
    }, {} as Record<string, number>);

    const totalArticles = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    const writtenCount = (statusCounts.WRITTEN || 0) + (statusCounts.PUBLISHED || 0);

    // TODO: Calculate credits from actual usage
    const creditsUsed = writtenCount * 100; // placeholder: 100 credits per article
    const creditsTotal = 5000;

    // ── Response ───────────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      data: {
        articles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        stats: {
          total: totalArticles,
          written: writtenCount,
          draft: statusCounts.DRAFT || 0,
          writing: statusCounts.WRITING || 0,
          published: statusCounts.PUBLISHED || 0,
          archived: statusCounts.ARCHIVED || 0,
          credits: {
            used: creditsUsed,
            total: creditsTotal,
            remaining: creditsTotal - creditsUsed,
          },
        },
      },
    });

  } catch (error) {
    console.error('[GET /api/articles] Error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
