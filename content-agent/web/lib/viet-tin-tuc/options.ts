import type { NewsStructure, NewsTone } from './types';

export const NEWS_STRUCTURES: Array<{
  value: NewsStructure;
  icon: string;
  label: string;
  note: string;
}> = [
  { value: 'auto', icon: '🤖', label: 'AI tự quyết định', note: 'AI chọn cấu trúc phù hợp nhất với chủ đề.' },
  { value: 'inverted_pyramid', icon: '🔻', label: 'Kim tự tháp', note: 'Thông tin quan trọng nhất lên đầu, chi tiết phụ ở dưới.' },
  { value: 'storytelling', icon: '📖', label: 'Kể chuyện', note: 'Trình bày theo diễn biến thời gian hoặc sự kiện.' },
  { value: 'qa', icon: '❓', label: 'Hỏi & đáp', note: 'Mỗi phần chính là một câu hỏi và phần trả lời.' },
  { value: 'how_to', icon: '👣', label: 'How-to', note: 'Dùng khi tin tức nghiêng về hướng dẫn thao tác.' },
  { value: 'pro_con', icon: '⚖️', label: 'Ưu và nhược', note: 'Phù hợp tin đánh giá hoặc phân tích hai chiều.' },
  { value: 'historical', icon: '🕰️', label: 'Timeline', note: 'Trình bày từ quá khứ tới hiện tại và xu hướng.' },
  { value: 'listicle', icon: '📋', label: 'Danh sách', note: 'Tổng hợp nhiều ý nhanh, dễ quét và dễ đọc.' },
  { value: 'profile', icon: '👤', label: 'Profile', note: 'Viết về một nhân vật, thương hiệu hoặc tổ chức.' },
  { value: 'review', icon: '⭐', label: 'Review', note: 'Đánh giá sản phẩm, dịch vụ, phim, sách hoặc trải nghiệm.' },
];

export const NEWS_TONES: Array<{
  value: NewsTone;
  label: string;
  note: string;
}> = [
  { value: 'formal', label: 'Trang trọng', note: 'Nghiêm túc, phù hợp tin tức và bài phân tích.' },
  { value: 'intimate', label: 'Thân mật', note: 'Gần gũi như tạp chí hoặc chuyên mục chia sẻ.' },
  { value: 'friendly', label: 'Friendly', note: 'Ấm áp, dễ đọc, phù hợp hướng dẫn và xu hướng.' },
  { value: 'expert', label: 'Chuyên môn', note: 'Phân tích sâu, có lập luận và số liệu.' },
  { value: 'humorous', label: 'Hài hước', note: 'Nhẹ nhàng, linh hoạt, vẫn giữ đúng thông tin.' },
  { value: 'inspirational', label: 'Truyền cảm hứng', note: 'Tích cực, tạo động lực và gợi suy nghĩ.' },
  { value: 'nostalgic', label: 'Hoài cổ', note: 'Gợi nhớ, cảm xúc, hợp với bài hồi tưởng.' },
  { value: 'shocking', label: 'Gây chú ý', note: 'Mở bài mạnh, thu hút ngay từ đầu.' },
  { value: 'conversational', label: 'Trò chuyện', note: 'Thoải mái như blog cá nhân hoặc bản tin mềm.' },
];

export const NEWS_LENGTHS = [
  { value: 400, label: 'Flash (~400 từ)', badge: 'Nhanh' },
  { value: 600, label: 'Chuẩn (~600 từ)', badge: '' },
  { value: 800, label: 'Đủ đầy (~800 từ)', badge: 'Phổ biến' },
] as const;

export const NEWS_LANGUAGE_MAP: Record<string, { hl: string; gl: string; ceid: string }> = {
  Vietnamese: { hl: 'vi', gl: 'VN', ceid: 'VN:vi' },
  English: { hl: 'en-US', gl: 'US', ceid: 'US:en' },
  Japanese: { hl: 'ja', gl: 'JP', ceid: 'JP:ja' },
  Korean: { hl: 'ko', gl: 'KR', ceid: 'KR:ko' },
  Thai: { hl: 'th', gl: 'TH', ceid: 'TH:th' },
  Indonesian: { hl: 'id', gl: 'ID', ceid: 'ID:id' },
  Chinese: { hl: 'zh', gl: 'CN', ceid: 'CN:zh' },
  German: { hl: 'de', gl: 'DE', ceid: 'DE:de' },
  French: { hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
  Spanish: { hl: 'es', gl: 'ES', ceid: 'ES:es' },
  Portuguese: { hl: 'pt', gl: 'BR', ceid: 'BR:pt' },
  Arabic: { hl: 'ar', gl: 'SA', ceid: 'SA:ar' },
  Hindi: { hl: 'hi', gl: 'IN', ceid: 'IN:hi' },
  Russian: { hl: 'ru', gl: 'RU', ceid: 'RU:ru' },
  Italian: { hl: 'it', gl: 'IT', ceid: 'IT:it' },
};

export const DEFAULT_NEWS_LANG = { hl: 'vi', gl: 'VN', ceid: 'VN:vi' };
