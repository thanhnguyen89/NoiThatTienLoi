export type GenerateTab = 'seo' | 'ai' | 'quality' | 'links' | 'publish' | 'images';

export const TAB_LABELS: Record<GenerateTab, { label: string; icon: string }> = {
  seo: { label: 'SEO', icon: 'SEO' },
  ai: { label: 'KIỂM TRA AI', icon: 'AI' },
  quality: { label: 'CHẤT LƯỢNG', icon: 'QC' },
  links: { label: 'LINKS', icon: 'LINK' },
  publish: { label: 'ĐĂNG BÀI', icon: 'PUB' },
  images: { label: 'HÌNH ẢNH', icon: 'IMG' },
};

export const GENERATE_TABS: readonly GenerateTab[] = ['seo', 'quality', 'links', 'publish'];

export const UNIFIED_GENERATE_TABS: readonly GenerateTab[] = [
  'seo',
  'ai',
  'quality',
  'links',
  'publish',
  'images',
];

export const AI_EDIT_COMMANDS = [
  { value: 'shorten', label: 'Rút gọn', icon: 'CUT' },
  { value: 'expand', label: 'Mở rộng', icon: 'ADD' },
  { value: 'humanize', label: 'Tự nhiên hơn', icon: 'HUM' },
  { value: 'more_spec', label: 'Thêm chi tiết', icon: 'DET' },
  { value: 'stronger_cta', label: 'CTA mạnh hơn', icon: 'CTA' },
  { value: 'rewrite', label: 'Viết lại đoạn', icon: 'RE' },
] as const;
