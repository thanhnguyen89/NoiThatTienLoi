import { NextRequest, NextResponse } from 'next/server';
import { buildGeminiModel } from '../_gemini';

export async function POST(request: NextRequest) {
  try {
    const { html, keyword, currentCount, wordCount } = await request.json();

    if (!html?.trim() || !keyword?.trim()) {
      return NextResponse.json({ success: false, error: 'Thiếu html hoặc keyword' }, { status: 400 });
    }

    const density     = wordCount > 0 ? (currentCount / wordCount) * 100 : 0;
    const targetCount = Math.round(wordCount * 0.012); // nhắm 1.2%
    const needMore    = Math.max(0, targetCount - currentCount);

    if (needMore === 0) {
      return NextResponse.json({ success: true, data: { html, changed: false } });
    }

    const model = buildGeminiModel('flash');

    const prompt = `Bạn là chuyên gia SEO content editor người Việt.

Bài viết dưới đây có từ khóa chính "${keyword}" xuất hiện ${currentCount} lần trong ${wordCount} từ (mật độ ${density.toFixed(2)}%).

Mục tiêu: tăng mật độ lên 1.0–1.5% bằng cách thêm tự nhiên khoảng ${needMore} lần đề cập nữa.

Quy tắc bắt buộc:
1. Chỉ thêm từ khóa vào những chỗ CỰC KỲ tự nhiên — đọc không thấy khác gì so với bản gốc
2. Có thể thêm vào đầu/cuối đoạn văn, hoặc thay thế một cụm từ đồng nghĩa trong câu
3. KHÔNG thêm liên tục nhiều lần trong 1 đoạn
4. KHÔNG thay đổi tiêu đề (h1, h2, h3)
5. KHÔNG xóa, thêm đoạn hoặc thay đổi ý nghĩa bài
6. KHÔNG dùng từ cấm: "tuyệt vời", "hoàn hảo", "siêu phẩm", "vô cùng", "cực kỳ"
7. Giữ nguyên tất cả thẻ HTML, class, style
8. Chỉ trả về HTML đầy đủ, không giải thích, không markdown

HTML bài viết:
${html}`;

    const result = await model.generateContent(prompt);
    let fixed = result.response.text().trim();

    // Strip markdown code fences nếu AI wrap
    fixed = fixed.replace(/^```html?\s*/i, '').replace(/\s*```$/, '').trim();

    if (!fixed || fixed.length < html.length * 0.5) {
      return NextResponse.json({ success: false, error: 'AI không trả về HTML hợp lệ' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { html: fixed, changed: true, needMore } });

  } catch (error) {
    console.error('[fix-density] Error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
