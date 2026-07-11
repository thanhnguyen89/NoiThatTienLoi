import { NextRequest, NextResponse } from 'next/server';
import { buildBrandPrompt } from '@/app/api/pipeline/_context';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { aiEditRequestSchema } from '@/lib/tinh-gon/schema';

export const runtime = 'nodejs';

const COMMAND_INSTRUCTIONS = {
  shorten: 'Rút gọn đoạn văn khoảng 25-35%, giữ nguyên ý chính và thông tin quan trọng.',
  expand: 'Mở rộng đoạn văn bằng chi tiết cụ thể, ví dụ thực tế hoặc số liệu gần gũi.',
  humanize: 'Viết lại theo giọng người thật hơn: câu ngắn hơn, tự nhiên hơn, đỡ bóng bẩy.',
  more_spec: 'Bổ sung chi tiết cụ thể như kích thước, thời gian, giá, điều kiện áp dụng nếu phù hợp.',
  stronger_cta: 'Biến phần kết thành CTA rõ và thực tế hơn, tránh quá sale.',
  rewrite: 'Viết lại hoàn toàn cùng ý chính nhưng đổi nhịp câu và cách diễn đạt.',
} as const;

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = aiEditRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload không hợp lệ', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { selectedText, command, context } = parsed.data;
    const brandPrompt = await buildBrandPrompt(context.brandConfig);
    const model = buildTinhGonModel(context.model || 'gemini-flash');

    const prompt = `
${brandPrompt}

## Nhiệm vụ chỉnh sửa
- Từ khóa chủ đề: "${context.keyword}"
- Mục tiêu: ${COMMAND_INSTRUCTIONS[command]}

Đoạn gốc:
${selectedText}

Quy tắc:
- Giữ đúng ý chính của đoạn.
- Trả về HTML thuần cho đúng phần đoạn, ưu tiên <p>, <strong>, <ul><li> khi cần.
- Không thêm lời giải thích.

Chỉ trả nội dung đã chỉnh.
`.trim();

    const result = await model.generateContent(prompt);
    const editedText = result.response.text().replace(/```html/gi, '').replace(/```/g, '').trim();

    return NextResponse.json({ editedText });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
