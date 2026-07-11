import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface PublishRequest {
  runId: string;
  title: string;
  html: string;
  metaDescription: string;
}

// ─── Publish lên WordPress REST API ──────────────────────────────────────────

async function publishToWordPress(data: PublishRequest) {
  const wpUrl      = process.env.WORDPRESS_URL?.replace(/\/$/, '');
  const wpUsername = process.env.WORDPRESS_USERNAME;
  const wpPassword = process.env.WORDPRESS_APP_PASSWORD;

  if (!wpUrl || !wpUsername || !wpPassword) {
    throw new Error('WordPress chưa được cấu hình — thêm WORDPRESS_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD vào .env.local');
  }

  const credentials = Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64');

  const response = await fetch(`${wpUrl}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: data.title,
      content: data.html,
      excerpt: data.metaDescription,
      status: 'draft', // Publish dưới dạng draft để review trước — đổi thành 'publish' nếu muốn publish thẳng
      meta: {
        _yoast_wpseo_metadesc: data.metaDescription,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WordPress API lỗi ${response.status}: ${errorText.slice(0, 200)}`);
  }

  const post = await response.json();
  return {
    postId: post.id,
    postUrl: post.link || `${wpUrl}/?p=${post.id}`,
    editUrl: `${wpUrl}/wp-admin/post.php?post=${post.id}&action=edit`,
    status: post.status,
  };
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: PublishRequest = await request.json();
    const { runId, title, html, metaDescription } = body;

    if (!title || !html) {
      return NextResponse.json(
        { success: false, error: 'Thiếu title hoặc nội dung HTML' },
        { status: 400 }
      );
    }

    console.log(`[pipeline/publish] runId=${runId} title="${title.slice(0, 50)}..."`);

    const result = await publishToWordPress({ runId, title, html, metaDescription });

    console.log(`[pipeline/publish] Published postId=${result.postId} url=${result.postUrl}`);

    // Update Article in database with WordPress data
    try {
      const article = await prisma.article.findFirst({
        where: { runId },
      });

      if (article) {
        await prisma.article.update({
          where: { id: article.id },
          data: {
            wordpressPostId: result.postId.toString(),
            wordpressUrl: result.postUrl,
            status: 'PUBLISHED',
            publishedAt: new Date(),
          },
        });
        console.log(`[pipeline/publish] Article updated: id=${article.id}, wpPostId=${result.postId}`);
      } else {
        console.warn(`[pipeline/publish] Article not found for runId=${runId}`);
      }
    } catch (dbError) {
      console.error('[pipeline/publish] Database error:', dbError);
      // Don't fail the request if DB update fails
    }

    return NextResponse.json({
      success: true,
      data: {
        postId: result.postId,
        postUrl: result.postUrl,
        editUrl: result.editUrl,
        status: result.status,
      },
    });

  } catch (error) {
    console.error('[pipeline/publish] Error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi publish không xác định';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
