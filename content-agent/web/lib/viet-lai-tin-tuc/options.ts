import { SUPPORTED_LANGUAGES } from '@/lib/shared/options';
import type { NewsRewriteStyle } from './types';

export const NEWS_REWRITE_STYLES: Array<{
  value: NewsRewriteStyle;
  label: string;
  note: string;
}> = [
  { value: 'neutral', label: 'Tin chuẩn', note: 'Trung tính, sáng rõ, bám facts.' },
  { value: 'breaking', label: 'Breaking', note: 'Mở đầu mạnh, nhịp nhanh, hút click.' },
  { value: 'formal', label: 'Trang trọng', note: 'Nghiêm túc, hợp bản tin và tổng hợp.' },
  { value: 'friendly', label: 'Dễ đọc', note: 'Mềm hơn, hợp chuyên mục blog tin tức.' },
  { value: 'analysis', label: 'Phân tích', note: 'Thêm góc nhìn và bối cảnh.' },
  { value: 'magazine', label: 'Magazine', note: 'Giàu nhịp kể và mượt hơn.' },
];

export const NEWS_REWRITE_LANGUAGES = SUPPORTED_LANGUAGES;
