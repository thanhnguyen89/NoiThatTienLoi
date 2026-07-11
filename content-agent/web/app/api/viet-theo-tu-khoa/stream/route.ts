import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { buildBrandPrompt, buildForbiddenList } from '@/app/api/pipeline/_context';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { analyzeHumanness } from '@/lib/tinh-gon/humanness';
import { buildMetaDescription, computeKeywordDensity, countWords, sanitizeHtmlArticle, escapeRegExp } from '@/lib/tinh-gon/text';
import { buildKeywordWritingPrompt } from '@/lib/viet-theo-tu-khoa/outline-generator';
import { buildKeywordSnapshot, parseKeywordSnapshot } from '@/lib/viet-theo-tu-khoa/persistence';
import type { KeywordArticleConfig } from '@/lib/viet-theo-tu-khoa/types';

export const runtime = 'nodejs';

const streamSchema = z.object({
  articleId: z.string().trim().min(1),
  runId: z.string().trim().min(4).max(120),
});

function sendEvent(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

function replaceFirstTextOccurrence(
  html: string,
  keyword: string,
  buildReplacement: (match: string) => string,
): string {
  const pattern = new RegExp(`(${escapeRegExp(keyword)})`, 'i');
  let replaced = false;

  return html
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (replaced || part.startsWith('<') || !pattern.test(part)) return part;
      replaced = true;
      return part.replace(pattern, (match) => buildReplacement(match));
    })
    .join('');
}

function applyKeywordSeoOptions(html: string, config: KeywordArticleConfig): string {
  let result = html;

  if (config.boldHeadings) {
    result = result.replace(
      /(<h[23][^>]*>)([\s\S]*?)(<\/h[23]>)/gi,
      (_, open: string, content: string, close: string) => {
        if (/<strong>/i.test(content)) return `${open}${content}${close}`;
        return `${open}<strong>${content}</strong>${close}`;
      },
    );
  }

  if (config.boldMainKeyword && config.keyword.trim()) {
    result = replaceFirstTextOccurrence(result, config.keyword.trim(), (match) => `<strong>${match}</strong>`);
  }

  if (config.seoMainLink?.trim() && config.keyword.trim()) {
    const mainLink = config.seoMainLink.trim();
    const keywordPattern = escapeRegExp(config.keyword.trim());
    let linkedStrong = false;
    result = result.replace(
      new RegExp(`<strong>(${keywordPattern})</strong>`, 'i'),
      (_, match: string) => {
        linkedStrong = true;
        return `<a href="${mainLink}" title="${config.keyword.trim()}"><strong>${match}</strong></a>`;
      },
    );

    if (!linkedStrong) {
      result = replaceFirstTextOccurrence(
        result,
        config.keyword.trim(),
        (match) => `<a href="${mainLink}" title="${config.keyword.trim()}">${match}</a>`,
      );
    }
  }

  for (const link of config.seoKeywordLinks ?? []) {
    if (!link.keyword.trim() || !link.url.trim()) continue;
    result = replaceFirstTextOccurrence(
      result,
      link.keyword.trim(),
      (match) => `<a href="${link.url.trim()}" title="${link.keyword.trim()}">${match}</a>`,
    );
  }

  if (config.footerContent?.trim()) {
    result += `\n<div class="article-footer">${config.footerContent.trim()}</div>`;
  }

  return result;
}

