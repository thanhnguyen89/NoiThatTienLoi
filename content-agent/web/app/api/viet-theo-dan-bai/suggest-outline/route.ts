import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { parseOutline } from '@/lib/viet-theo-dan-bai/outline-parser';

export const runtime = 'nodejs';

const schema = z.object({
  keyword: z.string().min(1).max(200),
  language: z.string().default('Vietnamese'),
});

function buildSuggestPrompt(keyword: string, language: string): string {
  return `
Tạo dàn bài SEO cho bài viết về: "${keyword}"
Ngôn ngữ: ${language}

Yêu cầu:
- 6–10 heading (mix h2 và h3)
- Format: [h2] Tiêu đề chính / [h3] Tiêu đề phụ
- Bao phủ search intent: thông tin, so sánh, hướng dẫn, lời khuyên
- Không nhồi keyword, viết tự nhiên như mục lục sách
- Chỉ trả danh sách heading, không thêm giải thích

Ví dụ format:
[h2] Tại sao nên chọn giường sắt khung vuông?
[h3] Độ bền khung 1.4mm so với 1.2mm
[h3] Chi phí bảo trì dài hạn
[h2] Kích thước nào phù hợp phòng ngủ nhỏ?
`.trim();
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = schema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const { keyword, language } = parsed.data;
    const model = buildTinhGonModel('gemini-flash');
    const result = await model.generateContent(buildSuggestPrompt(keyword, language));
    let outline = result.response.text().trim();

    if (!/\[h[23]\]/i.test(outline)) {
      outline = outline
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `[h2] ${line.replace(/^[-*•]\s*/, '')}`)
        .join('\n');
    }

    const headings = parseOutline(outline);
    return NextResponse.json({ outline, headings });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
