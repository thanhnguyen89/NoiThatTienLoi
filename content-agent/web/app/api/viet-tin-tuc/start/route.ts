import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { buildArticleMeta } from '@/lib/shared/article-meta';
import { requireAuth } from '@/lib/server-auth';
import type { AutoBoldOption } from '@/lib/shared/options';
import { createTinhGonRunId } from '@/lib/tinh-gon/persistence';
import { DEFAULT_NEWS_LANG, NEWS_LANGUAGE_MAP } from '@/lib/viet-tin-tuc/options';
import { normalizeNewsConfig, type NewsConfig, type NewsItem } from '@/lib/viet-tin-tuc/types';

export const runtime = 'nodejs';

const startSchema = z.object({
  config: z.object({
    keyword: z.string().min(1),
    language: z.string().default('Vietnamese'),
    structure: z.string().default('auto'),
    tone: z.string().default('formal'),
    model: z.string().default('gemini-flash'),
    targetLength: z.number().default(600),
    secondaryKeywords: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
    brandConfig: z.record(z.unknown()).optional(),
    seoOptions: z.object({
      mainLink: z.string().optional(),
      keywordLinks: z.string().optional(),
      autoBold: z.custom<AutoBoldOption>().optional(),
      footerContent: z.string().optional(),
    }).optional(),
  }),
});

function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchGoogleNews(keyword: string, language: string): Promise<NewsItem[]> {
  const langMap = NEWS_LANGUAGE_MAP[language] ?? DEFAULT_NEWS_LANG;
  const q = encodeURIComponent(keyword.trim());
  const url = `https://news.google.com/rss/search?q=${q}&hl=${langMap.hl}&gl=${langMap.gl}&ceid=${langMap.ceid}`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ContentAgent/1.0)' },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) return [];

  const xml = await response.text();
  const items: NewsItem[] = [];
  const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

  for (const match of matches) {
    if (items.length >= 7) break;

    const block = match[1];
    const title = decodeEntities((block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '').trim());
    const link = decodeEntities((block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '').trim());
    const pubDate = decodeEntities((block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || '').trim());
    const source = decodeEntities((block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] || '').trim());
    const description = decodeEntities((block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || '').trim());
    const snippet = description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 320);

    if (!title || !link) continue;

    items.push({
      title,
      link,
      pubDate,
      source,
      snippet,
    });
  }

  return items;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const rawBody = await request.json();
    const parsed = startSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const { config: rawConfig } = parsed.data as { config: NewsConfig };
    const config = normalizeNewsConfig(rawConfig);
    const runId = createTinhGonRunId(config.keyword);

    const article = await prisma.article.create({
      data: {
        userId: user.userId,
        runId,
        status: 'DRAFT',
        keyword: config.keyword,
        language: config.language,
        contentType: `viet_tin_tuc:${config.structure}`,
        sourceType: 'google_news',
        targetLength: config.targetLength,
        aiProvider: config.model,
        brandConfig: (config.brandConfig ?? {}) as never,
        meta: buildArticleMeta('viet_tin_tuc', {
          structure: config.structure,
          tone: config.tone,
          sourceFeed: 'google_news',
          sourceCount: 0,
          hasSeoAdvanced: Boolean(
            config.seoOptions?.mainLink ||
              config.seoOptions?.keywordLinks ||
              config.seoOptions?.footerContent ||
              (config.seoOptions?.autoBold && config.seoOptions.autoBold !== 'none'),
          ),
        }),
        selectedTitle: config.keyword,
        htmlContent: '',
        competitorUrls: [],
        secondaryKeywords: config.secondaryKeywords,
        outline: {
          stage: 'config',
          structure: config.structure,
          tone: config.tone,
          config,
          sources: [],
        } as never,
      },
    });

    let sources: NewsItem[] = [];
    let warning: string | undefined;

    try {
      sources = await fetchGoogleNews(config.keyword, config.language);
    } catch (fetchError) {
      warning = 'Không thể fetch Google News, AI sẽ dùng kiến thức sẵn có.';
      console.warn('[viet-tin-tuc/start] fetchGoogleNews failed:', fetchError);
    }

    await prisma.article.update({
      where: { id: article.id },
      data: {
        meta: buildArticleMeta('viet_tin_tuc', {
          structure: config.structure,
          tone: config.tone,
          sourceFeed: 'google_news',
          sourceCount: sources.length,
          warning: warning ?? null,
          hasSeoAdvanced: Boolean(
            config.seoOptions?.mainLink ||
              config.seoOptions?.keywordLinks ||
              config.seoOptions?.footerContent ||
              (config.seoOptions?.autoBold && config.seoOptions.autoBold !== 'none'),
          ),
        }),
        outline: {
          stage: 'config',
          structure: config.structure,
          tone: config.tone,
          config,
          sources,
        } as never,
      },
    });

    return NextResponse.json({
      articleId: article.id,
      runId,
      sources,
      ...(warning ? { warning } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
