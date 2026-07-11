import { NextRequest, NextResponse } from 'next/server';
import { buildGeminiModel } from '../_gemini';

export async function POST(request: NextRequest) {
  try {
    const { title, keyword, currentMeta } = await request.json();

    if (!title?.trim() || !keyword?.trim()) {
      return NextResponse.json({ success: false, error: 'Thiếu title hoặc keyword' }, { status: 400 });
    }

    const model = buildGeminiModel('flash');

    const prompt = `Bạn là chuyên gia SEO cho thương hiệu nội thất Việt Nam.

Viết 1 meta description cho bài blog SEO với các thông tin sau:
- Tiêu đề bài: "${title}"
- Từ khóa chính: "${keyword}"
${currentMeta ? `- Meta hiện tại (để tham khảo): "${currentMeta}"` : ''}

Yêu cầu bắt buộc:
- Độ dài: 140–160 ký tự (đếm chính xác)
- Phải chứa từ khóa chính: "${keyword}"
- Giọng văn chân thật, tự nhiên — không AI-fluff, không sáo rỗng
- Có CTA nhẹ cuối câu (vd: "xem ngay", "tư vấn miễn phí", "giao nhanh toàn quốc")
- Không dùng: "tuyệt vời", "hoàn hảo", "số 1", "đẳng cấp", "vô cùng", "cực kỳ"
- Không bắt đầu bằng: "Trong bài viết này", "Bạn có biết", "Ngày nay"
- Xưng thương hiệu là "Minh Quân" hoặc "Nội Thất Minh Quân"

Chỉ trả về đúng 1 đoạn meta description, không giải thích, không dùng dấu ngoặc kép bao ngoài.`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    // Strip quotes nếu AI bọc trong dấu ngoặc
    const meta = raw.replace(/^["']|["']$/g, '').trim().slice(0, 160);

    if (!meta) {
      return NextResponse.json({ success: false, error: 'AI không trả về kết quả' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { meta } });

  } catch (error) {
    console.error('[rewrite-meta] Error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
