import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

/**
 * GET /api/articles/:id
 * Get single article by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const article = await prisma.article.findFirst({
      where: {
        id: params.id,
        userId: user.userId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
          },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 10,
          include: {
            savedByUser: {
              select: {
                username: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { article },
    });

  } catch (error) {
    console.error('[GET /api/articles/:id] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/articles/:id
 * Update article (title, content, meta, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      keyword,
      language,
      contentType,
      targetLength,
      aiProvider,
      brandConfig,
      competitorUrls,
      competitorAnalysis,
      sourceType,
      meta,
      outline,
      selectedTitle,
      userNotes,
      secondaryKeywords,
      htmlContent,
      metaDescription,
      slug,
      seoScore,
      seoChecks,
      humannessScore,
      scoreBreakdown,
      featuredImage,
      status,
      aiDecision,
      createVersion = false,
    } = body;

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

    // Calculate word count if htmlContent provided
    let wordCount = article.wordCount;
    let plainText: string | null = article.plainText;
    if (htmlContent !== undefined) {
      plainText = htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
    }

    // Update article
    const updated = await prisma.article.update({
      where: { id: params.id },
      data: {
        ...(keyword !== undefined && { keyword }),
        ...(language !== undefined && { language }),
        ...(contentType !== undefined && { contentType }),
        ...(targetLength !== undefined && { targetLength }),
        ...(aiProvider !== undefined && { aiProvider }),
        ...(brandConfig !== undefined && { brandConfig }),
        ...(competitorUrls !== undefined && { competitorUrls }),
        ...(competitorAnalysis !== undefined && { competitorAnalysis }),
        ...(sourceType !== undefined && { sourceType }),
        ...(meta !== undefined && { meta }),
        ...(outline !== undefined && { outline }),
        ...(selectedTitle !== undefined && { selectedTitle }),
        ...(userNotes !== undefined && { userNotes }),
        ...(secondaryKeywords !== undefined && { secondaryKeywords }),
        ...(htmlContent !== undefined && { htmlContent, plainText, wordCount }),
        ...(metaDescription !== undefined && { metaDescription }),
        ...(slug !== undefined && { slug }),
        ...(seoScore !== undefined && { seoScore }),
        ...(seoChecks !== undefined && { seoChecks }),
        ...(humannessScore !== undefined && { humannessScore }),
        ...(scoreBreakdown !== undefined && { scoreBreakdown }),
        ...(featuredImage !== undefined && { featuredImage }),
        ...(status !== undefined && { status }),
        ...(aiDecision !== undefined && { aiDecision }),
      },
    });

    // Create version if requested
    if (createVersion && htmlContent !== undefined) {
      const latestVersion = await prisma.articleVersion.findFirst({
        where: { articleId: params.id },
        orderBy: { versionNumber: 'desc' },
      });

      await prisma.articleVersion.create({
        data: {
          articleId: params.id,
          versionNumber: (latestVersion?.versionNumber || 0) + 1,
          title: selectedTitle || article.selectedTitle,
          htmlContent,
          metaDescription: metaDescription || article.metaDescription,
          slug: slug || article.slug,
          wordCount,
          seoScore: seoScore || article.seoScore,
          humannessScore: humannessScore || article.humannessScore,
          savedBy: user.userId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: { article: updated },
    });

  } catch (error) {
    console.error('[PATCH /api/articles/:id] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/articles/:id
 * Soft delete article
 */
export async function DELETE(
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

    // Soft delete
    await prisma.article.update({
      where: { id: params.id },
      data: {
        status: 'ARCHIVED',
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Article deleted successfully',
    });

  } catch (error) {
    console.error('[DELETE /api/articles/:id] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
