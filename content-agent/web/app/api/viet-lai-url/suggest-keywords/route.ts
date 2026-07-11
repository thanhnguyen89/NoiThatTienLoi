import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';

export const runtime = 'nodejs';

const schema = z.object({
  keyword: z.string().min(1),
  url: z.string().optional().default(''),
  language: z.string().default('Vietnamese'),
});

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = schema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Thiếu từ khóa' }, { status: 400 });
    }

    const { keyword, url, language } = parsed.data;
    const model = buildTinhGonModel('gemini-flash');
    const prompt = `
Tạo danh sách 6 từ khóa phụ liên quan chặt chẽ đến từ khóa chính: "${keyword}"
Ngôn ngữ: ${language}
${url ? `Ngữ cảnh tham khảo thêm từ URL: ${url}` : ''}

Yêu cầu:
- Từ khóa phụ phải đa dạng: biến thể ngữ nghĩa, long-tail, góc nhìn người đọc.
- Không lặp lại nguyên văn từ khóa chính quá nhiều lần.
- Mỗi dòng đúng 1 từ khóa.
- Chỉ trả danh sách, không giải thích.
`.trim();

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const keywords = text
      .split('\n')
      .map((line) => line.replace(/^[\d\-.*•]+\s*/, '').trim())
      .filter((item) => item.length > 2 && item.length < 120)
      .slice(0, 8);

    return NextResponse.json({ keywords });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Lỗi AI' },
      { status: 500 },
    );
  }
}
