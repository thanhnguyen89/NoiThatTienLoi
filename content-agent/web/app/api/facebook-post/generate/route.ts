import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { generateFacebookPostText } from '@/lib/facebook-post/model';
import { buildFacebookPostPrompt } from '@/lib/facebook-post/prompt';
import { normalizeFacebookPostRequest } from '@/lib/facebook-post/schema';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const params = normalizeFacebookPostRequest(rawBody);
    const prompt = buildFacebookPostPrompt(params);
    const post = await generateFacebookPostText(params.modelId, prompt);

    return NextResponse.json({
      success: true,
      data: {
        post: post.trim(),
        keyword: params.keyword,
        template: params.template,
        wordCount: params.wordCount,
        modelId: params.modelId,
      },
    });
  } catch (error: unknown) {
    console.error('[facebook-post/generate] Error:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: error.issues[0]?.message || 'Du lieu dau vao khong hop le',
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Khong the tao bai post',
      },
      { status: 500 },
    );
  }
}
