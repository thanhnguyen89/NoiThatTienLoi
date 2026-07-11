import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

export const runtime = 'nodejs';

const schema = z.object({
  siteId: z.string(),
  category: z.string().optional(),
  scheduleHour: z.number().min(0).max(23).optional(),
});

interface WordPressPost {
  id: number;
  link: string;
  status: string;
}

async function publishToWordPress(
  siteUrl: string,
  username: string,
  appPassword: string,
  post: {
    title: string;
    content: string;
    status: 'publish' | 'future' | 'draft';
    categories?: number[];
    date?: string;
  },
): Promise<WordPressPost> {
  const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');

  const response = await fetch(`${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: post.title,
      content: post.content,
      status: post.status,
      date: post.date,
      categories: post.categories,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(payload.message ?? `WordPress trả lỗi ${response.status}`);
  }

  return response.json() as Promise<WordPressPost>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireAuth();
    const rawBody = await request.json();
    const parsed = schema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const { siteId, category, scheduleHour } = parsed.data;

    const article = await prisma.article.findFirst({
      where: { id: params.id, userId: user.userId, deletedAt: null },
    });
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const website = await prisma.websiteConfig.findFirst({
      where: { id: siteId, isActive: true },
    });
    if (!website) {
      return NextResponse.json({ error: 'Website không tồn tại' }, { status: 404 });
    }

    if (!website.username || !website.appPassword) {
      return NextResponse.json({ error: 'Website chưa cấu hình username/app password' }, { status: 400 });
    }

    let publishDate: string | undefined;
    let status: 'publish' | 'future' | 'draft' = website.defaultStatus === 'publish' ? 'publish' : 'draft';
    if (scheduleHour !== undefined) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(scheduleHour, 0, 0, 0);
      publishDate = tomorrow.toISOString().replace('.000Z', '');
      status = 'future';
    }

    const categoryIds: number[] = [];
    if (category?.trim() && /^\d+$/.test(category.trim())) {
      categoryIds.push(Number(category.trim()));
    } else if (website.defaultCategory) {
      categoryIds.push(website.defaultCategory);
    }

    const wpPost = await publishToWordPress(
      website.apiUrl || website.url,
      website.username,
      website.appPassword,
      {
        title: article.selectedTitle || article.keyword,
        content: article.htmlContent || '',
        status,
        date: publishDate,
        categories: categoryIds.length > 0 ? categoryIds : undefined,
      },
    );

    await prisma.article.update({
      where: { id: params.id },
      data: {
        status: 'PUBLISHED',
        wordpressPostId: wpPost.id,
        wordpressUrl: wpPost.link,
        wordpressStatus: wpPost.status,
        publishedAt: new Date(),
      },
    });

    return NextResponse.json({ postUrl: wpPost.link, postId: wpPost.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Publish thất bại';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
