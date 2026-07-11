import type { ReviewConfig } from './types';

const STYLE_LABELS: Record<string, string> = {
  expert: 'chuyên gia có kinh nghiệm sâu về sản phẩm',
  user: 'người dùng phổ thông đã mua và dùng thực tế',
  friendly: 'người bạn thân thiện đang chia sẻ trải nghiệm',
  fun: 'người viết vui vẻ, hài hước nhưng vẫn cung cấp đủ thông tin',
  technical: 'kỹ sư hoặc chuyên gia kỹ thuật, tập trung thông số và hiệu năng',
  informational: 'biên tập viên cung cấp thông tin khách quan, rõ ràng',
};

const STRUCTURE_OUTLINES: Record<string, string> = {
  full: `
## Cấu trúc bài viết bắt buộc theo thứ tự:
1. Giới thiệu thương hiệu và sản phẩm
2. Tính năng nổi bật
3. Kinh nghiệm sử dụng thực tế
4. Ưu điểm và nhược điểm
5. Lời khuyên và kết luận
`.trim(),
  focused: `
## Cấu trúc bài viết bắt buộc theo thứ tự:
1. Giới thiệu nhanh
2. Tính năng chi tiết
3. Ưu điểm
4. Nhược điểm
5. Kết luận
`.trim(),
};

export function buildReviewPrompt(config: ReviewConfig, brandPrompt: string, forbiddenList: string[]): string {
  const styleLabel = STYLE_LABELS[config.reviewStyle] ?? STYLE_LABELS.expert;
  const structureOutline = STRUCTURE_OUTLINES[config.reviewStructure] ?? STRUCTURE_OUTLINES.full;
  const forbidden = forbiddenList.join(', ');

  const affiliateSection = config.affiliateLink
    ? `## Link mua hàng
Chèn link này 1–2 lần vào bài ở vị trí tự nhiên: ${config.affiliateLink}
Dùng anchor text gắn liền với keyword hoặc tên sản phẩm. KHÔNG dùng "bấm vào đây".`
    : '';

  return `
Bạn là ${styleLabel}, đang viết bài đánh giá sản phẩm SEO cho website tiếng ${config.language}.

${brandPrompt}

## Thông tin sản phẩm cần đánh giá
- Tên sản phẩm: ${config.productName}
- Từ khóa SEO chính: ${config.keyword}
- Ngôn ngữ: ${config.language}
- Độ dài mục tiêu: khoảng 1200–1800 từ

## Dữ liệu sản phẩm
${config.productInfo}

${affiliateSection}

${structureOutline}

## Quy tắc viết
- Chỉ trả về HTML hoàn chỉnh trong một thẻ <article>.
- Có đúng 1 thẻ <h1>, các mục chính dùng <h2>, tiểu mục dùng <h3> khi cần.
- Từ khóa "${config.keyword}" xuất hiện tự nhiên trong h1, ít nhất 1 h2, và rải đều trong bài. Keyword density 1.0–1.5%.
- Dùng <ul><li> để liệt kê ưu và nhược điểm. KHÔNG viết phần này thành đoạn văn dài.
- Ưu tiên số liệu cụ thể như mm, kg, giá tiền, thời gian, phần trăm, chính sách bảo hành.
- Viết thẳng thắn, có cả điểm mạnh lẫn điểm yếu. Không tâng bốc mù quáng.
- Không dùng các từ/cụm sau: ${forbidden}
- Câu ngắn xen câu dài, tránh 5 câu liên tiếp cùng nhịp.
- Mở bài KHÔNG bắt đầu bằng "Trong cuộc sống hiện đại..." hoặc tóm tắt lại keyword.
- CTA cuối bài phải cụ thể, thực tế. KHÔNG dùng "Liên hệ ngay để được tư vấn".
- Không thêm CSS, JavaScript, markdown fence hay lời giải thích ngoài bài.

Chỉ trả HTML.
`.trim();
}
