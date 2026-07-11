import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { buildBrandPrompt } from '@/app/api/pipeline/_context';
import { buildForbiddenList, mergeForbiddenWords } from '@/lib/tinh-gon/forbidden';
import { analyzeHumanness } from '@/lib/tinh-gon/humanness';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildPlainTextFromHtml } from '@/lib/tinh-gon/persistence';
import { buildMetaDescription, computeKeywordDensity, countWords, sanitizeHtmlArticle } from '@/lib/tinh-gon/text';
import type { SourceConfig, SourceItem } from '@/lib/viet-theo-nguon/types';

export const runtime = 'nodejs';

const STRUCTURE_INSTRUCTIONS: Record<string, string> = {
  auto: 'AI tự quyết định cấu trúc phù hợp nhất với nội dung nguồn.',
  inverted_pyramid: 'Cấu trúc Kim tự tháp: thông tin quan trọng nhất ở đầu, chi tiết phụ ở dưới.',
  storytelling: 'Trình tự thời gian: dẫn dắt từ bối cảnh đến diễn biến và kết quả.',
  qa: 'Dạng hỏi & đáp: mỗi H2 là một câu hỏi, nội dung trả lời chi tiết.',
  how_to: 'Hướng dẫn từng bước: đánh số Step 1, 2, 3..., dễ thực hành ngay.',
  pro_con: 'Nêu ưu và nhược điểm cụ thể, kết luận rõ ràng.',
  historical: 'Trình bày theo dòng thời gian từ quá khứ đến hiện tại.',
  listicle: 'Dạng danh sách: mỗi H2 là một mục, có thể thêm số thứ tự trong tiêu đề.',
  profile: 'Bài về một đối tượng: giới thiệu, chi tiết, đánh giá.',
  review: 'Đánh giá đa chiều: tổng quan, thông số, ưu điểm, nhược điểm, kết luận.',
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  intimate: 'Giọng thân mật, gần gũi như tạp chí. Dùng "bạn".',
  formal: 'Giọng trang trọng, nghiêm túc. Dùng "quý độc giả" hoặc "bạn đọc".',
  friendly: 'Giọng ấm áp, thân thiện. Dùng "bạn".',
  expert: 'Giọng chuyên môn, có số liệu và phân tích sâu.',
  humorous: 'Giọng vui vẻ, được phép dùng ẩn dụ hài.',
  inspirational: 'Giọng truyền cảm hứng, tích cực.',
  nostalgic: 'Giọng hoài cổ, gợi nhớ, cảm xúc.',
  shocking: 'Giọng kịch tính, mở bài mạnh, thu hút ngay.',
  conversational: 'Giọng trò chuyện, như bạn bè nói chuyện.',
};

function buildOutlineInstruction(config: SourceConfig, outline: string): string {
  if (config.outlineMode === 'none') {
    return 'Bài viết không cần outline cứng. AI tự chọn cấu trúc phù hợp. Độ dài khoảng 1.000–1.500 từ.';
  }

  if (config.outlineMode === 'custom' || config.outlineMode === 'ai') {
    return `## Dàn ý bắt buộc thực hiện\n\n${outline}\n\nThực hiện đúng thứ tự các heading. Không thêm hoặc bỏ bớt.`;
  }

  return '';
}

function buildSourcesBlock(sources: SourceItem[]): string {
  const validSources = sources.filter((source) => !source.error && source.content.length > 50);

  if (validSources.length === 0) {
    return '## Nguồn tham khảo\nKhông có nguồn URL. AI dùng kiến thức sẵn có.';
  }

  const lines = validSources.map((source, index) => {
    const tag = source.isUnique
      ? '[UNIQUE — dùng trực tiếp, có thể trích dẫn ý tưởng]'
      : '[DUPLICATE — BẮT BUỘC viết lại hoàn toàn, không copy câu nào]';

    return `### Nguồn ${index + 1}: ${source.title} ${source.isManual ? '(thủ công)' : `(${source.url})`}
${tag}
${source.content.slice(0, 2000)}${source.content.length > 2000 ? '\n...(còn nữa)' : ''}`;
  });

  return `## Nguồn tham khảo (${validSources.length} nguồn)\n\n${lines.join('\n\n---\n\n')}`;
}

