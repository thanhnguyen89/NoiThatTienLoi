import type { ToplistStructure, ToplistTone, ToplistTopN } from './types';

export const TOPLIST_TOP_N_OPTIONS: ToplistTopN[] = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export const TOPLIST_STRUCTURES: Array<{
  value: ToplistStructure;
  label: string;
  note: string;
  wordsPerItem: number;
}> = [
  {
    value: 'auto',
    label: 'AI tự quyết định',
    note: 'AI chọn cấu trúc phù hợp nhất với từng item.',
    wordsPerItem: 350,
  },
  {
    value: 'intro_features',
    label: 'Giới thiệu + Tính năng',
    note: 'Ngắn gọn, phù hợp Top 10+ khi muốn bài không quá dài.',
    wordsPerItem: 200,
  },
  {
    value: 'intro_features_pros_cons',
    label: 'Giới thiệu + Tính năng + Ưu/Nhược + Trải nghiệm',
    note: 'Cấu trúc chuẩn, được dùng nhiều nhất.',
    wordsPerItem: 350,
  },
  {
    value: 'intro_features_faq',
    label: 'Giới thiệu + Tính năng + FAQ cuối bài',
    note: 'Thêm FAQ cuối bài, tốt cho SEO long-tail.',
    wordsPerItem: 260,
  },
  {
    value: 'intro_features_pros_cons_faq',
    label: 'Full: Giới thiệu + Tính năng + Ưu/Nhược + Trải nghiệm + FAQ',
    note: 'Đầy đủ nhất, phù hợp Top 5-7 khi muốn bài chất lượng cao.',
    wordsPerItem: 450,
  },
] as const;

export const TOPLIST_TONES: Array<{
  value: ToplistTone;
  label: string;
  note: string;
}> = [
  { value: 'formal_seo', label: 'Trang trọng · Nhã nhặn · SEO', note: 'Nghiêm túc, có chiều sâu. Tối ưu ranking.' },
  { value: 'expert_seo', label: 'Chuyên gia · Sâu sắc · SEO', note: 'Phân tích kỹ, có số liệu, E-E-A-T cao.' },
  { value: 'friendly_ai_bypass', label: 'Thân thiện · Vui vẻ · Vượt AI', note: 'Đọc tự nhiên, khó nhận diện bởi AI detector.' },
  { value: 'humorous_ai_bypass', label: 'Vui vẻ · Hài hước · Vượt AI', note: 'Châm biếm nhẹ, cuốn hút, vượt kiểm tra AI.' },
  { value: 'technical_seo', label: 'Kỹ thuật · Chính xác · SEO', note: 'Thông số cụ thể, phù hợp nội dung kỹ thuật.' },
] as const;

export const TOPLIST_IMAGE_OPTIONS = [
  { value: 'none', label: 'Không dùng ảnh', icon: '🚫' },
  { value: 'yandex', label: 'Ảnh từ Yandex', icon: '🔍' },
  { value: 'ai_generated', label: 'AI tạo ảnh', icon: '🎨' },
  { value: 'shutterstock', label: 'Shutterstock', icon: '📷' },
] as const;

export function computeToplistTargetLength(topN: ToplistTopN, structure: ToplistStructure): number {
  const structureInfo = TOPLIST_STRUCTURES.find((item) => item.value === structure);
  const wordsPerItem = structureInfo?.wordsPerItem ?? 350;
  return topN * wordsPerItem + 300;
}
