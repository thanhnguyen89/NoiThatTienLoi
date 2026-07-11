import { ArticleStatus, Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildMetaDescription, countWords, sanitizeHtmlArticle, slugify, stripHtml } from '@/lib/tinh-gon/text';
import { computeSeoChecks } from '@/lib/shared/seo-checks';
import { buildSearchWritePrompt } from '@/lib/viet-tu-google-search/prompt-builder';
import type { SearchResult, VtgsConfig, VtgsStreamResult } from '@/lib/viet-tu-google-search/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

const schema = z.object({
  config: z.record(z.unknown()),
  searchResult: z.record(z.unknown()).nullable().optional(),
  finalOutline: z.string().default(''),
});

function send(controller: ReadableStreamDefaultController<Uint8Array>, event: unknown) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
}

function chunkText(value: string, size = 900): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += size) {
    chunks.push(value.slice(index, index + size));
  }
  return chunks;
}

function extractTitle(html: string, fallback: string): string {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return (match?.[1]?.replace(/<[^>]+>/g, '').trim() || fallback).slice(0, 500);
}

function fallbackArticle(config: VtgsConfig, searchResult: SearchResult | null): string {
  const keyword = config.keyword.trim() || 'chu de';
  const sourceList = (searchResult?.sources || [])
    .slice(0, 5)
    .map((source) => `<li><a href="${source.url}" rel="nofollow noopener" target="_blank">${source.title}</a> - ${source.snippet}</li>`)
    .join('');

  return `
<article>
  <h1>${keyword}: Huong dan day du va cap nhat</h1>
  <p>${keyword} la chu de can duoc nhin theo nhu cau thuc te, chi phi, muc dich su dung va cac nguon thong tin dang tin cay.</p>
  <nav class="toc">
    <ul>
      <li><a href="#tong-quan">Tong quan</a></li>
      <li><a href="#tieu-chi">Tieu chi danh gia</a></li>
      <li><a href="#kinh-nghiem">Kinh nghiem ap dung</a></li>
      <li><a href="#faq">FAQ</a></li>
    </ul>
  </nav>
  <h2 id="tong-quan">Tong quan ve ${keyword}</h2>
  <p>Khi viet bai tu Google Search, dieu quan trong la khong chi lap lai noi dung dang co. Bai viet can tong hop du lieu, bo sung goc nhin rieng va giup nguoi doc ra quyet dinh nhanh hon.</p>
  <h2 id="tieu-chi">Tieu chi nen xem truoc khi chon</h2>
  <ul>
    <li><strong>Muc dich su dung:</strong> Xac dinh bai toan chinh truoc khi so sanh.</li>
    <li><strong>Do tin cay cua nguon:</strong> Uu tien nguon co tac gia, ngay cap nhat va du lieu ro rang.</li>
    <li><strong>Tinh thuc te:</strong> Can co vi du, bang so sanh va loi khuyen co the ap dung.</li>
  </ul>
  ${sourceList ? `<h2>Nguon tham khao tu Google</h2><ul>${sourceList}</ul>` : ''}
  <h2 id="kinh-nghiem">Kinh nghiem ap dung ${keyword}</h2>
  <p>Hay bat dau tu mot nhu cau cu the, sau do doi chieu voi ngan sach, thoi gian va muc do uu tien. Cach nay giup tranh viet lan man va tao noi dung huu ich hon cho nguoi doc.</p>
  <h2 id="faq">Cau hoi thuong gap</h2>
  <div class="faq-section">
    <h3>${keyword} phu hop voi ai?</h3>
    <p>Phu hop voi nguoi dang can mot bai tong hop nhanh, co can cu tu ket qua tim kiem va van giu giong viet rieng cua thuong hieu.</p>
    <h3>Co can cap nhat bai viet thuong xuyen khong?</h3>
    <p>Co. Voi chu de co xu huong thay doi, nen cap nhat dinh ky de giu do moi va do tin cay.</p>
  </div>
  <h2>Ket luan</h2>
  <p>${config.brand.ctaStandard || `Neu ban dang quan tam ${keyword}, hay uu tien thong tin ro nguon, co vi du thuc te va phu hop voi muc tieu cua minh.`}</p>
</article>
`.trim();
}