function buildStreamPrompt(
  config: SourceConfig,
  sources: SourceItem[],
  outline: string,
  brandPrompt: string,
): string {
  const forbidden = mergeForbiddenWords(config.brandConfig?.forbiddenExtra).join(', ');
  const structureInstruction = STRUCTURE_INSTRUCTIONS[config.structure] ?? STRUCTURE_INSTRUCTIONS.auto;
  const toneInstruction = TONE_INSTRUCTIONS[config.tone] ?? TONE_INSTRUCTIONS.formal;

  return `
Bạn là Writer Agent, chuyên viết bài SEO chất lượng cao dựa trên nguồn tham khảo.

${brandPrompt}

## Thông tin đầu vào
- Từ khóa chính: ${config.keyword}
- Từ khóa phụ: ${config.secondaryKeywords.join(', ') || 'không có'}
- Ngôn ngữ: ${config.language}
- Cấu trúc: ${structureInstruction}
- Giọng văn: ${toneInstruction}

${buildOutlineInstruction(config, outline)}

${buildSourcesBlock(sources)}

## Quy tắc output
- Chỉ trả HTML hoàn chỉnh trong một thẻ <article>.
- Có đúng 1 thẻ <h1>, mỗi section là <h2>, có thể có <h3> bên trong.
- Không thêm CSS, JavaScript, markdown fence hay lời giải thích ngoài bài.
- Từ khóa "${config.keyword}" xuất hiện tự nhiên, mật độ 1.0–1.5%.
- Không dùng các từ sau: ${forbidden || 'không có từ cấm riêng'}

## Quy tắc xử lý nguồn (BẮT BUỘC)
- Nguồn [UNIQUE]: học ý tưởng, số liệu, có thể paraphrase nhẹ.
- Nguồn [DUPLICATE]: TUYỆT ĐỐI không copy nguyên văn dù chỉ 1 câu.
- Tổng hợp ít nhất 2 nguồn nếu có. Thêm góc nhìn thương hiệu chiếm khoảng 20% nội dung.
- Tiêu đề bài PHẢI khác hoàn toàn với tất cả tiêu đề nguồn.
- Mở bài KHÔNG bắt đầu bằng "Theo [nguồn]..." mà mở bằng tình huống, số liệu hoặc câu hỏi.

## Viết như người thật (chống AI detection — BẮT BUỘC)
- Nhịp câu xen kẽ câu ngắn 3–6 từ và câu trung bình 12–18 từ.
- Không để 5 câu liên tiếp cùng độ dài.
- Mở đoạn luân phiên: số liệu, câu hỏi, nhận xét, ví dụ thực tế.
- Dùng số liệu thực (mm, kg, năm, giá) thay tính từ mơ hồ.
- Không dùng: "không chỉ X mà còn Y", "Nhìn chung", "Không thể phủ nhận", "Chính vì vậy", "Bên cạnh đó", "Đáng chú ý là".
- Kết bài bằng nhận định ngắn thực tế hoặc CTA cụ thể, KHÔNG dùng "Hy vọng bài viết hữu ích".

Chỉ trả HTML.
`.trim();
}

function replaceFirstOutsideTags(input: string, pattern: RegExp, replacer: (value: string) => string): string {
  let done = false;

  return input
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (done || part.startsWith('<')) return part;
      return part.replace(pattern, (value) => {
        done = true;
        return replacer(value);
      });
    })
    .join('');
}

