import { SUPPORTED_LANGUAGES } from '@/lib/shared/options';
import type { TinhGonModelId, TinhGonOutlineType } from './types';

export const OUTLINE_TYPES: Array<{
  value: TinhGonOutlineType;
  icon: string;
  label: string;
  note: string;
  example: string;
}> = [
  {
    value: 'review_product',
    icon: 'SEARCH',
    label: 'Review san pham',
    note: 'Danh gia 1 san pham cu the: thong so, uu/nhuoc, co nen mua.',
    example: 'Danh gia giuong sat MQ-01: Review thuc te tu xuong',
  },
  {
    value: 'how_to_choose',
    icon: 'IDEA',
    label: 'Huong dan chon mua',
    note: 'Di theo tieu chi chon mua va nhu cau thuc te cua tung nhom khach.',
    example: 'Cach chon giuong sat dung kich thuoc phong nho',
  },
  {
    value: 'compare',
    icon: 'COMPARE',
    label: 'So sanh',
    note: 'So sanh 2 lua chon bang tieu chi ro, co ket luan chot phuong an.',
    example: 'Giuong sat vs giuong go: Loai nao hop gia dinh tre?',
  },
  {
    value: 'faq',
    icon: 'FAQ',
    label: 'FAQ',
    note: 'Tap hop cau hoi that ma khach hay hoi, tra loi ngan va cu the.',
    example: 'Giuong sat hop ben bao lau? 10 cau hoi thuong gap',
  },
  {
    value: 'listicle',
    icon: 'LIST',
    label: 'Top danh sach',
    note: 'Top 3-7 lua chon, phu hop khi can so nhanh nhieu mau.',
    example: 'Top 5 giuong sat gia duoi 2 trieu dang mua',
  },
  {
    value: 'problem_solution',
    icon: 'BULB',
    label: 'Van de - Giai phap',
    note: 'Bat dau tu noi dau, di toi cach xu ly va goi y giai phap phu hop.',
    example: 'Giuong sat bi ọp ẹp: Nguyen nhan va cach khac phuc',
  },
  {
    value: 'step_guide',
    icon: 'STEP',
    label: 'Tung buoc',
    note: 'Dang checklist hoac step-by-step, phu hop bai huong dan thao tac.',
    example: 'Cach lap giuong sat 2 tang: Huong dan chi tiet',
  },
  {
    value: 'story_brand',
    icon: 'BRAND',
    label: 'Story thuong hieu',
    note: 'Ke cau chuyen thuong hieu, USP, xuong san xuat va cam ket.',
    example: 'Noi That Minh Quan: Tu xuong nho den 10.000 don hang',
  },
  {
    value: 'use_case',
    icon: 'CASE',
    label: 'Truong hop dung',
    note: 'Chia theo khong gian hoac boi canh su dung thuc te cua khach hang.',
    example: 'Giuong sat 1m2 hop phong tro nao? 4 truong hop thuc te',
  },
  {
    value: 'buying_guide',
    icon: 'GUIDE',
    label: 'Cam nang mua',
    note: 'Tong hop gia, chat lieu, kich thuoc va checklist dat hang.',
    example: 'Cam nang mua giuong sat 2026: Gia, chat lieu, kich thuoc',
  },
];

export const AI_MODELS: Array<{
  id: TinhGonModelId;
  label: string;
  icon: string;
  sub: string;
  color: string;
  inactive: string;
}> = [
  {
    id: 'gemini-flash',
    label: 'Gemini',
    icon: 'STAR',
    sub: 'Google - Mac dinh',
    color: 'border-blue-500 bg-blue-50 text-blue-700',
    inactive: 'border-gray-200 hover:border-blue-300 text-gray-700',
  },
  {
    id: 'gpt-4o',
    label: 'ChatGPT',
    icon: 'BOT',
    sub: 'OpenAI - Can key',
    color: 'border-green-500 bg-green-50 text-green-700',
    inactive: 'border-gray-200 hover:border-green-300 text-gray-700',
  },
  {
    id: 'grok',
    label: 'Grok',
    icon: 'BOLT',
    sub: 'xAI - Can key',
    color: 'border-orange-500 bg-orange-50 text-orange-700',
    inactive: 'border-gray-200 hover:border-orange-300 text-gray-700',
  },
  {
    id: 'claude',
    label: 'Claude',
    icon: 'BRAIN',
    sub: 'Anthropic - Can key',
    color: 'border-slate-500 bg-slate-50 text-slate-700',
    inactive: 'border-gray-200 hover:border-slate-300 text-gray-700',
  },
];

export const TARGET_LENGTHS = [
  { value: 800, label: 'Tinh gon (~800 tu)', badge: 'Ngan' },
  { value: 1000, label: 'Chuan (~1.000 tu)', badge: '' },
  { value: 1200, label: 'Du day (~1.200 tu)', badge: 'Pho bien' },
  { value: 1500, label: 'Chi tiet (~1.500 tu)', badge: '' },
] as const;

export const LANGUAGE_OPTIONS = SUPPORTED_LANGUAGES;