function applySeoAdvanced(html: string, config: VtgsConfig): string {
  let nextHtml = html;
  const keyword = config.keyword.trim();
  const { mainLink, keywordLinks, autoBold, footerContent } = config.seoAdvanced;

  if (keyword && mainLink.trim()) {
    const pattern = new RegExp(`(>[^<]*?)(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})([^<]*?<)`, 'i');
    nextHtml = nextHtml.replace(pattern, `$1<a href="${mainLink.trim()}">$2</a>$3`);
  }

  if (keywordLinks.trim()) {
    const links = keywordLinks
      .split(/\n+/)
      .map((line) => line.split('|').map((part) => part.trim()))
      .filter((parts): parts is [string, string] => parts.length >= 2 && Boolean(parts[0]) && /^https?:\/\//i.test(parts[1]));

    for (const [linkKeyword, url] of links) {
      const pattern = new RegExp(`(>[^<]*?)(${linkKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})([^<]*?<)`, 'i');
      nextHtml = nextHtml.replace(pattern, `$1<a href="${url}">$2</a>$3`);
    }
  }

  if (keyword && (autoBold === 'keyword' || autoBold === 'both')) {
    const pattern = new RegExp(`(>[^<]*?)(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})([^<]*?<)`, 'i');
    nextHtml = nextHtml.replace(pattern, `$1<strong>$2</strong>$3`);
  }

  if (footerContent.trim()) {
    nextHtml = nextHtml.replace(/<\/article>\s*$/i, `<section class="brand-footer">${footerContent.trim()}</section></article>`);
  }

  return nextHtml;
}

function scoreHumanness(html: string, brandForbidden = '') {
  const text = stripHtml(html);
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter((item) => item.trim().length > 8);
  const avgSentence = sentences.length ? words.length / sentences.length : 0;
  const longParagraphs = (html.match(/<p[\s\S]*?<\/p>/gi) || []).filter((paragraph) => countWords(paragraph) > 90).length;
  const forbiddenFound = brandForbidden
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item && text.toLowerCase().includes(item.toLowerCase()));
  const issues = [
    avgSentence > 25 ? 'Cau hoi dai, nen cat ngan de doc mobile tot hon.' : '',
    longParagraphs > 0 ? `${longParagraphs} doan hoi dai.` : '',
    forbiddenFound.length ? 'Co tu/cum tu trong danh sach tranh dung.' : '',
  ].filter(Boolean);
  const score = Math.max(55, Math.min(94, 88 - longParagraphs * 4 - forbiddenFound.length * 6 - (avgSentence > 25 ? 6 : 0)));
  const decision = score >= 76 ? 'PUBLISH' : score >= 60 ? 'REVIEW' : 'REWRITE';

  return {
    score,
    decision,
    issues,
    forbiddenFound,
    scoreBreakdown: {
      language_natural: Math.min(25, Math.max(10, Math.round(score * 0.25))),
      structure: Math.min(25, Math.max(10, Math.round(score * 0.25))),
      eeat_signals: Math.min(25, Math.max(10, Math.round(score * 0.24))),
      engagement: Math.min(25, Math.max(10, Math.round(score * 0.26))),
    },
  } as const;
}

