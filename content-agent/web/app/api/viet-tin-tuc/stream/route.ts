import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { buildBrandPrompt } from '@/app/api/pipeline/_context';
import { buildForbiddenList, mergeForbiddenWords } from '@/lib/tinh-gon/forbidden';
import { analyzeHumanness } from '@/lib/tinh-gon/humanness';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildMetaDescription, computeKeywordDensity, countWords, sanitizeHtmlArticle } from '@/lib/tinh-gon/text';
import type { NewsConfig, NewsItem } from '@/lib/viet-tin-tuc/types';

export const runtime = 'nodejs';

const TONE_INSTRUCTIONS: Record<string, string> = {
  formal: 'Giọng văn trang trọng, nghiêm túc. Dùng "độc giả" hoặc "bạn đọc".',
  intimate: 'Giọng văn thân mật, gần gũi như tạp chí. Dùng "bạn".',
  friendly: 'Giọng văn ấm áp, thân thiện. Dùng "bạn".',
  expert: 'Giọng văn chuyên môn, phân tích sâu. Có số liệu và lập luận rõ.',
  humorous: 'Giọng văn vui vẻ, châm biếm nhẹ nhàng. Được phép dùng ẩn dụ hài.',
  inspirational: 'Giọng văn truyền cảm hứng, tích cực, tạo động lực.',
  nostalgic: 'Giọng văn hoài cổ, gợi nhớ, cảm xúc.',
  shocking: 'Giọng văn gây chú ý, mở bài mạnh mẽ và giàu nhịp điệu.',
  conversational: 'Giọng văn trò chuyện như blog cá nhân, thoải mái và gần gũi.',
};

const STRUCTURE_INSTRUCTIONS: Record<string, string> = {
  auto: 'Chọn cấu trúc phù hợp nhất với nội dung tin tức.',
  inverted_pyramid: 'Cấu trúc Kim Tự Tháp: tin quan trọng nhất ở đầu, chi tiết phụ ở dưới.',
  storytelling: 'Cấu trúc Kể Chuyện: mở đầu kịch tính, diễn biến theo thời gian.',
  qa: 'Cấu trúc Hỏi & Đáp: mỗi section là một câu hỏi và phần trả lời.',
  how_to: 'Cấu trúc How-To: từng bước rõ ràng, có hành động cụ thể.',
  pro_con: 'Cấu trúc Pro & Con: phần ưu điểm, phần nhược điểm, rồi kết luận.',
  historical: 'Cấu trúc Timeline: diễn biến từ quá khứ tới hiện tại và xu hướng.',
  listicle: 'Cấu trúc Danh Sách: Top N điểm, mỗi điểm là một H2 rõ ràng.',
  profile: 'Cấu trúc Profile: giới thiệu, điểm nổi bật, thành tích, nhận định.',
  review: 'Cấu trúc Review: tổng quan, ưu điểm, nhược điểm, đánh giá và kết luận.',
};

const streamSchema = z.object({
  articleId: z.string(),
  runId: z.string(),
  config: z.object({
    keyword: z.string().min(1),
    language: z.string(),
    structure: z.string(),
    tone: z.string(),
    model: z.string(),
    targetLength: z.number(),
    brandConfig: z.record(z.unknown()).optional(),
  }),
  sources: z.array(z.object({
    title: z.string(),
    link: z.string(),
    pubDate: z.string(),
    source: z.string(),
    snippet: z.string(),
  })),
});

