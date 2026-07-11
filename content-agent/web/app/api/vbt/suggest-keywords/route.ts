import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { extractJsonValue } from '@/lib/viet-bai-thong-minh/server';

export const runtime = 'nodejs';
export const maxDuration = 15;

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json() as {
      keyword?: string;
      contentType?: string;
      language?: string;
    };

    const keyword = body.keyword?.trim() || '';
    if (!keyword) {
      return NextResponse.json({ suggestions: [] });
    }

    const prompt = `
Gợi ý 8 keyword phụ (secondary keywords) cho bài viết SEO.

Keyword chính: ${keyword}
Loại nội dung: ${body.contentType || 'blog_seo'}
Ngôn ngữ: ${body.language || 'Vietnamese'}

Yêu cầu:
- Keyword phụ phải liên quan trực tiếp đến keyword chính.
- Ưu tiên long-tail keywords từ 3-5 từ.
- Bao gồm nhóm câu hỏi, so sánh, cách chọn, giá cả, đánh giá nếu phù hợp.
- Không lặp lại đúng nguyên keyword chính.

Trả về JSON array string[], ví dụ: ["keyword a", "keyword b"].
Không giải thích thêm.
    `.trim();

    const model = buildTinhGonModel('gemini-flash');
    const result = await model.generateContent(prompt);
    const parsed = extractJsonValue(result.response.text());
    const suggestions = Array.isArray(parsed)
      ? parsed.map((item) => String(item).trim()).filter(Boolean)
      : [];

    return NextResponse.json({
      suggestions: suggestions
        .filter((item) => item.toLowerCase() !== keyword.toLowerCase())
        .slice(0, 8),
    });
  } catch (error) {
    const status = error instanceof Error && error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json(
      { suggestions: [], error: status === 401 ? 'Chưa được xác thực.' : 'Không thể gợi ý từ khóa.' },
      { status },
    );
  }
}
