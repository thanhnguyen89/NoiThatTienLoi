import { SUPPORTED_LANGUAGES } from '@/lib/shared/options';
import type { AiOutlineObjective, AiOutlineSize, KeywordTone } from './types';

export const KEYWORD_TONES: Array<{
  value: KeywordTone;
  label: string;
  note: string;
}> = [
  { value: 'seo_basic', label: 'SEO Cơ bản', note: 'Tập trung keyword, phù hợp với dạng câu hỏi.' },
  { value: 'seo_focus', label: 'SEO Focus', note: 'Tối ưu ranking, ngắn gọn và rõ ràng.' },
  { value: 'seo_extended', label: 'SEO Mở rộng', note: 'Giải thích + ví dụ + so sánh.' },
  { value: 'seo_longform', label: 'SEO Long Form', note: 'Bài dài, bao quát nhiều khía cạnh.' },
  { value: 'seo_nofaq', label: 'SEO No FAQ', note: 'Tối ưu SEO, không thêm FAQ cuối bài.' },
  { value: 'how_to', label: 'Hướng dẫn', note: 'Dạng step-by-step dễ làm theo.' },
  { value: 'listicle', label: 'Danh sách', note: 'Top N, liệt kê rõ ràng.' },
  { value: 'comparison', label: 'So sánh', note: 'So sánh A vs B, có bảng nếu cần.' },
  { value: 'story', label: 'Kể chuyện', note: 'Chia sẻ trải nghiệm và góc nhìn.' },
  { value: 'technical', label: 'Kỹ thuật', note: 'Thông số, số liệu, chính xác cao.' },
  { value: 'friendly', label: 'Thân thiện', note: 'Gần gũi, tự nhiên.' },
  { value: 'formal', label: 'Trang trọng', note: 'Báo cáo, doanh nghiệp, nghiêm túc.' },
  { value: 'confident', label: 'Tự tin', note: 'Khẳng định rõ ràng, ít lan man.' },
  { value: 'year_in_title', label: 'Có năm', note: 'Thêm năm vào H1 để nổi bật SERP.' },
  { value: 'cooking', label: 'Nấu ăn', note: 'Công thức, nguyên liệu, dinh dưỡng.' },
  { value: 'random', label: 'Ngẫu nhiên', note: 'Random giữa SEO Focus, Confident, Friendly.' },
];

export const AI_OUTLINE_OBJECTIVES: Array<{
  value: AiOutlineObjective;
  label: string;
  note: string;
}> = [
  { value: 'basic', label: 'Cơ bản', note: 'Tập trung vào chủ đề được cung cấp.' },
  { value: 'problem_solution', label: 'Vấn đề & Giải pháp', note: 'Đưa ra vấn đề và giải pháp.' },
  { value: 'listicle', label: 'Danh sách', note: 'Liệt kê ý tưởng hoặc kinh nghiệm.' },
  { value: 'comparison', label: 'So sánh', note: 'So sánh sản phẩm hoặc dịch vụ.' },
  { value: 'step_by_step', label: 'Từng bước', note: 'Step-by-step rõ ràng.' },
  { value: 'story', label: 'Kể chuyện', note: 'Dựa trên trải nghiệm hoặc câu chuyện.' },
];

export const AI_OUTLINE_SIZES: Array<{
  value: AiOutlineSize;
  label: string;
  note: string;
}> = [
  { value: '2_3_h2', label: '2-3 H2', note: '~1.000 từ' },
  { value: '3_4_h2', label: '3-4 H2', note: '~1.000-1.500 từ' },
  { value: '5_6_h2', label: '5-6 H2', note: '~1.500-2.000 từ' },
  { value: '7_8_h2', label: '7-8 H2', note: '~2.100-2.500 từ' },
  { value: '9_10_h2', label: '9-10 H2', note: '~2.500-3.500 từ' },
];

export const NO_OUTLINE_LENGTHS = [
  { value: 1500, label: 'Ngắn ~1.500 từ' },
  { value: 2000, label: 'Trung bình ~2.000 từ', isDefault: true },
  { value: 3000, label: 'Dài ~3.000 từ' },
] as const;

export const SUPPORTED_KEYWORD_LANGUAGES = SUPPORTED_LANGUAGES;

export const LS_CONFIG_KEY = 'ttk_config';
export const LS_RUN_ID_KEY = 'ttk_runId';
export const LS_BRAND_KEY = 'ttk_brand_info';
