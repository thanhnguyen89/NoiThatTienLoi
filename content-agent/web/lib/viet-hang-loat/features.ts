export type BulkFeatureId =
  | 'smart'
  | 'tu-khoa'
  | 'tinh-gon'
  | 'google-search'
  | 'theo-nguon'
  | 'dan-bai';

export type DuplicateMode = 'allow' | 'reject';
export type TitleMode = 'keyword_as_title' | 'ai_title';

export interface BulkFeature {
  id: BulkFeatureId;
  title: string;
  shortTitle: string;
  description: string;
  route: string;
  apiPrefix: string;
  jobType: string;
  sourceType: string;
  contentType: string;
  maxKeywords: number;
  delayMs: number;
  configKey: string;
  jobIdKey: string;
  brandKey: string;
  accent: string;
  itemLabel: string;
  supportsTitleMode: boolean;
  requiresOutline: boolean;
  requiresSources: boolean;
  steps: Array<{ id: string; label: string; progress: number }>;
}

export const BULK_FEATURES: Record<BulkFeatureId, BulkFeature> = {
  smart: {
    id: 'smart',
    title: 'Viết Hàng Loạt - Thông Minh',
    shortTitle: 'Thông Minh',
    description: 'Chạy flow viết thông minh cho nhiều keyword, phù hợp chiến dịch nội dung dài.',
    route: '/viet-hang-loat-thong-minh',
    apiPrefix: '/api/vhl',
    jobType: 'smart',
    sourceType: 'viet-hang-loat',
    contentType: 'viet_hang_loat:smart',
    maxKeywords: 50,
    delayMs: 1500,
    configKey: 'vhl_config',
    jobIdKey: 'vhl_jobId',
    brandKey: 'vhl_brand_info',
    accent: 'from-blue-600 to-cyan-600',
    itemLabel: 'bài thông minh',
    supportsTitleMode: false,
    requiresOutline: false,
    requiresSources: false,
    steps: [
      { id: 'analysis', label: 'Phân tích semantic', progress: 15 },
      { id: 'outline', label: 'Tạo dàn ý', progress: 35 },
      { id: 'writing', label: 'Viết bài', progress: 70 },
      { id: 'scoring', label: 'Chấm điểm và lưu DB', progress: 95 },
    ],
  },
  'tu-khoa': {
    id: 'tu-khoa',
    title: 'Viết Hàng Loạt - Từ Khóa',
    shortTitle: 'Từ Khóa',
    description: 'Mỗi dòng là một keyword, AI viết bài theo cấu hình chung.',
    route: '/viet-hang-loat-tu-khoa',
    apiPrefix: '/api/vhltk',
    jobType: 'tu-khoa',
    sourceType: 'viet-hang-loat-tu-khoa',
    contentType: 'viet_hang_loat:tu_khoa',
    maxKeywords: 50,
    delayMs: 1500,
    configKey: 'vhltk_config',
    jobIdKey: 'vhltk_jobId',
    brandKey: 'vhltk_brand_info',
    accent: 'from-emerald-600 to-teal-600',
    itemLabel: 'bài theo từ khóa',
    supportsTitleMode: true,
    requiresOutline: false,
    requiresSources: false,
    steps: [
      { id: 'outline', label: 'Chuẩn bị dàn ý', progress: 25 },
      { id: 'writing', label: 'Viết bài theo keyword', progress: 75 },
      { id: 'scoring', label: 'Chấm điểm và lưu DB', progress: 95 },
    ],
  },
  'tinh-gon': {
    id: 'tinh-gon',
    title: 'Viết Hàng Loạt - Tinh Gọn',
    shortTitle: 'Tinh Gọn',
    description: 'Tạo nhiều bài ngắn 800-1.500 từ theo outline type chung.',
    route: '/viet-hang-loat-tinh-gon',
    apiPrefix: '/api/vhltg',
    jobType: 'tinh-gon',
    sourceType: 'viet-hang-loat-tinh-gon',
    contentType: 'viet_hang_loat:tinh_gon',
    maxKeywords: 50,
    delayMs: 1500,
    configKey: 'vhltg_config',
    jobIdKey: 'vhltg_jobId',
    brandKey: 'vhltg_brand_info',
    accent: 'from-lime-600 to-emerald-600',
    itemLabel: 'bài tinh gọn',
    supportsTitleMode: true,
    requiresOutline: false,
    requiresSources: false,
    steps: [
      { id: 'outline', label: 'Tạo outline tinh gọn', progress: 25 },
      { id: 'writing', label: 'Viết từng phần', progress: 75 },
      { id: 'scoring', label: 'Chấm điểm và lưu DB', progress: 95 },
    ],
  },
  'google-search': {
    id: 'google-search',
    title: 'Viết Hàng Loạt - Google Search',
    shortTitle: 'Google Search',
    description: 'Mỗi keyword tìm nguồn Google, crawl/tổng hợp rồi viết bài.',
    route: '/viet-hang-loat-google-search',
    apiPrefix: '/api/vhlgs',
    jobType: 'google-search',
    sourceType: 'viet-hang-loat-google-search',
    contentType: 'viet_hang_loat:google_search',
    maxKeywords: 30,
    delayMs: 3000,
    configKey: 'vhlgs_config',
    jobIdKey: 'vhlgs_jobId',
    brandKey: 'vhlgs_brand_info',
    accent: 'from-slate-600 to-blue-600',
    itemLabel: 'bài Google Search',
    supportsTitleMode: true,
    requiresOutline: false,
    requiresSources: false,
    steps: [
      { id: 'searching', label: 'Tìm Google', progress: 20 },
      { id: 'crawling', label: 'Thu thập nguồn', progress: 40 },
      { id: 'writing', label: 'Viết bài', progress: 75 },
      { id: 'scoring', label: 'Chấm điểm và lưu DB', progress: 95 },
    ],
  },
  'theo-nguon': {
    id: 'theo-nguon',
    title: 'Viết Hàng Loạt - Theo Nguồn',
    shortTitle: 'Theo Nguồn',
    description: 'Crawl một bộ URL nguồn và viết nhiều bài theo nhiều keyword khác nhau.',
    route: '/viet-hang-loat-theo-nguon',
    apiPrefix: '/api/vhltn',
    jobType: 'theo-nguon',
    sourceType: 'viet-hang-loat-theo-nguon',
    contentType: 'viet_hang_loat:theo_nguon',
    maxKeywords: 50,
    delayMs: 1500,
    configKey: 'vhltn_config',
    jobIdKey: 'vhltn_jobId',
    brandKey: 'vhltn_brand_info',
    accent: 'from-violet-600 to-indigo-600',
    itemLabel: 'bài theo nguồn',
    supportsTitleMode: true,
    requiresOutline: false,
    requiresSources: true,
    steps: [
      { id: 'outline', label: 'Chuẩn bị outline nguồn', progress: 25 },
      { id: 'writing', label: 'Viết từ nguồn đã crawl', progress: 75 },
      { id: 'scoring', label: 'Chấm điểm và lưu DB', progress: 95 },
    ],
  },
  'dan-bai': {
    id: 'dan-bai',
    title: 'Viết Hàng Loạt - Theo Dàn Bài',
    shortTitle: 'Theo Dàn Bài',
    description: 'Dùng một outline template để viết hàng loạt bài theo format postTitle | keyword.',
    route: '/viet-hang-loat-theo-dan-bai',
    apiPrefix: '/api/vhldb',
    jobType: 'dan-bai',
    sourceType: 'viet-hang-loat-theo-dan-bai',
    contentType: 'viet_hang_loat:dan_bai',
    maxKeywords: 50,
    delayMs: 1500,
    configKey: 'vhldb_config',
    jobIdKey: 'vhldb_jobId',
    brandKey: 'vhldb_brand_info',
    accent: 'from-indigo-600 to-sky-600',
    itemLabel: 'bài theo dàn bài',
    supportsTitleMode: true,
    requiresOutline: true,
    requiresSources: false,
    steps: [
      { id: 'writing', label: 'Viết theo dàn bài', progress: 75 },
      { id: 'scoring', label: 'Chấm điểm và lưu DB', progress: 95 },
    ],
  },
};

export function getBulkFeature(featureId: BulkFeatureId): BulkFeature {
  return BULK_FEATURES[featureId];
}

export function getBulkFeatureByJobType(jobType: string): BulkFeature | undefined {
  return Object.values(BULK_FEATURES).find((feature) => feature.jobType === jobType);
}
