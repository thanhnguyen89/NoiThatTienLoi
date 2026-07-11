import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { buildBrandPrompt } from '@/app/api/pipeline/_context';
import { fetchGoogleSearchData } from '@/lib/google-search/search';
import { buildDataBlock } from '@/lib/google-search/prompt-inject';
import { buildForbiddenList } from '@/lib/tinh-gon/forbidden';
import { analyzeHumanness } from '@/lib/tinh-gon/humanness';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildPlainTextFromHtml } from '@/lib/tinh-gon/persistence';
import { buildMetaDescription, computeKeywordDensity, countWords, sanitizeHtmlArticle } from '@/lib/tinh-gon/text';
import { computeToplistTargetLength } from '@/lib/viet-toplist/options';
import { injectYandexImages } from '@/lib/viet-toplist/image-injector';
import type { ToplistConfig } from '@/lib/viet-toplist/types';

export const runtime = 'nodejs';

const STRUCTURE_TEMPLATES: Record<string, string> = {
  auto: `
Mỗi item theo cấu trúc AI tự quyết, nhưng phải nhất quán cho tất cả N items.
`.trim(),
  intro_features: `
Mỗi item gồm đúng 2 phần:
  [H3] Giới thiệu ngắn — 2-3 câu về sản phẩm, điểm nổi bật chính.
  [H3] Tính năng đặc biệt — liệt kê 3-5 tính năng quan trọng nhất.
`.trim(),
  intro_features_pros_cons: `
Mỗi item gồm đúng 4 phần:
  [H3] Giới thiệu — 2-3 câu tổng quan.
  [H3] Tính năng nổi bật — 3-5 tính năng chi tiết, có số liệu cụ thể.
  [H3] Ưu điểm & Nhược điểm — bullet list: 3 ưu, 2 nhược.
  [H3] Trải nghiệm thực tế — 2-3 câu nhận xét từ góc nhìn người dùng thực tế.
`.trim(),
  intro_features_faq: `
Mỗi item gồm đúng 2 phần:
  [H3] Giới thiệu ngắn — 2-3 câu về sản phẩm.
  [H3] Tính năng đặc biệt — 3-5 tính năng.
Sau tất cả N items, thêm 1 section:
  [H2] Câu hỏi thường gặp (FAQ)
  Gồm 4-6 câu hỏi liên quan đến chủ đề, mỗi câu trả lời 2-3 câu.
`.trim(),
  intro_features_pros_cons_faq: `
Mỗi item gồm đúng 4 phần:
  [H3] Giới thiệu — 2-3 câu tổng quan.
  [H3] Tính năng nổi bật — 3-5 tính năng có số liệu.
  [H3] Ưu điểm & Nhược điểm — 3 ưu, 2 nhược dạng bullet.
  [H3] Trải nghiệm thực tế — 2-3 câu nhận xét từ góc nhìn người dùng.
Sau tất cả N items, thêm:
  [H2] Câu hỏi thường gặp (FAQ)
  Gồm 4-6 câu hỏi, mỗi câu 2-3 câu trả lời.
`.trim(),
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  formal_seo: 'Giọng trang trọng, nhã nhặn. Keyword xuất hiện tự nhiên đầu bài và mỗi item.',
  expert_seo: 'Giọng chuyên gia, có quan điểm, số liệu thực, phân tích sâu. E-E-A-T cao.',
  friendly_ai_bypass: 'Giọng thân thiện, ấm áp. Câu ngắn xen câu dài. Khó detect bởi AI checker.',
  humorous_ai_bypass: 'Giọng vui vẻ, đôi khi hài hước nhẹ. Đọc cuốn. Vượt kiểm tra AI detector.',
  technical_seo: 'Giọng kỹ thuật, thông số cụ thể, không dùng tính từ rỗng.',
};

