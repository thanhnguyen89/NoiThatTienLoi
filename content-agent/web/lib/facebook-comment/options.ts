import { SUPPORTED_LANGUAGES } from '@/lib/shared/options';
import type { CommentCount, CommentStyle } from './types';

export const BATCH_SIZE = 10;
export const FREE_USER_MAX_WORDS = 500;

export const COMMENT_COUNTS: readonly CommentCount[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50] as const;

export const COMMENT_STYLES: Array<{
  value: CommentStyle;
  label: string;
  emoji: string;
  note: string;
}> = [
  {
    value: 'funny',
    label: 'Funny',
    emoji: '😂',
    note: 'Vui ve, hai huoc nhe, co cam xuc.',
  },
  {
    value: 'shorten',
    label: 'Rut ngan',
    emoji: '✂️',
    note: 'Toi da 1-2 cau, rat gon.',
  },
  {
    value: 'creative',
    label: 'Creative',
    emoji: '✨',
    note: 'Goc nhin moi, khong lap lai.',
  },
  {
    value: 'friendly',
    label: 'Friendly',
    emoji: '❤️',
    note: 'Than thien, ung ho bai post.',
  },
  {
    value: 'casual',
    label: 'Casual',
    emoji: '👍',
    note: 'Tu nhien nhu ban be noi chuyen.',
  },
  {
    value: 'professional',
    label: 'Professional',
    emoji: '💼',
    note: 'Nhan xet gon, sach, co chieu sau.',
  },
];

export const FACEBOOK_COMMENT_EMOJI_GROUPS = [
  {
    label: '🔥 Hot',
    emojis: ['🔥', '⚡', '💥', '🎯', '🚀', '💫', '✨', '🌟', '⭐', '💎', '🏆', '🎁', '💰', '🤑', '💸', '🎉', '🎊', '👑', '🥇', '🎖️'],
  },
  {
    label: '👍 Tốt',
    emojis: ['👍', '👌', '✅', '☑️', '✔️', '💪', '🙌', '👏', '🤝', '🫶', '❤️', '💚', '💙', '🧡', '💛', '🤍', '💯', '🫀', '❣️', '💝'],
  },
  {
    label: '📦 Sản phẩm',
    emojis: ['📦', '🛋️', '🪑', '🛏️', '🪞', '🚪', '🪟', '🏠', '🏡', '🏗️', '🔨', '🪛', '⚙️', '🔧', '🪚', '📐', '📏', '🎨', '🖼️', '🪴'],
  },
  {
    label: '🚚 Giao hàng',
    emojis: ['🚚', '🚛', '📬', '📦', '🏎️', '✈️', '⚓', '🗺️', '📍', '📌', '🗺', '🌍', '🌏', '🌐', '🧭', '📡', '🛣️', '🛤️', '🏁', '🎌'],
  },
  {
    label: '💬 CTA',
    emojis: ['💬', '📲', '📞', '☎️', '📱', '💌', '📩', '📨', '✉️', '📧', '👇', '👆', '👉', '👈', '⬇️', '⬆️', '➡️', '⬅️', '🔗', '📢'],
  },
  {
    label: '💵 Giá',
    emojis: ['💵', '💴', '💶', '💷', '💰', '🏷️', '🎟️', '🪙', '💳', '🧾', '📊', '📈', '📉', '💹', '🤑', '💸', '💲', '🏦', '💎', '🛒'],
  },
  {
    label: '⏰ Urgency',
    emojis: ['⏰', '⌛', '⏳', '🕐', '⏱️', '🗓️', '📅', '📆', '🔔', '🔕', '⚠️', '🚨', '🆘', '❗', '❕', '‼️', '⁉️', '🆙', '🆕', '🆓'],
  },
  {
    label: '😊 Cảm xúc',
    emojis: ['😊', '😍', '🥰', '😁', '😆', '🤩', '😎', '🥳', '😋', '😏', '🤗', '🫂', '😌', '🙏', '🤞', '✌️', '🫵', '☺️', '🥹', '😃'],
  },
  {
    label: '🌿 Phong cách',
    emojis: ['🌿', '🌱', '🌲', '🌳', '🍀', '🌸', '🌺', '🌻', '🌹', '🌼', '🍁', '🍂', '🍃', '🌾', '🌷', '🪷', '🌵', '🎋', '🎍', '💐'],
  },
  {
    label: '✏️ Số - Ký tự',
    emojis: ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '#️⃣', '*️⃣', '▶️', '⏸️', '⏭️', '🔴', '🟡', '🟢', '🔵', '🟣'],
  },
] as const;

export const FACEBOOK_COMMENT_EMOJIS = FACEBOOK_COMMENT_EMOJI_GROUPS.flatMap((group) => group.emojis);

export const COMMENT_LANGUAGES = SUPPORTED_LANGUAGES;

export type CommentLanguage = typeof COMMENT_LANGUAGES[number]['value'];
export type { CommentCount, CommentStyle } from './types';
