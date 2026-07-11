import { NextRequest } from 'next/server';
import { z } from 'zod';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';

export const runtime = 'nodejs';

const COMMAND_PROMPTS: Record<string, (text: string, keyword: string, freePrompt?: string) => string> = {
  explain: (text) => `Giải thích rõ hơn đoạn văn sau bằng ngôn ngữ dễ hiểu, thêm ví dụ cụ thể:\n\n${text}`,
  title: (text, keyword) => `Đề xuất 5 tiêu đề hấp dẫn cho đoạn nội dung về "${keyword}" sau:\n\n${text}`,
  outline: (text, keyword) => `Tạo outline 5-8 heading (H2/H3) từ nội dung về "${keyword}":\n\n${text}\n\nFormat: mỗi dòng [h2] hoặc [h3] + text.`,
  shorten: (text) => `Rút ngắn đoạn văn sau còn khoảng 50% độ dài, giữ ý chính:\n\n${text}`,
  rewrite: (text, keyword) => `Viết lại đoạn văn sau theo phong cách tự nhiên hơn, tránh giọng AI. Keyword: "${keyword}":\n\n${text}`,
  humanize: (text, keyword) => `Humanize đoạn văn sau theo brand voice Nội Thất Minh Quân. Keyword: "${keyword}".
Quy tắc:
- Giọng: chân thật, chuyên nghiệp, gần gũi
- Câu ngắn xen câu dài (7-18 từ), không đều nhịp
- Giữ nguyên số liệu, ý chính và thông tin gốc
- Không dùng cụm quá máy móc hoặc marketing phô trương
Chỉ trả về đoạn văn đã viết lại:

${text}`,
  list: (text) => `Chuyển nội dung sau thành danh sách HTML <ul><li> rõ ràng:\n\n${text}`,
  pros_cons: (text, keyword) => `Liệt kê ưu điểm và nhược điểm dựa trên nội dung về "${keyword}" sau, format HTML:\n\n${text}`,
  intro: (_, keyword) => `Viết đoạn mở bài hấp dẫn (3-5 câu) cho bài viết về: "${keyword}"`,
  conclusion: (_, keyword) => `Viết đoạn kết bài thực tế (3-5 câu) cho bài viết về: "${keyword}". CTA cụ thể, không dùng "Hy vọng bài viết hữu ích".`,
  faqs: (text, keyword) => `Tạo 5 câu hỏi FAQ (với câu trả lời ngắn 2-3 câu) dựa trên nội dung về "${keyword}":\n\n${text}`,
  ask: (text, keyword, freePrompt) => `${freePrompt}\n\nNgữ cảnh (keyword: "${keyword}"):\n${text}`,
};

const schema = z.object({
  command: z.string(),
  text: z.string().max(3000),
  keyword: z.string().max(200),
  model: z.string().default('gemini-flash'),
  freePrompt: z.string().max(500).optional(),
});

function sseChunk(controller: ReadableStreamDefaultController, text: string) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`));
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = schema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Payload không hợp lệ' }), { status: 400 });
    }

    const { command, text, keyword, model, freePrompt } = parsed.data;
    const promptBuilder = COMMAND_PROMPTS[command] ?? COMMAND_PROMPTS.ask;
    const prompt = promptBuilder(text, keyword, freePrompt);
    const aiModel = buildTinhGonModel(model);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const aiStream = await aiModel.generateContentStream(prompt);
          for await (const chunk of aiStream) {
            const nextText = chunk.text();
            if (nextText) sseChunk(controller, nextText);
          }
        } catch {
          const result = await aiModel.generateContent(prompt);
          sseChunk(controller, result.response.text());
        } finally {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`));
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
  } catch {
    return new Response(JSON.stringify({ error: 'Lỗi server' }), { status: 500 });
  }
}
