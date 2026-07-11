import type { UrlIdeaType, UrlRewriteConfig } from './types';
import { URL_IDEAS } from './options';

const STRUCTURE_INSTRUCTIONS: Record<string, string> = {
  auto: 'AI tự chọn cấu trúc phù hợp nhất với chủ đề.',
  inverted_pyramid: 'Kim Tự Tháp: thông tin quan trọng nhất ở đầu, chi tiết phụ ở dưới.',
  storytelling: 'Kể chuyện: mở đầu gây chú ý, triển khai theo diễn biến, kết bài tự nhiên.',
  qa: 'Hỏi đáp: mỗi phần chính là một câu hỏi H2 và phần trả lời rõ ràng.',
  how_to: 'How-To: từng bước rõ ràng, hành động cụ thể, dễ làm theo.',
  pro_con: 'Ưu và Nhược: tổng quan, ưu điểm, nhược điểm, kết luận rõ ràng.',
  historical: 'Timeline: trình bày từ quá khứ đến hiện tại và xu hướng tiếp theo.',
  listicle: 'Danh sách: mỗi ý là một H2 độc lập, mạch lạc, dễ quét đọc.',
  profile: 'Profile: giới thiệu, đặc điểm, thành tựu và nhận định.',
  review: 'Review: tổng quan, điểm mạnh, điểm yếu, trải nghiệm và kết luận.',
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  formal: 'Giọng trang trọng, nghiêm túc.',
  intimate: 'Giọng thân mật, gần gũi như tạp chí hoặc blog cá nhân.',
  friendly: 'Giọng ấm áp, dễ đọc, thân thiện.',
  expert: 'Giọng chuyên môn, phân tích sâu, ưu tiên dữ kiện cụ thể.',
  humorous: 'Giọng nhẹ nhàng, linh hoạt, có thể thêm chút hài hước.',
  inspirational: 'Giọng truyền cảm hứng, tích cực.',
  nostalgic: 'Giọng hoài cổ, gợi nhớ, có chiều cảm xúc.',
  shocking: 'Giọng mở đầu mạnh, gây chú ý ngay từ đoạn đầu.',
  conversational: 'Giọng trò chuyện, tự nhiên, tránh khuôn mẫu.',
};

function buildIdeasSection(ideas: UrlIdeaType[], keyword: string): string {
  if (ideas.length === 0) return '';

  const lines = [
    '## Ý tưởng mở rộng bắt buộc',
    'AI PHẢI thêm các phần sau vào bài nếu phù hợp với chủ đề:',
  ];

  for (const idea of ideas) {
    const definition = URL_IDEAS.find((item) => item.value === idea);
    if (!definition) continue;

    let heading = definition.heading;
    if (keyword && ['who_is', 'what_is', 'who_uses'].includes(idea)) {
      heading = `${keyword} ${definition.heading.toLowerCase()}`;
    }

    if (definition.faqCount) {
      lines.push(`- <h2>${heading}</h2> gồm ${definition.faqCount} câu hỏi đáp ngắn.`);
    } else {
      lines.push(`- <h2>${heading}</h2>`);
    }
  }

  return lines.join('\n');
}

export function buildUrlRewritePrompt(
  config: UrlRewriteConfig,
  brandPrompt: string,
  forbidden: string,
): string {
  const structureInstruction = STRUCTURE_INSTRUCTIONS[config.structure] ?? STRUCTURE_INSTRUCTIONS.auto;
  const toneInstruction = TONE_INSTRUCTIONS[config.tone] ?? TONE_INSTRUCTIONS.formal;
  const ideasSection = buildIdeasSection(config.selectedIdeas, config.keyword);
  const secondaryKeywords = config.secondaryKeywords.trim()
    ? `- Từ khóa phụ: ${config.secondaryKeywords}`
    : '';
  const seoInstruction = config.seoMode && config.keyword
    ? `- Tích hợp từ khóa chính "${config.keyword}" tự nhiên, không nhồi nhét.`
    : '';

  return `
Bạn là AI chuyên viết lại nội dung từ URL thành một bài mới chất lượng cao.

${brandPrompt}

## Thông tin bài viết
- Chủ đề chính: ${config.keyword || config.sourceTitle || 'Theo nội dung URL nguồn'}
${secondaryKeywords}
- Ngôn ngữ: ${config.language}
- Cấu trúc: ${structureInstruction}
- Giọng văn: ${toneInstruction}
${seoInstruction}
- Từ bị cấm: ${forbidden || 'không có'}

## Nguồn tham khảo
- URL: ${config.sourceUrl}
- Tiêu đề gốc: ${config.sourceTitle || '(không có)'}

## Heading tham khảo từ URL gốc
${config.extractedHeadings.trim() || '(không có heading rõ ràng)'}

## Nội dung tham khảo từ URL gốc
${config.extractedContent.trim() || '(không trích được nội dung rõ ràng)'}

${ideasSection}

## Quy tắc bắt buộc
- Viết bài MỚI hoàn toàn, không sao chép nguyên văn.
- Có thể học ý, học cấu trúc, học dữ kiện nhưng phải diễn đạt lại tự nhiên.
- Bổ sung góc nhìn, ví dụ hoặc dữ kiện cụ thể nếu URL gốc quá mỏng.
- Không được mở bài bằng kiểu "Theo bài viết..." hoặc "Trong bài viết này...".
- Nhịp câu đa dạng, tránh đều đều như AI.
- Chỉ trả HTML hoàn chỉnh trong đúng 1 thẻ <article>.
- Bài phải có đúng 1 thẻ <h1>.
- Mỗi phần chính dùng <h2>, phần phụ dùng <h3> khi cần.
- Không thêm markdown, không giải thích ngoài bài.

Chỉ trả HTML.
`.trim();
}