function applySeoOptions(html: string, config: SourceConfig): string {
  let result = html;

  if (config.seoOptions.boldKeyword && config.keyword) {
    const escaped = config.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let done = false;
    result = result.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (match, attrs, content) => {
      if (done) return match;
      const nextContent = replaceFirstOutsideTags(content, new RegExp(escaped, 'i'), (value) => `<strong>${value}</strong>`);
      if (nextContent !== content) done = true;
      return `<p${attrs}>${nextContent}</p>`;
    });
  }

  if (config.seoOptions.mainLink?.trim() && config.keyword) {
    const escaped = config.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const link = config.seoOptions.mainLink.trim();
    let done = false;
    result = result.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (match, attrs, content) => {
      if (done) return match;
      const nextContent = replaceFirstOutsideTags(
        content,
        new RegExp(`\\b(${escaped})\\b`, 'i'),
        (value) => `<a href="${link}" title="${config.keyword}">${value}</a>`,
      );
      if (nextContent !== content) done = true;
      return `<p${attrs}>${nextContent}</p>`;
    });
  }

  if (config.seoOptions.keywordLinks?.trim()) {
    const pairs = config.seoOptions.keywordLinks
      .split('\n')
      .map((line) => {
        const [keyword, url] = line.split('|').map((part) => part.trim());
        return { keyword, url };
      })
      .filter((pair) => pair.keyword && pair.url);

    for (const { keyword, url } of pairs) {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let done = false;
      result = result.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (match, attrs, content) => {
        if (done) return match;
        const nextContent = replaceFirstOutsideTags(
          content,
          new RegExp(`\\b(${escaped})\\b`, 'i'),
          (value) => `<a href="${url}">${value}</a>`,
        );
        if (nextContent !== content) done = true;
        return `<p${attrs}>${nextContent}</p>`;
      });
    }
  }

  if (config.seoOptions.boldHeading) {
    result = result
      .replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, '<h2$1><strong>$2</strong></h2>')
      .replace(/<h3([^>]*)>([\s\S]*?)<\/h3>/gi, '<h3$1><strong>$2</strong></h3>');
  }

  if (config.seoOptions.footerContent?.trim()) {
    result = result.replace(/<\/article>$/i, `${config.seoOptions.footerContent.trim()}\n</article>`);
  }

  return result;
}

function sseEvent(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

const streamSchema = z.object({
  articleId: z.string(),
  runId: z.string(),
  config: z.record(z.unknown()),
  sources: z.array(z.record(z.unknown())).default([]),
  outline: z.string().optional().default(''),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const rawBody = await request.json();
    const parsed = streamSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Payload không hợp lệ' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { articleId, runId, outline } = parsed.data;
    const config = parsed.data.config as unknown as SourceConfig;
    const sources = parsed.data.sources as unknown as SourceItem[];

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
          await prisma.article.update({
            where: { id: articleId },
            data: {
              status: 'WRITING',
              keyword: config.keyword,
              language: config.language,
              contentType: `viet_theo_nguon:${config.structure}`,
              targetLength: config.targetLength,
              aiProvider: config.model,
              brandConfig: (config.brandConfig ?? {}) as never,
              outline: {
                stage: 'generate',
                config,
                sources,
                outline,
              } as never,
            },
          });

          const dbForbiddenConfig = await prisma.aIConfig.findFirst({
            where: { type: 'FORBIDDEN_WORDS', isActive: true },
            orderBy: { updatedAt: 'desc' },
          }).catch(() => null);
          const forbiddenList = buildForbiddenList(
            dbForbiddenConfig?.items ?? [],
            config.brandConfig?.forbiddenExtra,
          );

          const brandPrompt = await buildBrandPrompt(config.brandConfig);
          const prompt = buildStreamPrompt(config, sources, outline, brandPrompt);
          const model = buildTinhGonModel(config.model);

          send({ type: 'step', step: 'writing', label: 'AI đang viết bài theo nguồn...' });

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
          send({ type: 'step', step: 'scoring', label: 'Đang chấm điểm và tối ưu SEO...' });

          let html = sanitizeHtmlArticle(rawHtml, config.keyword);
          html = applySeoOptions(html, config);
          const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          const title = titleMatch
            ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
            : config.keyword;
          const plainText = buildPlainTextFromHtml(html);
          const wordCount = countWords(html);
          const keywordDensity = computeKeywordDensity(html, config.keyword);
          const humanness = analyzeHumanness(html, forbiddenList, {
            minWords: 1000,
            minSpecificDataHits: 2,
          });
          const metaDescription = buildMetaDescription(title, config.keyword);

          await prisma.article.update({
            where: { id: articleId },
            data: {
              selectedTitle: title,
              htmlContent: html,
              plainText,
              wordCount,
              metaDescription,
              status: 'WRITTEN',
              aiDecision: humanness.decision,
              humannessScore: humanness.score,
              seoChecks: { keywordDensity } as never,
              scoreBreakdown: { humanness, keywordDensity } as never,
              outline: {
                stage: 'generate',
                config,
                sources,
                outline,
              } as never,
            },
          });

          send({ type: 'step_done', step: 'scoring' });
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
