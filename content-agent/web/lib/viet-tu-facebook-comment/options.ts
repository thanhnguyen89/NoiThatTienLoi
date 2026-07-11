import type { CommentBrandStyle } from './types';

export const COMMENT_BRAND_STYLES: Array<{
  value: CommentBrandStyle;
  label: string;
  emoji: string;
  note: string;
  hot?: boolean;
}> = [
  {
    value: 'funny',
    label: 'Funny',
    emoji: ':)',
    note: 'Vui ve, hai huoc nhe, co cam xuc.',
  },
  {
    value: 'friendly',
    label: 'Friendly',
    emoji: '<3',
    note: 'Than thien, ung ho bai post.',
  },
  {
    value: 'casual',
    label: 'Casual',
    emoji: '...',
    note: 'Tu nhien nhu ban be noi chuyen.',
  },
  {
    value: 'professional',
    label: 'Chuyen nghiep',
    emoji: 'PRO',
    note: 'Nhan xet gon, sach, co chieu sau.',
  },
  {
    value: 'creative',
    label: 'Sang tao',
    emoji: '*',
    note: 'Goc nhin moi, khong sao rong.',
  },
  {
    value: 'shorten',
    label: 'Sieu ngan',
    emoji: 'CUT',
    note: 'Toi da 1-2 cau.',
  },
  {
    value: 'curious',
    label: 'Hoi them',
    emoji: '?',
    note: 'Hoi gia, kich thuoc, mau sac, bao hanh, giao hang.',
    hot: true,
  },
  {
    value: 'experience',
    label: 'Trai nghiem',
    emoji: 'STAR',
    note: 'Chia se nhu da mua/dung san pham.',
    hot: true,
  },
  {
    value: 'tag_friend',
    label: 'Tag ban be',
    emoji: '@',
    note: 'Dang @... goi ban be vao xem.',
  },
];

export const VTFC_SESSION_KEY = 'vtfc_config';
export const VTFC_BRAND_KEY = 'vtfc_brand_info';

export {
  BATCH_SIZE,
  COMMENT_COUNTS,
  COMMENT_LANGUAGES,
  FREE_USER_MAX_WORDS,
} from '@/lib/facebook-comment/options';
