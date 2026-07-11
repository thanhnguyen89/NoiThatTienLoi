import { buildBrandBlock } from '@/lib/ecommerce-tools/core';

export interface ProductNameConfig {
  productType: string;
  material: string;
  keyFeatures: string;
  targetCustomer: string;
  priceSegment: 'budget' | 'mid' | 'premium';
  language: string;
  brandName?: string;
  forbidden?: string;
}

const PRICE_CONTEXT: Record<ProductNameConfig['priceSegment'], string> = {
  budget: 'Giá bình dân, nhấn giá trị đồng tiền, phù hợp người cần tiết kiệm.',
  mid: 'Cân bằng chất lượng và giá, không quá rẻ tiền và không quá premium.',
  premium: 'Chất lượng cao, bền, tinh tế, khách hàng sẵn sàng chi hơn.',
};

export function buildProductNamePrompt(config: ProductNameConfig): string {
  return `
Bạn là chuyên gia đặt tên sản phẩm nội thất cho listing ecommerce.

Thông tin sản phẩm:
- Loại sản phẩm: ${config.productType}
- Chất liệu: ${config.material}
- Tính năng nổi bật: ${config.keyFeatures}
- Khách hàng mục tiêu: ${config.targetCustomer}
- Phân khúc: ${config.priceSegment} - ${PRICE_CONTEXT[config.priceSegment]}
${buildBrandBlock({ brandName: config.brandName, forbidden: config.forbidden })}

Ngôn ngữ output: ${config.language}

Yêu cầu:
- Tạo đúng 10 tên sản phẩm.
- Mỗi tên dài 3-10 từ, không viết hoa toàn bộ.
- Mỗi tên có 1 lý do ngắn.
- Phân bổ style: seo, short, descriptive, emotional, segmented, localized, creative.
- Không dùng: siêu phẩm, số 1, đẳng cấp, hoàn hảo, tuyệt vời.

Trả về JSON hợp lệ duy nhất, không markdown:
{
  "names": [
    { "name": "tên sản phẩm", "style": "seo", "reason": "lý do ngắn" }
  ]
}
`.trim();
}
