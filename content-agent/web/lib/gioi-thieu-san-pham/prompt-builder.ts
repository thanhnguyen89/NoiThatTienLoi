import { buildBrandBlock, COMMON_FORBIDDEN_WORDS } from '@/lib/ecommerce-tools/core';

export interface ProductDescriptionConfig {
  productName: string;
  specs: string;
  keyBenefits: string;
  targetCustomer: string;
  length: 'short' | 'standard' | 'detailed';
  format: 'prose' | 'structured';
  tone: 'friendly' | 'professional' | 'persuasive' | 'casual';
  language: string;
  brandName?: string;
  forbidden?: string;
}

const LENGTH_WORDS: Record<ProductDescriptionConfig['length'], number> = {
  short: 150,
  standard: 250,
  detailed: 400,
};

const TONE_GUIDE: Record<ProductDescriptionConfig['tone'], string> = {
  friendly: 'Gần gũi, ấm áp, như tư vấn viên nội thất đang nói chuyện với khách.',
  professional: 'Rõ thông số, gọn, sạch, không cảm thán quá mức.',
  persuasive: 'Có hook, nói pain point, lợi ích và CTA rõ.',
  casual: 'Đời thường, dễ đọc trên sàn TMĐT và mobile.',
};

export function buildProductDescriptionPrompt(config: ProductDescriptionConfig): string {
  const extraForbidden = config.forbidden
    ? config.forbidden.split(',').map((item) => item.trim()).filter(Boolean)
    : [];

  return `
Bạn là chuyên gia viết mô tả sản phẩm nội thất ecommerce.

Thông tin sản phẩm:
- Tên: ${config.productName}
- Thông số/chất liệu/kích thước: ${config.specs}
- Lợi ích/điểm bán hàng: ${config.keyBenefits}
- Khách hàng mục tiêu: ${config.targetCustomer}
${buildBrandBlock({ brandName: config.brandName, forbidden: config.forbidden })}

Giọng văn: ${config.tone}
${TONE_GUIDE[config.tone]}

Ngôn ngữ: ${config.language}
Độ dài: khoảng ${LENGTH_WORDS[config.length]} từ, sai số tối đa 20%.
Format: ${config.format === 'structured' ? 'HTML gọn với <h3>, <p>, <ul><li>' : 'đoạn văn plain text, không heading/bullet'}

Quy tắc:
- Không dùng: ${[...COMMON_FORBIDDEN_WORDS, ...extraForbidden].join(', ')}
- Không bịa thêm số liệu.
- Không mở đầu bằng "Sản phẩm này..." hoặc "Đây là...".
- Kết bài có CTA cụ thể.

Viết ngay nội dung output, không giải thích.
`.trim();
}
