import { NextRequest } from 'next/server';
import { z } from 'zod';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { stripMarkdown } from '@/lib/viet-lai/post-process';

export const runtime = 'nodejs';

const STYLE_INSTRUCTIONS: Record<string, string> = {
  standard: 'Viết lại giữ nguyên nghĩa, đổi cách diễn đạt. Không thêm, không bớt ý.',
  creative: 'Viết lại sáng tạo hơn, có góc nhìn mới nhưng không lệch ý gốc.',
  structured: 'Viết lại dễ đọc hơn, chia nhịp rõ hơn, có thể thêm bullet nếu phù hợp.',
  shorten: 'Rút gọn bớt câu chữ thừa, giữ ý chính, output ngắn hơn rõ rệt.',
  expand: 'Mở rộng thêm ví dụ, ngữ cảnh hoặc chi tiết cần thiết, output dài hơn rõ rệt.',
  funny: 'Thêm sắc thái vui vẻ, nhẹ nhàng, vẫn giữ đúng thông tin.',
  friendly: 'Thân thiện, gần gũi, dễ đọc, dùng cách nói tự nhiên.',
  casual: 'Thoải mái như đang nói chuyện hằng ngày.',
  professional: 'Chuyên nghiệp, chính xác, súc tích.',
  rewrite_struct: 'Giữ nguyên ý, nhưng đổi hẳn cấu trúc câu và nhịp diễn đạt.',
  rewrite_persp: 'Chuyển góc nhìn hoặc chủ thể diễn đạt nếu phù hợp.',
  rewrite_kw: 'Tích hợp từ khóa xuất hiện tự nhiên hơn trong văn bản mới.',
  emoji: 'Có thể thêm emoji ở chỗ phù hợp, không lạm dụng.',
};

const paragraphSchema = z.object({
  originalText: z.string().min(1).max(50_000),
  style: z.string().default('standard'),
  language: z.string().default('Vietnamese'),
  model: z.string().default('gemini-flash'),
});

function buildParagraphPrompt(originalText: string, style: string, language: string): string {
  const styleInstruction = STYLE_INSTRUCTIONS[style] ?? STYLE_INSTRUCTIONS.standard;

  return `
Bạn là AI chuyên viết lại văn bản.

## Yêu cầu
- Ngôn ngữ đầu ra: ${language}
- Phong cách: ${styleInstruction}

## Văn bản gốc
${originalText}

## Quy tắc output
- Chỉ trả văn bản đã viết lại.
- Không giải thích, không nhận xét, không thêm tiêu đề.
- Không dùng markdown formatting như **, *, #.
- Trả plain text.
`.trim();
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = paragraphSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Dữ liệu không hợp lệ' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { originalText, style, language, model: modelId } = parsed.data;
    const prompt = buildParagraphPrompt(originalText, style, language);
    const model = buildTinhGonModel(modelId);

    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (data: object) =>
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));

        try {
          let rawOutput = '';

          try {
            const aiStream = await model.generateContentStream(prompt);
            for await (const chunk of aiStream) {
              const text = chunk.text();
              if (!text) continue;
              const clean = stripMarkdown(text);
              rawOutput += clean;
              enqueue({ type: 'chunk', text: clean });
            }
          } catch {
            const result = await model.generateContent(prompt);
            rawOutput = stripMarkdown(result.response.text());
            enqueue({ type: 'chunk', text: rawOutput });
          }

          enqueue({
            type: 'done',
            wordCount: rawOutput.split(/\s+/).filter(Boolean).length,
          });
        } catch (error) {
          enqueue({
            type: 'error',
            message: error instanceof Error ? error.message : 'Lỗi AI',
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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Lỗi server' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
