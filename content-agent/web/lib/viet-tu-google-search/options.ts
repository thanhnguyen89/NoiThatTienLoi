import type { CrawlMode } from './types';

export const VTGS_SESSION_KEY = 'vtgs_config';
export const VTGS_BRAND_KEY = 'vtgs_brand_info';
export const VTGS_RESULT_SESSION_KEY = 'vtgs_result';
export const VTGS_RUN_ID_SESSION_KEY = 'vtgs_run_id';
export const VTGS_ARTICLE_ID_SESSION_KEY = 'vtgs_article_id';
export const VTGS_SEARCH_RESULT_SESSION_KEY = 'vtgs_search_result';

export const SEARCH_RESULT_COUNTS = [
  { value: 3, label: '3 nguon', note: 'Nhanh, phu hop bai ngan', badge: '' },
  { value: 5, label: '5 nguon', note: 'Can bang giua toc do va chat luong', badge: 'Mac dinh' },
  { value: 10, label: '10 nguon', note: 'Nhieu context hon, co the cham hon', badge: 'Sau' },
] as const;

export const DEFAULT_SEARCH_RESULT_COUNT = 5;

export const CRAWL_MODES: Array<{
  value: CrawlMode;
  label: string;
  note: string;
  icon: string;
}> = [
  {
    value: 'auto',
    label: 'Search + crawl',
    icon: 'AUTO',
    note: 'Tim Google va crawl noi dung URL de lay context that.',
  },
  {
    value: 'search_only',
    label: 'Chi dung snippet',
    icon: 'FAST',
    note: 'Nhanh hon, chi dung title/snippet tu ket qua search.',
  },
  {
    value: 'no_crawl',
    label: 'AI only',
    icon: 'AI',
    note: 'Khong search/crawl. Dung khi muon viet nhanh tu keyword.',
  },
];

export const AI_OUTLINE_OBJECTIVES = [
  { value: 'comprehensive', label: 'Toan dien', note: 'Bao phu du goc canh cua chu de' },
  { value: 'faq_focused', label: 'FAQ chinh', note: 'Tra loi cac cau hoi nguoi dung hay tim' },
  { value: 'comparison', label: 'So sanh', note: 'Dat trong bang/tieu chi A vs B' },
  { value: 'how_to', label: 'Huong dan', note: 'Theo tung buoc thuc hanh' },
  { value: 'listicle', label: 'Danh sach', note: 'Top N, liet ke de doc nhanh' },
  { value: 'local_seo', label: 'Local SEO', note: 'Bo sung dia phuong va tin hieu local' },
] as const;

export const AI_OUTLINE_SIZES = [
  { value: 'small', label: 'Nho', wordRange: '600-1000 tu' },
  { value: 'medium', label: 'Vua', wordRange: '1200-2000 tu' },
  { value: 'large', label: 'Lon', wordRange: '2500-3500 tu' },
  { value: 'xl', label: 'Rat lon', wordRange: '4000-5000 tu' },
] as const;
