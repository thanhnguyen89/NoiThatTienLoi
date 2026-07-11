import { buildBrandBlock, COMMON_FORBIDDEN_WORDS } from '@/lib/ecommerce-tools/core';

export interface ProductReviewConfig {
  productName: string;
  specs: string;
  pros: string;
  cons: string;
  useCase: string;
  persona: 'real_user' | 'blogger' | 'expert';
  overallRating: 1 | 2 | 3 | 4 | 5;
  language: string;
  brandName?: string;
  forbidden?: string;
}

const PERSONA_GUIDE: Record<ProductReviewConfig['persona'], string> = {
  real_user: 'Viết như người mua thật, có trải nghiệm cụ thể, ngôn ngữ đời thường.',
  blogger: 'Viết như blogger review, có heading rõ, cân bằng ưu/nhược điểm.',
  expert: 'Viết như chuyên gia nội thất, nhấn chất liệu, kết cấu, tính ứng dụng.',
};

const RATING_LABELS: Record<ProductReviewConfig['overallRating'], string> = {
  1: 'Kém, nhiều vấn đề nghiêm trọng',
  2: 'Dưới trung bình, không khuyến khích',
  3: 'Trung bình, ổn trong một số trường hợp',
  4: 'Tốt, đáng mua với đúng nhu cầu',
  5: 'Xuất sắc, tốt hơn kỳ vọng',
};

export function buildProductReviewPrompt(config: ProductReviewConfig): string {
  const extraForbidden = config.forbidden
    ? config.forbidden.split(',').map((item) => item.trim()).filter(Boolean)
    : [];

  return `
Viết bài đánh giá nhanh sản phẩm nội thất với mức ${config.overallRating}/5 sao.

Thông tin sản phẩm:
- Tên: ${config.productName}
- Thông số/chất liệu: ${config.specs}
- Ưu điểm đã biết: ${config.pros}
- Nhược điểm đã biết: ${config.cons}
- Trường hợp sử dụng: ${config.useCase}
${buildBrandBlock({ brandName: config.brandName, forbidden: config.forbidden })}

Đánh giá tổng: ${config.overallRating}/5 - ${RATING_LABELS[config.overallRating]}
Persona: ${config.persona}
${PERSONA_GUIDE[config.persona]}
Ngôn ngữ: ${config.language}

Yêu cầu:
- 300-500 từ.
- Có mở bài ngắn, section ưu điểm, section nhược điểm, kết luận "Nên mua nếu..." và "Không nên mua nếu..." nếu phù hợp.
- Trung thực, không biến review thành quảng cáo.
- Nếu rating <= 3, nhược điểm phải rõ hơn.
- Nếu rating >= 4, ưu điểm nổi bật hơn nhưng vẫn có nhược điểm thật.
- Không dùng: ${[...COMMON_FORBIDDEN_WORDS, ...extraForbidden].join(', ')}
- Không bịa thêm số liệu.

Viết ngay nội dung output, có heading ngắn, không giải thích.
`.trim();
}
