import { NextRequest, NextResponse } from 'next/server';
import { ArticleStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

interface SaveRequest {
  keyword?: string;
  language?: string;
  contentType?: string;
  targetLength?: number;
  aiProvider?: string;
  brandConfig?: unknown;
  outline?: unknown;
  selectedTitle: string;
  userNotes?: string | null;
  htmlContent: string;
  metaDescription?: string;
  slug?: string;
  wordCount?: number;
  seoScore?: number;
  seoChecks?: unknown;
  humannessScore?: number;
  scoreBreakdown?: unknown;
  secondaryKeywords?: string[];
  featuredImage?: string;
  status?: ArticleStatus;
  aiDecision?: string;
  createVersion?: boolean;
}

function toNullableJson(value: unknown): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
  return value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
}

function toJson(value: unknown): Prisma.JsonNullValueInput | Prisma.InputJsonValue {
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body: SaveRequest = await request.json();
    const { 
      keyword,
      language,
      contentType,
      targetLength,
      aiProvider,
      brandConfig,
      outline,
      selectedTitle, 
      userNotes,
      htmlContent, 
      metaDescription, 
      slug, 
      wordCount, 
      seoScore,
      seoChecks,
      humannessScore,
      scoreBreakdown,
      secondaryKeywords,
      featuredImage,
      status,
      aiDecision,
      createVersion 
    } = body;

    // Check if article exists and user has permission
    const article = await prisma.article.findUnique({
      where: { id: params.id },
    });

    if (!article) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    if (article.userId !== user.userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Create version if requested
    if (createVersion && article.htmlContent) {
      // Get latest version number
      const latestVersion = await prisma.articleVersion.findFirst({
        where: { articleId: params.id },
        orderBy: { versionNumber: 'desc' },
      });
      
      await prisma.articleVersion.create({
        data: {
          articleId: article.id,
          versionNumber: (latestVersion?.versionNumber || 0) + 1,
          title: article.selectedTitle,
          htmlContent: article.htmlContent,
          metaDescription: article.metaDescription,
          wordCount: article.wordCount,
          savedBy: user.userId,
        },
      });
      console.log(`[save] Version created for article ${params.id}`);
    }

    const plainText = htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const resolvedWordCount = wordCount !== undefined
      ? wordCount
      : (plainText ? plainText.split(/\s+/).filter(Boolean).length : 0);

    // Update article
    const updated = await prisma.article.update({
      where: { id: params.id },
      data: {
        ...(keyword !== undefined && { keyword }),
        ...(language !== undefined && { language }),
        ...(contentType !== undefined && { contentType }),
        ...(targetLength !== undefined && { targetLength }),
        ...(aiProvider !== undefined && { aiProvider }),
        ...(brandConfig !== undefined && { brandConfig: toNullableJson(brandConfig) }),
        ...(outline !== undefined && { outline: toJson(outline) }),
        selectedTitle,
        ...(userNotes !== undefined && { userNotes }),
        htmlContent,
        plainText,
        ...(metaDescription !== undefined && { metaDescription }),
        ...(slug !== undefined && { slug }),
        wordCount: resolvedWordCount,
        ...(seoScore !== undefined && { seoScore }),
        ...(seoChecks !== undefined && { seoChecks: toNullableJson(seoChecks) }),
        ...(humannessScore !== undefined && { humannessScore }),
        ...(scoreBreakdown !== undefined && { scoreBreakdown: toNullableJson(scoreBreakdown) }),
        ...(secondaryKeywords !== undefined && { secondaryKeywords }),
        ...(featuredImage !== undefined && { featuredImage }),
        ...(status !== undefined && { status }),
        ...(aiDecision !== undefined && { aiDecision }),
      },
    });

    console.log(`[save] Article ${params.id} updated, version=${createVersion}`);

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        selectedTitle: updated.selectedTitle,
        updatedAt: updated.updatedAt,
      },
    });

  } catch (error) {
    console.error('[save] Error:', error);
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
