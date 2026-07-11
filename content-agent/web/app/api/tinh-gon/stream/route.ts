import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { buildBrandPrompt } from '@/app/api/pipeline/_context';
import { fetchGoogleSearchData } from '@/lib/google-search/search';
import { buildDataBlock } from '@/lib/google-search/prompt-inject';
import { buildForbiddenList } from '@/lib/tinh-gon/forbidden';
import { analyzeHumanness } from '@/lib/tinh-gon/humanness';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildPlainTextFromHtml, buildTinhGonContentType, buildTinhGonSnapshot } from '@/lib/tinh-gon/persistence';
import { streamRequestSchema } from '@/lib/tinh-gon/schema';
import { buildMetaDescription, computeKeywordDensity, countWords, sanitizeHtmlArticle } from '@/lib/tinh-gon/text';
import type { TinhGonConfig, TinhGonOutlineData } from '@/lib/tinh-gon/types';

export const runtime = 'nodejs';

function sseEvent(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

function buildStreamPrompt(
  config: TinhGonConfig,
  outline: TinhGonOutlineData,
  brandPrompt: string,
  forbiddenList: string[],
): string {
  const sectionsText = outline.sections
    .map((section, index) => `${index + 1}. ${section.heading} (~${section.targetWords} từ)${section.notes ? ` — ${section.notes}` : ''}`)
    .join('\n');

  const forbidden = forbiddenList.join(', ');
  const canUseTable = ['review_product', 'compare', 'buying_guide', 'listicle'].includes(config.outlineType);

  return `
Bạn là Writer Agent chuyên viết bài SEO "tinh gọn": ngắn, chắc, thực tế, đọc 5-7 phút là đủ ý.

${brandPrompt}

## Thông tin đầu vào
- Tiêu đề: ${outline.selectedTitle}
- Từ khóa chính: ${config.keyword}
- Từ khóa phụ: ${config.secondaryKeywords.join(', ') || 'không có'}
- Loại bài: ${config.outlineType}
- Ngôn ngữ: ${config.language}
- Độ dài mục tiêu: ${config.targetLength} từ
- Góc tiếp cận: ${outline.angle}
- Search intent: ${outline.searchIntent}
- Ghi chú thêm: ${config.notes || outline.userNotes || 'không có'}

## Dàn ý triển khai
${sectionsText}

## Content gaps nên lấp
${outline.contentGaps.map((gap) => `- ${gap}`).join('\n') || '- Không có'}

## Quy tắc output
- Chỉ trả HTML hoàn chỉnh trong một thẻ <article>.
- Có đúng 1 thẻ <h1>, mỗi section là <h2>, dưới mỗi <h2> có 1-2 đoạn <p>.
- Tổng số từ bám sát ${config.targetLength} từ, không lan man.
- Ưu tiên số liệu cụ thể, ví dụ thật, trường hợp nên mua/không nên mua.
- Không dùng các từ/cụm từ sau: ${forbidden}
- Keyword "${config.keyword}" xuất hiện tự nhiên, không nhồi nhét.
- ${canUseTable ? 'Được phép chèn tối đa 1 bảng HTML nếu thực sự hữu ích.' : 'Không cần bảng HTML.'}
- Không thêm CSS, JavaScript, markdown fence hay lời giải thích ngoài bài.

## Viết như người thật — chống AI detection (BẮT BUỘC)
- Nhịp câu đa dạng: xen kẽ câu ngắn 3–6 từ và câu trung bình 12–18 từ. KHÔNG 5 câu liên tiếp cùng độ dài.
- Mở đầu đoạn: luân phiên góc nhìn — số liệu cụ thể → câu hỏi → nhận xét ngắn → ví dụ thực tế.
- Dùng số liệu thực (mm, kg, ngày giao, giá tiền) thay mọi tính từ mơ hồ.
- Được phép dùng câu nghi vấn trong bài: "Nên mua 1m2 hay 1m4?" hoặc nhận định chủ quan: "Theo kinh nghiệm xưởng Minh Quân..."
- Mỗi bài phải có góc nhìn riêng — KHÔNG viết chung chung cho "mọi đối tượng".
- Persona cụ thể: mention đúng nhóm khách (sinh viên thuê trọ / gia đình trẻ / chủ homestay).
- Câu kết bài: nhận định ngắn thực tế hoặc CTA cụ thể — KHÔNG dùng "Hy vọng bài viết hữu ích".

## Chống nội dung trùng lặp
- Mỗi bài phải có góc tiếp cận chưa ai viết cho keyword "${config.keyword}".
- Mở bài KHÔNG bắt đầu bằng "Trong cuộc sống hiện đại..." hay tóm tắt lại keyword.
- Câu kết section KHÔNG tóm tắt lặp lại — chuyển thẳng hoặc đặt câu hỏi dẫn sang phần tiếp.
- CTA: không dùng "Liên hệ ngay để được tư vấn" — phải cụ thể: "Báo kích thước phòng — Minh Quân báo giá trong ngày."

Chỉ trả HTML.
`.trim();
}

async function generateHtml({
  prompt,
  modelId,
  onChunk,
}: {
  prompt: string;
  modelId: string;
  onChunk: (chunk: string) => void;
}): Promise<string> {
  const model = buildTinhGonModel(modelId);

  try {
    const stream = await model.generateContentStream(prompt);
    let output = '';

    for await (const chunk of stream) {
      const text = chunk.text();
      if (!text) continue;
      output += text;
      onChunk(text);
    }

    return output;
  } catch {
    const result = await model.generateContent(prompt);
    const output = result.response.text();
    onChunk(output);
    return output;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const rawBody = await request.json();
    const parsed = streamRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Payload không hợp lệ', issues: parsed.error.flatten() }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { articleId, runId, config, outline } = parsed.data;
    const article = await prisma.article.findFirst({
      where: {
        id: articleId,
        runId,
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

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => sseEvent(controller, data);

        try {
          await prisma.article.update({
            where: { id: articleId },
            data: {
              keyword: config.keyword,
              language: config.language,
              contentType: buildTinhGonContentType(config.outlineType),
              targetLength: config.targetLength,
              aiProvider: config.model,
              brandConfig: config.brandConfig,
              selectedTitle: outline.selectedTitle,
              userNotes: outline.userNotes || config.notes || null,
              secondaryKeywords: config.secondaryKeywords,
              outline: buildTinhGonSnapshot({
                stage: 'generate',
                config,
                outline,
              }),
              status: 'WRITING',
            },
          });

          send({ type: 'step', step: 'writing', label: 'AI đang viết bài tinh gọn...' });

          // Load từ cấm từ DB — fallback về hardcode nếu DB rỗng
          const dbForbiddenConfig = await prisma.aIConfig.findFirst({
            where: { type: 'FORBIDDEN_WORDS', isActive: true },
            orderBy: { updatedAt: 'desc' },
          }).catch(() => null);
          const forbiddenList = buildForbiddenList(
            dbForbiddenConfig?.items ?? [],
            config.brandConfig?.forbiddenExtra,
          );

          const brandPrompt = await buildBrandPrompt(config.brandConfig);
          let googleDataBlock = '';
          if (config.dataSource === 'google_search') {
            send({ type: 'step', step: 'google_search', label: '🔍 Đang lấy dữ liệu từ Google...' });
            const googleData = await fetchGoogleSearchData(config.keyword, {
              num: 5,
              crawl: true,
              language: config.language,
            });
            if (googleData) {
              googleDataBlock = buildDataBlock(googleData);
              send({ type: 'step_done', step: 'google_search', label: `✅ Google: ${googleData.items.length} kết quả` });
            } else {
              send({ type: 'step_done', step: 'google_search', label: '⚠️ Google không khả dụng — dùng AI only' });
            }
          }
          const rawOutput = await generateHtml({
            prompt: buildStreamPrompt(
              config,
              outline,
              googleDataBlock ? `${brandPrompt}\n\n${googleDataBlock}` : brandPrompt,
              forbiddenList,
            ),
            modelId: config.model,
            onChunk: (chunk) => send({ type: 'chunk', text: chunk }),
          });

          send({ type: 'step_done', step: 'writing' });
          send({ type: 'step', step: 'scoring', label: 'Đang chấm humanness và SEO cơ bản...' });

          const html = sanitizeHtmlArticle(rawOutput, outline.selectedTitle);
          const plainText = buildPlainTextFromHtml(html);
          const wordCount = countWords(html);
          const keywordDensity = computeKeywordDensity(html, config.keyword);
          const humanness = analyzeHumanness(html, forbiddenList);
          const metaDescription = buildMetaDescription(outline.selectedTitle, config.keyword, outline.angle);

          await prisma.article.update({
            where: { id: articleId },
            data: {
              selectedTitle: outline.selectedTitle,
              userNotes: outline.userNotes || config.notes || null,
              secondaryKeywords: config.secondaryKeywords,
              htmlContent: html,
              plainText,
              wordCount,
              metaDescription,
              humannessScore: humanness.score,
              aiDecision: humanness.decision,
              seoChecks: {
                keywordDensity,
              } as any,
              scoreBreakdown: {
                humanness,
                keywordDensity,
              } as any,
              status: 'WRITTEN',
            },
          });

          send({
            type: 'done',
            data: {
              runId,
              html,
              title: outline.selectedTitle,
              metaDescription,
              wordCount,
              keywordDensity,
              humanness,
            },
          });
        } catch (error) {
          await prisma.article.update({
            where: { id: articleId },
            data: {
              status: 'DRAFT',
            },
          }).catch(() => null);

          const message = error instanceof Error ? error.message : 'Không thể tạo nội dung';
          send({ type: 'error', message });
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