function buildToplistPrompt(
  config: ToplistConfig,
  brandPrompt: string,
  forbiddenList: string[],
  serpDataBlock: string,
): string {
  const structureInstruction = STRUCTURE_TEMPLATES[config.structure] ?? STRUCTURE_TEMPLATES.intro_features_pros_cons;
  const toneInstruction = TONE_INSTRUCTIONS[config.tone] ?? TONE_INSTRUCTIONS.formal_seo;
  const forbidden = forbiddenList.join(', ');
  const targetLength = Math.min(computeToplistTargetLength(config.topN, config.structure), 5000);

  const itemHints = config.secondaryKeywords.length > 0
    ? `Gợi ý tên ${config.topN} item (có thể điều chỉnh cho phù hợp):\n${
        config.secondaryKeywords.slice(0, config.topN).map((keyword, index) => `  ${index + 1}. ${keyword}`).join('\n')
      }`
    : `AI tự đặt tên ${config.topN} item phù hợp nhất với keyword.`;

  return `
Bạn là Writer Agent chuyên viết bài Toplist SEO chất lượng cao.

${brandPrompt}

${serpDataBlock ? `${serpDataBlock}\n\n---\n` : ''}

## Thông tin bài viết
- Từ khoá chính: ${config.keyword}
- Ngôn ngữ: ${config.language}
- Số item trong toplist: ${config.topN}
- Độ dài mục tiêu: ~${targetLength} từ

## ${itemHints}

## Cấu trúc bài (BẮT BUỘC tuân theo)

### Mở bài (H1 + đoạn intro)
- H1: tiêu đề bài toplist hấp dẫn, có keyword, có số (VD: "Top ${config.topN} [keyword] Tốt Nhất ${new Date().getFullYear()}")
- Đoạn mở bài: 3-5 câu tổng quan, nêu lý do chọn danh sách này.

### ${config.topN} Items (phần chính)
PHẢI viết đúng ${config.topN} items, không hơn không kém.
Đánh số từ 1 đến ${config.topN}. Mỗi item:
- [H2] Số. Tên Item — mô tả ngắn
${structureInstruction}

### Kết bài
Đoạn kết 3-4 câu: tóm tắt tiêu chí chọn, CTA cụ thể. Không dùng "Hy vọng bài viết hữu ích".

## Tone: ${toneInstruction}

## Quy tắc output
- Chỉ trả HTML hoàn chỉnh trong 1 thẻ <article>.
- Mỗi item là 1 <h2> đánh số + các <h3> theo cấu trúc trên.
- Không thêm CSS, JS, markdown hay lời giải thích ngoài thẻ <article>.
- Không dùng: ${forbidden}
- Số liệu cụ thể (mm, kg, giá, ngày giao) thay tính từ chung chung.
- Phân bổ từ đều cho các item, mỗi item ít nhất ${Math.floor(targetLength / config.topN)} từ.

Chỉ trả HTML.
`.trim();
}

