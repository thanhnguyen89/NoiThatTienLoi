import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';

export const runtime = 'nodejs';

const schema = z.object({
  keyword: z.string().min(1).max(200),
  topN: z.number().min(5).max(15).default(10),
  language: z.string().default('Vietnamese'),
});

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = schema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const { keyword, topN, language } = parsed.data;
    const model = buildTinhGonModel('gemini-flash');
    const prompt = `
Gợi ý ${topN} từ khoá phụ cho bài Toplist với từ khoá chính: "${keyword}"
Ngôn ngữ: ${language}

Mỗi từ khoá phụ là tên 1 item sẽ xuất hiện trong danh sách Top ${topN}.
Ví dụ nếu keyword là "giường sắt giá rẻ":
→ giường sắt 1m2 khung hộp, giường sắt 1m4 chân cao, giường sắt 1m6 kéo ra, giường sắt 2 tầng trẻ em...

Yêu cầu:
- Trả đúng ${topN} gợi ý
- Mỗi gợi ý trên 1 dòng, KHÔNG đánh số
- Gợi ý cụ thể, phân biệt rõ, không trùng lặp
- Phù hợp search intent người mua
- Chỉ trả danh sách, không thêm giải thích
`.trim();

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const keywords = raw
      .split('\n')
      .map((line) => line.replace(/^[-*•\d.]\s*/, '').trim())
      .filter((line) => line.length > 0)
      .slice(0, topN);

    return NextResponse.json({ keywords });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
