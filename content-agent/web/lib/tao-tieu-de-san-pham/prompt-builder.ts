import { buildBrandBlock } from '@/lib/ecommerce-tools/core';

export interface ProductMetaConfig {
  productName: string;
  productFeatures: string;
  tone: string;
  language: string;
  brandName?: string;
  forbidden?: string;
}

const TONE_INSTRUCTIONS: Record<string, string> = {
  seo_focus: 'Đặt keyword chính lên đầu, ngắn gọn, đúng chuẩn SERP 50-60 ký tự.',
  persuasive: 'Có hook bán hàng nhẹ, nhấn lợi ích và lý do nên click.',
  friendly: 'Gần gũi, tự nhiên, như tư vấn viên thật sự.',
  professional: 'Chuyên nghiệp, rõ thông số, ít cảm thán.',
  luxury: 'Tinh tế, cao cấp, tránh phóng đại quá mức.',
  bold: 'Mạnh mẽ, dễ nhớ, có thể dùng số liệu nếu có.',
  engaging: 'Tạo curiosity gap hợp lý, tăng CTR nhưng không giật tít.',
  confident: 'Khẳng định rõ, tránh từ mơ hồ như có thể/có lẽ.',
  direct: 'Đi thẳng vào loại sản phẩm và lợi ích chính.',
  casual: 'Đời thường, dễ đọc trên mobile.',
};

export function buildProductMetaPrompt(config: ProductMetaConfig): string {
  return `
Bạn là chuyên gia SEO ecommerce cho sản phẩm nội thất.

Sản phẩm:
- Tên sản phẩm: ${config.productName}
- Mô tả/tính năng/chất liệu: ${config.productFeatures}
${buildBrandBlock({ brandName: config.brandName, forbidden: config.forbidden })}

Phong cách: ${config.tone}
${TONE_INSTRUCTIONS[config.tone] ?? TONE_INSTRUCTIONS.seo_focus}

Ngôn ngữ output: ${config.language}

Yêu cầu:
- Tạo đúng 5 meta title khác nhau.
- Mỗi title 50-60 ký tự, không vượt 60 nếu có thể.
- Title phải có keyword chính hoặc loại sản phẩm.
- Tạo đúng 1 meta description 150-160 ký tự, có keyword + lợi ích + CTA nhẹ.
- Không bịa thông số không có trong input.
- Không dùng các từ cấm nếu đã cung cấp.

Trả về JSON hợp lệ duy nhất, không markdown:
{
  "titles": ["title 1", "title 2", "title 3", "title 4", "title 5"],
  "description": "meta description"
}
`.trim();
}
