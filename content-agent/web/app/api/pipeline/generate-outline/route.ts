import { NextRequest } from 'next/server';
import { buildGeminiModel } from '../_gemini';

export async function POST(request: NextRequest) {
  try {
    const { keyword, language, tone } = await request.json();

    if (!keyword?.trim()) {
      return new Response(JSON.stringify({ error: 'Thiếu từ khóa' }), { status: 400 });
    }

    const model = buildGeminiModel('flash');

    const toneGuide: Record<string, string> = {
      seo_basic:   'SEO cơ bản, tập trung từ khóa',
      seo_extend:  'SEO mở rộng, có ví dụ và so sánh',
      seo_long:    'SEO long form, đầy đủ và chuyên sâu',
      how_to:      'Hướng dẫn từng bước',
      listicle:    'Danh sách Top N',
      comparison:  'So sánh A vs B',
      review:      'Đánh giá sản phẩm',
      friendly:    'Thân thiện, tự nhiên',
      newspaper:   'Văn phong báo chí, tường thuật',
    };

    const prompt = `Bạn là SEO Architect. Tạo dàn ý bài viết ${language} theo format [h2][h3] cho từ khóa: "${keyword}"

Phong cách: ${toneGuide[tone] ?? tone}

Yêu cầu:
- 5-7 mục [h2] chính
- Mỗi [h2] có 1-2 [h3] con
- Mục cuối là [h2] Câu hỏi thường gặp với 3 [h3] câu hỏi thực tế
- Heading ngắn gọn, rõ ràng, chứa từ khóa tự nhiên
- KHÔNG đánh số thứ tự vào heading
- KHÔNG viết nội dung, chỉ viết heading

Format output (chỉ trả text, không markdown, không giải thích):
[h2] Heading chính
[h3] Heading phụ
[h2] Heading chính
...`;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await model.generateContentStream(prompt);

          for await (const chunk of result) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(`data: ${text}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
          controller.enqueue(encoder.encode(`data: [ERROR] ${msg}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Lỗi server';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