function sseEvent(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

function buildNewsPrompt(config: NewsConfig, sources: NewsItem[], brandPrompt: string): string {
  const forbidden = mergeForbiddenWords(config.brandConfig?.forbiddenExtra).join(', ');
  const toneInstruction = TONE_INSTRUCTIONS[config.tone] ?? TONE_INSTRUCTIONS.formal;
  const structureInstruction = STRUCTURE_INSTRUCTIONS[config.structure] ?? STRUCTURE_INSTRUCTIONS.auto;

  const sourcesText = sources.length > 0
    ? sources.map((source, index) => (
      `[${index + 1}] ${source.title}
Nguồn: ${source.source || 'Google News'} | ${source.pubDate || 'Không rõ thời gian'}
Link: ${source.link}
Tóm tắt: ${source.snippet || 'Không có snippet'}`
    )).join('\n\n')
    : 'Không có nguồn tin, hãy viết như một bản tin tổng hợp chung và nêu rõ giới hạn thông tin.';

  const antiDuplicateBlock = `
## QUY TẮC CHỐNG TRÙNG NỘI DUNG (BẮT BUỘC)
- KHÔNG copy nguyên văn bất kỳ câu nào từ sources.
- Nếu có từ 2 nguồn trở lên, phải tổng hợp ít nhất 2 nguồn trong thân bài.
- Nếu chỉ có 1 nguồn, phải thêm phân tích hoặc góc nhìn riêng chiếm ít nhất 30% nội dung.
- Tiêu đề bài phải khác hoàn toàn với mọi tiêu đề sources.
- Mở bài bắt đầu bằng tình huống, số liệu, câu hỏi hoặc nhận định ngắn. KHÔNG mở bằng "Theo [nguồn]...".
- Cuối mỗi section chính, thêm 1-2 câu góc nhìn riêng hoặc tác động thực tế với người đọc.
`.trim();

  const antiAiBlock = `
## QUY TẮC VIẾT NHƯ NGƯỜI THẬT (BẮT BUỘC)
- Nhịp câu: xen kẽ câu 3-6 từ và câu 12-18 từ. KHÔNG viết 5 câu liên tiếp cùng độ dài.
- Mở đoạn: luân phiên số liệu, câu hỏi, nhận xét ngắn và ví dụ cụ thể.
- Ưu tiên số liệu thực từ sources như ngày, giờ, giá, phần trăm, số lượng.
- Không dùng các cụm như: "Không thể phủ nhận", "Nhìn chung", "Chính vì vậy", "Trong bối cảnh hiện nay".
- Kết bài bằng nhận định ngắn hoặc câu hỏi mở. KHÔNG dùng "Hy vọng thông tin hữu ích".
`.trim();

  return `
Bạn là News Writer Agent, chuyên viết tin tức chính xác, nhanh, dễ đọc và có góc nhìn riêng.

${brandPrompt}

## Thông tin bài viết
- Chủ đề / Từ khóa: ${config.keyword}
- Ngôn ngữ: ${config.language}
- Độ dài mục tiêu: ${config.targetLength} từ
- Cấu trúc: ${structureInstruction}
- Giọng văn: ${toneInstruction}

## Nguồn tin Google News
${sourcesText}

${antiDuplicateBlock}

${antiAiBlock}

## Quy tắc output
- Chỉ trả HTML hoàn chỉnh trong đúng 1 thẻ <article>.
- Phải có đúng 1 thẻ <h1> là tiêu đề bài.
- Mỗi phần chính dùng <h2>, nội dung là <p>, có thể dùng <ul><li> nếu hợp lý.
- Tổng số từ bám sát ${config.targetLength} từ, ưu tiên khoảng 400-800 từ.
- Có số liệu, ngày giờ, tên riêng nếu nguồn có cung cấp.
- Không thêm CSS, JavaScript, markdown fence hay lời giải thích ngoài bài.
- Không dùng các từ/cụm từ sau: ${forbidden}

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
    const parsed = streamSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Payload không hợp lệ' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { articleId, runId, config, sources } = parsed.data as {
      articleId: string;
      runId: string;
      config: NewsConfig;
      sources: NewsItem[];
    };

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
              contentType: `viet_tin_tuc:${config.structure}`,
              targetLength: config.targetLength,
              aiProvider: config.model,
              brandConfig: (config.brandConfig ?? {}) as never,
              selectedTitle: config.keyword,
              outline: {
                stage: 'generate',
                structure: config.structure,
                tone: config.tone,
                config,
                sources,
              } as never,
              status: 'WRITING',
            },
          });

          send({ type: 'step', step: 'generate', label: 'AI đang viết tin tức...' });

          const dbForbiddenConfig = await prisma.aIConfig.findFirst({
            where: { type: 'FORBIDDEN_WORDS', isActive: true },
            orderBy: { updatedAt: 'desc' },
          }).catch(() => null);
          const forbiddenList = buildForbiddenList(
            dbForbiddenConfig?.items ?? [],
            config.brandConfig?.forbiddenExtra,
          );
          const brandPrompt = await buildBrandPrompt(config.brandConfig);
          const prompt = buildNewsPrompt(config, sources, brandPrompt);

          const rawHtml = await generateHtml({
            prompt,
            modelId: config.model,
            onChunk: (chunk) => send({ type: 'chunk', text: chunk }),
          });

          send({ type: 'step_done', step: 'generate' });
          send({ type: 'step', step: 'analyze', label: 'Phân tích chất lượng...' });

          const html = sanitizeHtmlArticle(rawHtml, config.keyword);
          const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          const title = titleMatch
            ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
            : config.keyword;
          const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          const wordCount = countWords(html);
          const keywordDensity = computeKeywordDensity(html, config.keyword);
          const humanness = analyzeHumanness(html, forbiddenList, {
            minWords: 300,
            minSpecificDataHits: 2,
          });
          const metaDescription = buildMetaDescription(title, config.keyword);

          await prisma.article.update({
            where: { id: articleId },
            data: {
              selectedTitle: title,
              htmlContent: html,
              plainText,
              metaDescription,
              wordCount,
              status: 'WRITTEN',
              aiDecision: humanness.decision,
              humannessScore: humanness.score,
              seoChecks: { keywordDensity } as never,
              scoreBreakdown: { humanness, keywordDensity } as never,
              outline: {
                stage: 'generate',
                structure: config.structure,
                tone: config.tone,
                config,
                sources,
              } as never,
            },
          });

          send({ type: 'step_done', step: 'analyze' });
          send({
            type: 'done',
            data: {
              runId,
              html,
              title,
              metaDescription,
              wordCount,
              keywordDensity,
              humanness,
              sources,
            },
          });
        } catch (error) {
          await prisma.article.update({
            where: { id: articleId },
            data: { status: 'DRAFT' },
          }).catch(() => null);

          send({
            type: 'error',
            message: error instanceof Error ? error.message : 'Lỗi stream',
          });
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
