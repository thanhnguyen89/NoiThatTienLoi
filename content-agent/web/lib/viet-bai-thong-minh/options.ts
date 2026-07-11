import type { ContentType, DataSourceMode, TopicalMapRole } from './types';

export const CONTENT_TYPES: Array<{
  value: ContentType;
  label: string;
  note: string;
  defaultLength: number;
}> = [
  { value: 'blog_seo', label: 'Blog SEO', note: 'Bài SEO chuẩn, có FAQ và từ khóa phụ.', defaultLength: 1500 },
  { value: 'how_to', label: 'Hướng dẫn', note: 'Từng bước, dùng ol/li rõ ràng.', defaultLength: 1200 },
  { value: 'listicle', label: 'Danh sách', note: 'Top N, danh sách ngắn gọn từng mục.', defaultLength: 1500 },
  { value: 'comparison', label: 'So sánh', note: 'A vs B, cần bảng so sánh.', defaultLength: 2000 },
  { value: 'review', label: 'Đánh giá', note: 'Ưu/nhược điểm, kết luận có nên mua hay không.', defaultLength: 1800 },
  { value: 'pillar', label: 'Nội dung trụ cột', note: 'Bài dài 3000-5000 từ, cần mục lục.', defaultLength: 3000 },
  { value: 'local_seo', label: 'SEO địa phương', note: 'Nhấn địa phương, NAP, giờ mở cửa.', defaultLength: 1200 },
];

export const TOPICAL_MAP_ROLES: Array<{
  value: TopicalMapRole;
  label: string;
  note: string;
}> = [
  { value: 'hub', label: 'Hub / Trụ cột', note: 'Bài chính, link ra nhiều bài vệ tinh.' },
  { value: 'spoke', label: 'Bài vệ tinh', note: 'Bài con, link về hub.' },
  { value: 'standalone', label: 'Độc lập', note: 'Không thuộc cụm chủ đề nào.' },
];

export const DATA_SOURCE_MODES: Array<{
  value: DataSourceMode;
  label: string;
  note: string;
}> = [
  { value: 'ai_only', label: 'AI tự viết', note: 'Nhanh nhất, phù hợp chủ đề phổ biến.' },
  { value: 'google_search', label: 'Google + AI', note: 'Tổng hợp top Google trước khi viết.' },
  { value: 'url_crawl', label: 'URL + AI', note: 'Đọc 1-3 URL bạn cung cấp.' },
  { value: 'manual_text', label: 'Nhập liệu + AI', note: 'Dùng văn bản/brief bạn dán vào.' },
];

export const VBT_TONES = [
  { value: 'seo_basic', label: 'SEO cơ bản', note: 'Tập trung từ khóa và ý định tìm kiếm.' },
  { value: 'seo_extended', label: 'SEO mở rộng', note: 'Giải thích, ví dụ, so sánh.' },
  { value: 'seo_longform', label: 'SEO chuyên sâu', note: 'Bài dài, chi tiết, theo hướng trụ cột.' },
  { value: 'how_to', label: 'Hướng dẫn', note: 'Bước 1 - 2 - 3, rõ ràng.' },
  { value: 'listicle', label: 'Danh sách', note: 'Top N, bullet ngắn gọn.' },
  { value: 'comparison', label: 'So sánh', note: 'A vs B, có bảng.' },
  { value: 'review', label: 'Đánh giá', note: 'Ưu/nhược điểm, kết luận thực tế.' },
  { value: 'story', label: 'Kể chuyện', note: 'Tường thuật, gần gũi.' },
  { value: 'technical', label: 'Kỹ thuật', note: 'Thông số, số liệu, chính xác.' },
  { value: 'friendly', label: 'Thân thiện', note: 'Tự nhiên, tránh văn AI.' },
  { value: 'local_seo', label: 'SEO địa phương', note: 'Nhấn địa điểm và thương hiệu địa phương.' },
] as const;

export const VBT_AI_OUTLINE_OBJECTIVES = [
  { value: 'comprehensive', label: 'Toàn diện', note: 'Cover mọi khía cạnh.' },
  { value: 'beginner', label: 'Người mới', note: 'Giải thích từ cơ bản.' },
  { value: 'expert', label: 'Chuyên sâu', note: 'Nhiều thuật ngữ và số liệu.' },
  { value: 'local_focus', label: 'Địa phương', note: 'Nhấn địa phương.' },
  { value: 'buying_guide', label: 'Mua hàng', note: 'Hướng dẫn chọn mua.' },
  { value: 'problem_solve', label: 'Giải pháp', note: 'Tập trung giải quyết vấn đề.' },
] as const;

export const VBT_AI_OUTLINE_SIZES = [
  { value: 'xs', label: 'Mini', wordRange: '600-800 từ', h2Count: 3 },
  { value: 'sm', label: 'Ngắn', wordRange: '800-1200 từ', h2Count: 4 },
  { value: 'md', label: 'Chuẩn', wordRange: '1200-2000 từ', h2Count: 5 },
  { value: 'lg', label: 'Dài', wordRange: '2000-3000 từ', h2Count: 6 },
  { value: 'xl', label: 'Trụ cột', wordRange: '3000-5000 từ', h2Count: 8 },
] as const;

export const VBT_LOADING_STEPS = [
  { key: 'init', label: 'Chuẩn bị dữ liệu' },
  { key: 'research', label: 'Phân tích từ khóa và ngữ cảnh' },
  { key: 'outline', label: 'Xây dựng cấu trúc bài' },
  { key: 'writing', label: 'Viết nội dung' },
  { key: 'seo', label: 'Tối ưu SEO' },
  { key: 'humanize', label: 'Làm tự nhiên và kiểm tra chất lượng' },
  { key: 'done', label: 'Hoàn tất' },
] as const;

export function getContentTypeDefaultLength(value: ContentType): number {
  return CONTENT_TYPES.find((item) => item.value === value)?.defaultLength ?? 1500;
}

export function buildVbtArticleContentType(value: ContentType): string {
  return `viet_bai_thong_minh:${value}`;
}
