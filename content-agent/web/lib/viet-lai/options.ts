import { SUPPORTED_LANGUAGES } from '@/lib/shared/options';
import type { RewriteMethod, RewriteStyle } from './types';

export const REWRITE_STYLES: Array<{
  value: RewriteStyle;
  label: string;
  note: string;
  emoji: string;
}> = [
  { value: 'standard', label: 'Tiêu chuẩn', emoji: '📝', note: 'Giữ nguyên ý chính, đổi cách diễn đạt.' },
  { value: 'creative', label: 'Creative', emoji: '✨', note: 'Sáng tạo hơn, có góc nhìn mới.' },
  { value: 'structured', label: 'Structured', emoji: '📋', note: 'Dễ đọc hơn, rõ nhịp hơn.' },
  { value: 'shorten', label: 'Rút ngắn', emoji: '✂️', note: 'Rút gọn nhưng vẫn giữ ý chính.' },
  { value: 'expand', label: 'Mở rộng', emoji: '📖', note: 'Thêm ví dụ, chi tiết hoặc giải thích.' },
  { value: 'funny', label: 'Funny', emoji: '😄', note: 'Thêm sắc thái vui vẻ, nhẹ nhàng.' },
  { value: 'friendly', label: 'Friendly', emoji: '🤝', note: 'Thân thiện, ấm áp, gần gũi.' },
  { value: 'casual', label: 'Casual', emoji: '💬', note: 'Thoải mái như nói chuyện hằng ngày.' },
  { value: 'professional', label: 'Professional', emoji: '👔', note: 'Chuyên nghiệp, súc tích, rõ ràng.' },
  { value: 'rewrite_struct', label: 'Đổi cấu trúc câu', emoji: '🔄', note: 'Giữ ý nhưng đổi nhịp và cú pháp.' },
  { value: 'rewrite_persp', label: 'Đổi góc nhìn', emoji: '🔁', note: 'Chuyển điểm nhìn hoặc chủ thể diễn đạt.' },
  { value: 'rewrite_kw', label: 'Thêm từ khóa', emoji: '🔍', note: 'Tích hợp keyword tự nhiên hơn.' },
  { value: 'emoji', label: 'Thêm Emoji', emoji: '🎉', note: 'Chèn emoji ở những chỗ phù hợp.' },
];

export const REWRITE_METHODS: Array<{
  value: RewriteMethod;
  label: string;
  note: string;
  badge?: string;
}> = [
  {
    value: 'keep_headings',
    label: 'Viết lại nội dung, giữ heading',
    note: 'Phù hợp khi bạn muốn giữ khung H2/H3 hiện có để tối ưu công chỉnh sau này.',
    badge: 'Nhanh',
  },
  {
    value: 'rewrite_all',
    label: 'Viết lại cả heading lẫn nội dung',
    note: 'Tạo phiên bản mới rõ ràng hơn, khác tiêu đề phụ lẫn thân bài.',
  },
  {
    value: 'deep_rewrite',
    label: 'Rewrite deep, tránh trùng lặp tối đa',
    note: 'Tập trung đổi nhịp câu, cách triển khai và câu chữ mạnh hơn.',
    badge: 'Unique',
  },
];

export const REWRITE_LANGUAGES = SUPPORTED_LANGUAGES;