export async function POST(request: NextRequest) {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const user = await requireAuth();
        const rawBody = await request.json();
        const parsed = schema.safeParse(rawBody);

        if (!parsed.success) {
          send(controller, { type: 'error', message: 'Invalid payload' });
          controller.close();
          return;
        }

        const config = parsed.data.config as unknown as VtgsConfig;
        const searchResult = (parsed.data.searchResult || null) as SearchResult | null;
        const finalOutline = parsed.data.finalOutline;
        const fallbackTitle = `${config.keyword}: Huong dan cap nhat`;
        const runId = `${slugify(config.keyword || 'viet-tu-google-search')}-${Date.now()}`;

        send(controller, { type: 'step', step: 'outlining' });
        await new Promise((resolve) => setTimeout(resolve, 80));
        send(controller, { type: 'step_done', step: 'outlining' });

        send(controller, { type: 'step', step: 'writing' });
        let rawHtml = '';
        let streamedAnyChunk = false;
        try {
          const model = buildTinhGonModel(config.modelId || 'gemini-flash');
          const prompt = buildSearchWritePrompt({ config, searchResult, finalOutline });
          const generated = await model.generateContentStream(prompt);
          for await (const chunk of generated) {
            const text = chunk.text();
            if (!text) continue;
            rawHtml += text;
            streamedAnyChunk = true;
            send(controller, { type: 'chunk', text });
          }
        } catch {
          rawHtml = fallbackArticle(config, searchResult);
        }

        let finalHtml = sanitizeHtmlArticle(rawHtml, fallbackTitle);
        finalHtml = applySeoAdvanced(finalHtml, config);

        if (!streamedAnyChunk) {
          for (const chunk of chunkText(finalHtml)) {
            send(controller, { type: 'chunk', text: chunk });
            await new Promise((resolve) => setTimeout(resolve, 8));
          }
        }
        send(controller, { type: 'step_done', step: 'writing' });

        send(controller, { type: 'step', step: 'seo_check' });
        const title = extractTitle(finalHtml, fallbackTitle);
        const metaDescription = buildMetaDescription(title, config.keyword, searchResult?.synthesis);
        const plainText = stripHtml(finalHtml);
        const wordCount = countWords(finalHtml);
        const slug = config.seoAdvanced.customSlug.trim() || slugify(title);
        const seoResult = computeSeoChecks({
          title,
          metaDescription,
          html: finalHtml,
          wordCount,
          keyword: config.keyword,
          secondaryKeywords: config.secondaryKeywords,
          slug,
          sourceCount: searchResult?.sources.length || 0,
          minWordCount: Math.min(800, Math.max(400, Math.round(config.targetLength * 0.75))),
        });
        const humanness = scoreHumanness(finalHtml, config.brand.brandForbidden);

        const article = await prisma.article.create({
          data: {
            userId: user.userId,
            runId,
            status: ArticleStatus.WRITTEN,
            keyword: config.keyword,
            language: config.language,
            contentType: `viet_tu_google_search:${config.crawlMode || 'auto'}`,
            sourceType: searchResult?.sources?.length ? 'google_search' : 'ai_only',
            targetLength: config.targetLength,
            aiProvider: config.modelId || 'gemini-flash',
            brandConfig: (config.brandConfig ?? config.brand ?? {}) as Prisma.InputJsonValue,
            meta: ({
              searchSources: searchResult?.sources || [],
              searchedAt: searchResult?.searchedAt || null,
              crawlMode: config.crawlMode,
              addFreshnessDate: config.addFreshnessDate,
            } as unknown) as Prisma.InputJsonValue,
            competitorUrls: searchResult?.sources.map((source) => source.url) || [],
            competitorAnalysis: searchResult?.synthesis || '',
            outline: ({
              flow: 'viet_tu_google_search',
              stage: 'generate',
              config,
              finalOutline,
              searchResult,
            } as unknown) as Prisma.InputJsonValue,
            selectedTitle: title,
            userNotes: finalOutline || null,
            secondaryKeywords: config.secondaryKeywords,
            htmlContent: finalHtml,
            plainText,
            wordCount,
            metaDescription,
            slug,
            seoScore: seoResult.score,
            seoChecks: seoResult.checks as unknown as Prisma.InputJsonValue,
            humannessScore: humanness.score,
            scoreBreakdown: humanness.scoreBreakdown as Prisma.InputJsonValue,
            aiDecision: humanness.decision,
          },
        });

        send(controller, { type: 'step_done', step: 'seo_check' });
        const result: VtgsStreamResult = {
          articleId: article.id,
          runId,
          html: finalHtml,
          title,
          metaDescription,
          slug,
          wordCount,
          seoScore: seoResult.score,
          humannessScore: humanness.score,
          decision: humanness.decision,
          sources: searchResult?.sources || [],
        };
        send(controller, { type: 'done', data: result });
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Stream failed';
        send(controller, { type: 'error', message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
