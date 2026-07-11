import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server-auth';
import { generateKeywordOutline } from '@/lib/viet-theo-tu-khoa/outline-generator';
import type { AiOutlineObjective, AiOutlineSize } from '@/lib/viet-theo-tu-khoa/types';

export const runtime = 'nodejs';

const outlineSchema = z.object({
  keyword: z.string().trim().min(3),
  secondaryKeywords: z.array(z.string().trim().min(1).max(120)).max(10).default([]),
  isToplist: z.boolean().default(false),
  aiOutlineObjective: z.enum(['basic', 'problem_solution', 'listicle', 'comparison', 'step_by_step', 'story']).optional(),
  aiOutlineSize: z.enum(['2_3_h2', '3_4_h2', '5_6_h2', '7_8_h2', '9_10_h2']).optional(),
  language: z.string().trim().min(2).default('Vietnamese'),
  model: z.string().trim().min(1),
  tone: z.enum([
    'seo_basic',
    'seo_focus',
    'seo_extended',
    'seo_longform',
    'seo_nofaq',
    'how_to',
    'listicle',
    'comparison',
    'story',
    'technical',
    'friendly',
    'formal',
    'confident',
    'year_in_title',
    'cooking',
    'random',
  ]).default('seo_basic'),
});

export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const rawBody = await req.json();
    const parsed = outlineSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const outline = await generateKeywordOutline({
      keyword: parsed.data.keyword,
      secondaryKeywords: parsed.data.secondaryKeywords,
      isToplist: parsed.data.isToplist,
      aiOutlineObjective: parsed.data.aiOutlineObjective as AiOutlineObjective | undefined,
      aiOutlineSize: parsed.data.aiOutlineSize as AiOutlineSize | undefined,
      language: parsed.data.language,
      model: parsed.data.model,
      tone: parsed.data.tone,
      outlineMode: 'ai_outline',
      targetLength: 2000,
      imageOption: 'none',
      boldMainKeyword: true,
      boldHeadings: false,
    });

    return NextResponse.json({ success: true, outline });
  } catch (error) {
    console.error('[viet-theo-tu-khoa/outline] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Lỗi server' },
      { status: 500 },
    );
  }
}
