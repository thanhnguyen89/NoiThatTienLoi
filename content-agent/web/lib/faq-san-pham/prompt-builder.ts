import { buildBrandBlock } from '@/lib/ecommerce-tools/core';

export type FaqType = 'general' | 'technical' | 'purchase';

export interface FaqConfig {
  productName: string;
  specs: string;
  useCase: string;
  commonConcerns: string;
  faqTypes: FaqType[];
  count: 5 | 7 | 10;
  language: string;
  brandName?: string;
  shopPhone?: string;
  shopAddress?: string;
}

const TYPE_GUIDE: Record<FaqType, string> = {
  general: 'Hỏi về sản phẩm phù hợp ai, độ bền, lắp ráp, màu sắc, cách dùng.',
  technical: 'Hỏi về kích thước, chất liệu, tải trọng, bảo dưỡng, an toàn. Chỉ dùng số liệu đã cung cấp.',
  purchase: 'Hỏi về giao hàng, bảo hành, đổi trả, thanh toán. Dùng hotline/địa chỉ nếu có.',
};

export function buildFaqPrompt(config: FaqConfig): string {
  const types: FaqType[] = config.faqTypes.length ? config.faqTypes : ['general'];

  return `
Bạn là chuyên gia ecommerce. Tạo FAQ cho sản phẩm nội thất.

Thông tin sản phẩm:
- Tên: ${config.productName}
- Thông số: ${config.specs}
- Bối cảnh dùng: ${config.useCase}
- Khách hay băn khoăn: ${config.commonConcerns}
${buildBrandBlock({
    brandName: config.brandName,
    shopPhone: config.shopPhone,
    shopAddress: config.shopAddress,
  })}

Loại câu hỏi cần tạo:
${types.map((type) => `- ${type}: ${TYPE_GUIDE[type]}`).join('\n')}

Ngôn ngữ: ${config.language}

Yêu cầu:
- Tạo đúng ${config.count} cặp Q&A.
- Câu hỏi tự nhiên như người mua thật hỏi.
- Câu trả lời cụ thể, 2-5 câu, không nói chung chung.
- Không dùng: quan trọng, vô cùng, cực kỳ, siêu phẩm, hoàn hảo.

Trả về JSON hợp lệ duy nhất, không markdown:
{
  "faqs": [
    { "question": "câu hỏi", "answer": "câu trả lời", "type": "general" }
  ]
}
`.trim();
}
