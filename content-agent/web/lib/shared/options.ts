export const SUPPORTED_LANGUAGES = [
  { value: 'Vietnamese', label: 'VN - Tiếng Việt' },
  { value: 'English', label: 'EN - English' },
  { value: 'Japanese', label: 'JP - Japanese' },
  { value: 'Korean', label: 'KR - Korean' },
  { value: 'Thai', label: 'TH - Thai' },
  { value: 'Indonesian', label: 'ID - Bahasa Indonesia' },
  { value: 'Chinese', label: 'CN - Chinese' },
  { value: 'German', label: 'DE - Deutsch' },
  { value: 'French', label: 'FR - Français' },
  { value: 'Spanish', label: 'ES - Español' },
  { value: 'Portuguese', label: 'PT - Português' },
  { value: 'Arabic', label: 'AR - Arabic' },
  { value: 'Hindi', label: 'HI - Hindi' },
  { value: 'Russian', label: 'RU - Russian' },
  { value: 'Italian', label: 'IT - Italiano' },
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]['value'];

export const TARGET_LENGTHS = [
  { value: 600, label: '~600 từ', badge: 'Ngắn', note: 'Mô tả sản phẩm, tin tức ngắn' },
  { value: 1200, label: '~1,200 từ', badge: 'Chuẩn SEO', note: '' },
  { value: 2000, label: '~2,000 từ', badge: 'Phổ biến', note: '' },
  { value: 3000, label: '~3,000 từ', badge: '', note: 'Bài chuyên sâu' },
  { value: 5000, label: '~5,000 từ', badge: 'Dài', note: 'Pillar content' },
] as const;

export const WRITING_TONES = [
  { value: 'seo_basic', label: 'SEO cơ bản', note: 'Tập trung keyword, phù hợp dạng câu hỏi' },
  { value: 'seo_focus', label: 'SEO Focus', note: 'Tối ưu ranking, đầy thông số' },
  { value: 'seo_extended', label: 'SEO mở rộng', note: 'Giải thích + ví dụ + so sánh' },
  { value: 'how_to', label: 'Hướng dẫn', note: 'Dạng bước 1 - 2 - 3' },
  { value: 'listicle', label: 'Danh sách', note: 'Top N, liệt kê, không dài dòng' },
  { value: 'review', label: 'Đánh giá', note: 'Ưu nhược điểm, có kết luận' },
  { value: 'comparison', label: 'So sánh', note: 'A vs B, có bảng' },
  { value: 'story', label: 'Kể chuyện', note: 'Tường thuật, cảm xúc' },
  { value: 'technical', label: 'Kỹ thuật', note: 'Thông số, số liệu, chính xác cao' },
  { value: 'friendly', label: 'Thân thiện', note: 'Gần gũi, tránh dấu vết AI' },
  { value: 'formal', label: 'Trang trọng', note: 'Báo chí, thông cáo, doanh nghiệp' },
] as const;

export const IMAGE_OPTIONS = [
  { value: 'none', label: 'Không ảnh', icon: 'TEXT', note: 'Bài chỉ có text' },
  { value: 'yandex', label: 'Yandex', icon: 'IMG', note: 'Tìm ảnh thực tế bằng Yandex Search' },
  { value: 'ai_generated', label: 'AI tạo ảnh', icon: 'AI', note: 'Flux/DALL-E tạo theo nội dung' },
  { value: 'shutterstock', label: 'Shutterstock', icon: 'STK', note: 'Ảnh stock có bản quyền' },
] as const;

export type ImageOption = typeof IMAGE_OPTIONS[number]['value'];

export const AUTO_BOLD_OPTIONS = [
  { value: 'none', label: 'Không in đậm' },
  { value: 'keyword', label: 'Từ khóa chính' },
  { value: 'headings', label: 'Heading (H2, H3)' },
  { value: 'both', label: 'Cả hai' },
] as const;

export type AutoBoldOption = typeof AUTO_BOLD_OPTIONS[number]['value'];