function sseEvent(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

const streamSchema = z.object({
  articleId: z.string(),
  runId: z.string(),
  config: z.object({
    keyword: z.string().min(1),
    secondaryKeywords: z.array(z.string()).default([]),
    topN: z.number().min(5).max(15),
    structure: z.string(),
    tone: z.string(),
    dataSource: z.string(),
    imageOption: z.string(),
    language: z.string(),
    model: z.string(),
    brandConfig: z.record(z.unknown()).optional(),
  }),
  serpData: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const rawBody = await request.json();
    const parsed = streamSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Payload không hợp lệ' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { articleId, runId, config, serpData: cachedSerpData } = parsed.data as {
      articleId: string;
      runId: string;
      config: ToplistConfig;
      serpData?: string;
    };

    const article = await prisma.article.findFirst({
      where: { id: articleId, runId, userId: user.userId, deletedAt: null },
    });
    if (!article) {
      return new Response(JSON.stringify({ error: 'Article not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => sseEvent(controller, data);

        try {
          const dbForbiddenConfig = await prisma.aIConfig.findFirst({
            where: { type: 'FORBIDDEN_WORDS', isActive: true },
            orderBy: { updatedAt: 'desc' },
          }).catch(() => null);
          const forbiddenList = buildForbiddenList(
            dbForbiddenConfig?.items ?? [],
            config.brandConfig?.forbiddenExtra,
          );

          let serpDataBlock = cachedSerpData ?? '';
          if (!serpDataBlock && config.dataSource === 'google_search') {
            send({ type: 'step', step: 'serp', label: '🔍 Đang lấy dữ liệu thực tế từ Google...' });
            try {
              const googleData = await fetchGoogleSearchData(config.keyword, {
                num: 5,
                crawl: true,
                language: config.language,
              });
              if (googleData) {
                serpDataBlock = buildDataBlock(googleData);
                send({ type: 'step_done', step: 'serp', label: `✅ Google: ${googleData.items.length} kết quả` });
              } else {
                send({ type: 'step_done', step: 'serp', label: '⚠️ Google không khả dụng — dùng AI only' });
              }
            } catch {
              send({ type: 'step_done', step: 'serp', label: '⚠️ Lỗi fetch Google — dùng AI only' });
            }
          }

          const brandPrompt = await buildBrandPrompt(config.brandConfig);
          const prompt = buildToplistPrompt(config, brandPrompt, forbiddenList, serpDataBlock);
          const model = buildTinhGonModel(config.model);

          await prisma.article.update({
            where: { id: articleId },
            data: {
              status: 'WRITING',
              keyword: config.keyword,
              language: config.language,
              contentType: `viet_toplist:top${config.topN}`,
              targetLength: computeToplistTargetLength(config.topN, config.structure),
              aiProvider: config.model,
              brandConfig: (config.brandConfig ?? {}) as never,
            },
          });

          send({ type: 'step', step: 'writing', label: `AI đang viết Top ${config.topN} ${config.keyword}...` });

          let rawHtml = '';
          try {
            const aiStream = await model.generateContentStream(prompt);
            for await (const chunk of aiStream) {
              const text = chunk.text();
              if (!text) continue;
              rawHtml += text;
              send({ type: 'chunk', text });
            }
          } catch {
            const result = await model.generateContent(prompt);
            rawHtml = result.response.text();
            send({ type: 'chunk', text: rawHtml });
          }

          send({ type: 'step_done', step: 'writing' });

          let html = sanitizeHtmlArticle(rawHtml, config.keyword);
          let imagesInjected = 0;

          if (config.imageOption === 'yandex') {
            send({ type: 'step', step: 'images', label: '🖼️ Đang tìm ảnh từ Yandex...' });
            try {
              const injected = await injectYandexImages(html, config.keyword);
              html = injected.html;
              imagesInjected = injected.injectedCount;
              send({ type: 'step_done', step: 'images', label: `✅ Đã chèn ${imagesInjected}/${config.topN} ảnh` });
            } catch {
              send({ type: 'step_done', step: 'images', label: '⚠️ Không thể chèn ảnh — tiếp tục không có ảnh' });
            }
          }

          send({ type: 'step', step: 'scoring', label: 'Đang chấm điểm...' });

          const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          const title = titleMatch
            ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
            : config.keyword;

          const wordCount = countWords(html);
          const keywordDensity = computeKeywordDensity(html, config.keyword);
          const humanness = analyzeHumanness(html, forbiddenList);
          const metaDescription = buildMetaDescription(title, config.keyword);

          await prisma.article.update({
            where: { id: articleId },
            data: {
              selectedTitle: title,
              htmlContent: html,
              plainText: buildPlainTextFromHtml(html),
              metaDescription,
              wordCount,
              status: 'WRITTEN',
              aiDecision: humanness.decision,
              humannessScore: humanness.score,
              seoChecks: { keywordDensity } as never,
              scoreBreakdown: { humanness, keywordDensity } as never,
              outline: {
                flow: 'viet_toplist',
                stage: 'generate',
                topN: config.topN,
                structure: config.structure,
                tone: config.tone,
                imagesInjected,
                config,
              } as never,
            },
          });

          send({ type: 'step_done', step: 'scoring' });
          send({
            type: 'done',
            data: { runId, html, title, metaDescription, wordCount, keywordDensity, humanness, imagesInjected },
          });
        } catch (error) {
          await prisma.article.update({
            where: { id: articleId },
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
    const status = message === 'Unauthorized' ? 401 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
