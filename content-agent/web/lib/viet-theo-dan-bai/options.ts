import type { DanBaiTone, DanBaiWriteMethod } from './types';

export const WRITE_METHODS: Array<{
  value: DanBaiWriteMethod;
  label: string;
  note: string;
}> = [
  {
    value: 'balance',
    label: 'Balance',
    note: 'Nội dung liền mạch, hạn chế lặp ý giữa các heading, đọc tự nhiên hơn.',
  },
  {
    value: 'detail',
    label: 'Detail',
    note: 'Giải thích kỹ từng heading, phù hợp bài kỹ thuật hoặc bài cần độ sâu cao.',
  },
];

export const DAN_BAI_TONES: Array<{
  value: DanBaiTone;
  label: string;
  note: string;
}> = [
  {
    value: 'seo_focus',
    label: 'SEO Focus',
    note: 'Tập trung từ khóa, heading rõ ràng, ưu tiên khả năng lên SERP.',
  },
  {
    value: 'confident',
    label: 'Confident',
    note: 'Viết như chuyên gia, có quan điểm rõ, dùng số liệu và E-E-A-T.',
  },
  {
    value: 'friendly',
    label: 'Friendly',
    note: 'Tự nhiên, ấm áp, dễ đọc và ưu tiên vượt AI detector.',
  },
];

export const DAN_BAI_LENGTHS = [
  { value: 600, label: '~600 từ', badge: 'Ngắn' },
  { value: 800, label: '~800 từ', badge: '' },
  { value: 1000, label: '~1.000 từ', badge: 'Phổ biến' },
  { value: 1200, label: '~1.200 từ', badge: '' },
  { value: 1500, label: '~1.500 từ', badge: '' },
  { value: 2000, label: '~2.000 từ', badge: 'Dài' },
] as const;

export const OUTLINE_TAB_LABELS: Record<string, string> = {
  ai_suggest: 'AI Outline',
  from_search: 'Từ Search',
  ai_serp_url: 'AI SERP URL',
  from_url: 'Từ URL',
  manual: 'Nhập thủ công',
};
