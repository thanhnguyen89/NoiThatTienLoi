import type { UrlIdeaType, UrlImageOption } from './types';

export const URL_IDEAS: Array<{
  value: UrlIdeaType;
  label: string;
  heading: string;
  faqCount?: number;
}> = [
  { value: 'features', label: 'Tính năng', heading: 'Tính năng nổi bật' },
  { value: 'overview', label: 'Tổng quan', heading: 'Tổng quan' },
  { value: 'who_is', label: 'Là ai', heading: 'Là ai?' },
  { value: 'biography', label: 'Tiểu sử', heading: 'Tiểu sử' },
  { value: 'who_uses', label: 'Ai sẽ dùng', heading: 'Ai phù hợp để sử dụng?' },
  { value: 'what_is', label: 'Là gì', heading: 'Là gì?' },
  { value: 'where', label: 'Ở đâu', heading: 'Ở đâu?' },
  { value: 'when', label: 'Khi nào', heading: 'Khi nào nên dùng?' },
  { value: 'how_to', label: 'Cách sử dụng', heading: 'Cách sử dụng' },
  { value: 'pros_cons', label: 'Ưu và nhược điểm', heading: 'Ưu và Nhược điểm' },
  { value: 'similar', label: 'Tương tự', heading: 'Sản phẩm / Dịch vụ tương tự' },
  { value: 'advice', label: 'Lời khuyên', heading: 'Lời khuyên' },
  { value: 'opinions', label: 'Ý kiến', heading: 'Ý kiến & Nhận xét' },
  { value: 'examples', label: 'Ví dụ', heading: 'Ví dụ thực tế' },
  { value: 'comparison', label: 'So sánh', heading: 'So sánh' },
  { value: 'pricing', label: 'Giá bán', heading: 'Giá bán & Chi phí' },
  { value: 'faq3', label: '3 FAQs', heading: 'Câu hỏi thường gặp', faqCount: 3 },
  { value: 'faq5', label: '5 FAQs', heading: 'Câu hỏi thường gặp', faqCount: 5 },
];

export const URL_IMAGE_OPTIONS: Array<{
  value: UrlImageOption;
  label: string;
  note: string;
}> = [
  { value: 'none', label: 'Không có ảnh', note: 'Bài viết thuần text' },
  { value: 'yandex', label: 'Hình ảnh từ Yandex', note: 'Tự động tìm và chèn ảnh theo heading' },
  { value: 'ai_generated', label: 'AI tạo ảnh', note: 'Giữ placeholder cho flow sau này' },
  { value: 'shutterstock', label: 'Shutterstock', note: 'Giữ placeholder cho flow sau này' },
];

export { NEWS_STRUCTURES as URL_STRUCTURES } from '@/lib/viet-tin-tuc/options';
export { NEWS_TONES as URL_TONES } from '@/lib/viet-tin-tuc/options';
