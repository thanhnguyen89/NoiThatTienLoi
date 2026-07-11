import type { ArticleStructure, ArticleTone, OutlineAIType } from './types';

export const OUTLINE_AI_OPTIONS: Array<{
  value: OutlineAIType;
  label: string;
  estWords: string;
  group: 'detail' | 'objective' | 'basic';
}> = [
  { value: 'h2h3_detail', label: 'Dàn ý chi tiết [h2] & [h3]', estWords: '~2.500+', group: 'detail' },
  { value: 'problem', label: 'Vấn đề & Giải pháp', estWords: '~1.500', group: 'objective' },
  { value: 'compare', label: 'So sánh — A vs B', estWords: '~1.500', group: 'objective' },
  { value: 'step', label: 'Từng bước — Step by Step', estWords: '~1.800', group: 'objective' },
  { value: 'story', label: 'Kể chuyện — Trải nghiệm', estWords: '~1.200', group: 'objective' },
  { value: 'h2_10', label: 'Dàn ý 9–10 [h2]', estWords: '~3.000', group: 'basic' },
  { value: 'h2_8', label: 'Dàn ý 7–8 [h2]', estWords: '~2.500', group: 'basic' },
  { value: 'h2_6', label: 'Dàn ý 5–6 [h2]', estWords: '~2.000', group: 'basic' },
  { value: 'h2_4', label: 'Dàn ý 3–4 [h2]', estWords: '~1.500', group: 'basic' },
] as const;

export const OUTLINE_AI_TYPE_TARGET: Record<OutlineAIType, number> = {
  h2h3_detail: 2500,
  h2_10: 3000,
  h2_8: 2500,
  h2_6: 2000,
  h2_4: 1500,
  problem: 1500,
  compare: 1500,
  step: 1800,
  story: 1200,
};

export const ARTICLE_STRUCTURES: Array<{
  value: ArticleStructure;
  icon: string;
  label: string;
  note: string;
}> = [
  { value: 'auto', icon: '🤖', label: 'AI tự quyết định', note: 'AI chọn cấu trúc phù hợp nhất với nội dung nguồn.' },
  { value: 'inverted_pyramid', icon: '🔻', label: 'Kim tự tháp', note: 'Thông tin quan trọng ở đầu, chi tiết phụ ở dưới.' },
  { value: 'storytelling', icon: '📖', label: 'Kể chuyện', note: 'Theo trình tự thời gian, tốt cho case study và trải nghiệm.' },
  { value: 'qa', icon: '❓', label: 'Hỏi & đáp', note: 'Mỗi H2 là một câu hỏi, nội dung trả lời chi tiết.' },
  { value: 'how_to', icon: '👣', label: 'How-To', note: 'Hướng dẫn từng bước rõ ràng.' },
  { value: 'pro_con', icon: '⚖️', label: 'Pro & Con', note: 'Nêu ưu và nhược điểm cụ thể, kết luận rõ ràng.' },
  { value: 'historical', icon: '🕰️', label: 'Timeline', note: 'Trình bày theo dòng thời gian.' },
  { value: 'listicle', icon: '📋', label: 'Danh sách', note: 'Mỗi H2 là một mục, có thể thêm số thứ tự.' },
  { value: 'profile', icon: '👤', label: 'Profile', note: 'Bài về một đối tượng cụ thể.' },
  { value: 'review', icon: '⭐', label: 'Review', note: 'Đánh giá đa chiều: tổng quan, thông số, ưu và nhược điểm.' },
] as const;

export const ARTICLE_TONES: Array<{
  value: ArticleTone;
  label: string;
  note: string;
}> = [
  { value: 'intimate', label: 'Thân mật', note: 'Tạp chí, bài báo cá nhân' },
  { value: 'formal', label: 'Trang trọng', note: 'Tin tức, học thuật, kỹ thuật' },
  { value: 'friendly', label: 'Friendly', note: 'Tư vấn, hướng dẫn, câu chuyện' },
  { value: 'expert', label: 'Chuyên môn', note: 'Phân tích, đánh giá, xã luận' },
  { value: 'humorous', label: 'Hài hước', note: 'Vui vẻ, châm biếm nhẹ nhàng' },
  { value: 'inspirational', label: 'Truyền cảm hứng', note: 'Tích cực, có động lực' },
  { value: 'nostalgic', label: 'Hoài cổ', note: 'Gợi nhớ, cảm xúc, hồi tưởng' },
  { value: 'shocking', label: 'Gây sốc', note: 'Kịch tính, thu hút ngay' },
  { value: 'conversational', label: 'Trò chuyện', note: 'Blog, chuyên mục tư vấn' },
] as const;

export const IMAGE_OPTIONS = [
  { value: '0', label: 'Không chèn ảnh', icon: '🚫' },
  { value: 'yandex', label: 'Ảnh từ Yandex', icon: '🔍' },
  { value: 'ai', label: 'AI tạo ảnh', icon: '🎨' },
  { value: 'shutterstock', label: 'Shutterstock', icon: '📷' },
] as const;