async function buildCompetitorAnalysis(config: KeywordArticleConfig): Promise<string> {
  const urls = (config.competitorUrls ?? []).filter(Boolean).slice(0, 5);
  if (urls.length === 0 || config.dataSource !== 'google_search') return '';

  return urls.map((url, index) => `${index + 1}. ${url}`).join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const rawBody = await req.json();
    const parsed = streamSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Payload không hợp lệ' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const article = await prisma.article.findFirst({
      where: {
        id: parsed.data.articleId,
        runId: parsed.data.runId,
        userId: user.userId,
        deletedAt: null,
      },
    });

    if (!article) {
      return new Response(JSON.stringify({ error: 'Article not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const snapshot = parseKeywordSnapshot(article.outline);
    const config = snapshot?.config as KeywordArticleConfig | undefined;

    if (!config) {
      return new Response(JSON.stringify({ error: 'Snapshot không hợp lệ' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => sendEvent(controller, data);

        try {
          await prisma.article.update({
            where: { id: article.id },
            data: {
              status: 'WRITING',
              outline: buildKeywordSnapshot({
                stage: 'generate',
                config,
                aiCheck: snapshot?.aiCheck,
              }) as never,
            },
          });

          send({ type: 'status', message: 'AI đang viết bài...' });

          const competitorAnalysis = await buildCompetitorAnalysis(config);
          const brandPrompt = await buildBrandPrompt(config.brandConfig);
          const prompt = `${brandPrompt}\n\n${buildKeywordWritingPrompt(config, config.resolvedOutline || '', competitorAnalysis)}`;
          const model = buildTinhGonModel(config.model);

          let streamedHtml = '';
          try {
            const output = await model.generateContentStream(prompt);
            for await (const chunk of output) {
              const text = chunk.text();
              if (!text) continue;
              streamedHtml += text;
              send({ type: 'chunk', text, html: text });
            }
          } catch {
            const output = await model.generateContent(prompt);
            const text = output.response.text();
            streamedHtml += text;
            send({ type: 'chunk', text, html: text });
          }

          send({ type: 'status', message: 'Đang xử lý nội dung...' });

          const cleanHtml = sanitizeHtmlArticle(streamedHtml, config.keyword);
          const finalHtml = applyKeywordSeoOptions(cleanHtml, config);
          const forbidden = buildForbiddenList(config.brandConfig?.forbiddenExtra);
          const humanness = analyzeHumanness(finalHtml, forbidden, {
            minWords: Math.max(500, Math.round(config.targetLength * 0.35)),
            minSpecificDataHits: config.tone === 'technical' ? 2 : 1,
          });
          const wordCount = countWords(finalHtml);
          const title = finalHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() || config.keyword;
          const plainText = finalHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          const metaDescription = buildMetaDescription(title, config.keyword);
          const keywordDensity = computeKeywordDensity(finalHtml, config.keyword);

          await prisma.article.update({
            where: { id: article.id },
            data: {
              keyword: config.keyword,
              language: config.language,
              contentType: `viet_theo_tu_khoa:${config.outlineMode}`,
              targetLength: config.targetLength,
              aiProvider: config.model,
              brandConfig: (config.brandConfig ?? {}) as never,
              secondaryKeywords: config.secondaryKeywords,
              selectedTitle: title,
              htmlContent: finalHtml,
              plainText,
              metaDescription,
              wordCount,
              status: 'WRITTEN',
              humannessScore: humanness.score,
              aiDecision: humanness.decision,
              seoChecks: { keywordDensity } as never,
              scoreBreakdown: { humanness, keywordDensity } as never,
              outline: buildKeywordSnapshot({
                stage: 'generate',
                config,
                aiCheck: snapshot?.aiCheck,
              }) as never,
            },
          });

          send({ type: 'humanness', score: humanness.score, decision: humanness.decision, humanness });
          send({
            type: 'done',
            articleId: article.id,
            wordCount,
            data: {
              articleId: article.id,
              wordCount,
              humannessScore: humanness.score,
              humannessDecision: humanness.decision,
            },
          });
        } catch (error) {
          console.error('[viet-theo-tu-khoa/stream] error:', error);
          await prisma.article.update({
            where: { id: article.id },
            data: { status: 'DRAFT' },
          }).catch(() => null);
          send({ type: 'error', message: error instanceof Error ? error.message : 'Lỗi stream' });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return new Response(JSON.stringify({ error: message }), {
      status: message === 'Unauthorized' ? 401 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
