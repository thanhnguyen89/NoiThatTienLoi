import type { EmojiLevel, HookStyle, TikTokCTA, VideoType } from './types';

export const VIDEO_TYPES: Array<{
  value: VideoType;
  label: string;
  icon: string;
  note: string;
}> = [
  {
    value: 'product_demo',
    label: 'Demo sản phẩm',
    icon: '📦',
    note: 'Quay sản phẩm thực tế: khung, màu, kích thước, chất liệu',
  },
  {
    value: 'load_test',
    label: 'Thử tải',
    icon: '💪',
    note: 'Demo độ bền: ngồi lên, nhảy lên, đặt vật nặng',
  },
  {
    value: 'price_reveal',
    label: 'Báo giá',
    icon: '💰',
    note: 'Reveal giá hoặc so sánh với giá thị trường',
  },
  {
    value: 'new_arrival',
    label: 'Mẫu mới',
    icon: '✨',
    note: 'Giới thiệu sản phẩm mới, điểm khác biệt, có sẵn',
  },
  {
    value: 'promotion',
    label: 'Flash sale',
    icon: '🔥',
    note: 'Khuyến mãi có hạn, urgency, giá ưu đãi',
  },
];

export const HOOK_STYLES: Array<{
  value: HookStyle;
  label: string;
  icon: string;
  note: string;
  example: string;
  hot?: boolean;
}> = [
  {
    value: 'pov',
    label: 'POV Format',
    icon: '🎬',
    hot: true,
    note: 'Kéo người xem vào tình huống thứ nhất',
    example: 'POV: mình vừa mua giường sắt 990k mà...',
  },
  {
    value: 'challenge',
    label: 'Đừng bỏ qua',
    icon: '⚠️',
    hot: true,
    note: 'Statement ngược hoặc cảnh báo nhẹ',
    example: 'Đừng mua giường đắt trước khi xem cái này',
  },
  {
    value: 'number',
    label: 'Số liệu',
    icon: '🔢',
    note: 'Con số bất ngờ ở câu đầu',
    example: '250kg không gãy - giá chỉ 1.2 triệu',
  },
  {
    value: 'question',
    label: 'Câu hỏi',
    icon: '❓',
    note: 'Câu hỏi người xem đang tự hỏi',
    example: 'Giường sắt 1 triệu có thật sự bền không?',
  },
  {
    value: 'story',
    label: 'Mini story',
    icon: '📖',
    note: 'Tình huống thật ngắn, tự nhiên',
    example: 'Tuần trước khách nhà trọ hỏi mình...',
  },
];

export const CTA_STYLES: Array<{
  value: TikTokCTA;
  label: string;
  icon: string;
  example: string;
}> = [
  {
    value: 'inbox',
    label: 'Inbox / DM',
    icon: '💬',
    example: 'Inbox mình để được báo giá ngay nhé',
  },
  {
    value: 'comment_key',
    label: 'Comment keyword',
    icon: '🗣️',
    example: "Comment 'GIÁ' để mình gửi bảng giá",
  },
  {
    value: 'bio_link',
    label: 'TikTok Shop / Bio',
    icon: '🔗',
    example: 'Link TikTok Shop trong bio - vào xem ngay',
  },
  {
    value: 'phone',
    label: 'Hotline',
    icon: '📞',
    example: 'Nhắn hotline để được tư vấn trong ngày',
  },
];

export const EMOJI_LEVELS: Array<{
  value: EmojiLevel;
  label: string;
  note: string;
}> = [
  { value: 'none', label: 'Không emoji', note: 'Plain text hoàn toàn' },
  { value: 'low', label: 'Ít', note: '1-2 emoji toàn caption' },
  { value: 'medium', label: 'Vừa', note: '3-4 emoji, phổ biến nhất' },
  { value: 'high', label: 'Nhiều', note: '5+ emoji cho promo hoặc content vui' },
];

export const TOPIC_EXAMPLES: Record<VideoType, string> = {
  product_demo: 'VD: Giường sắt 1m6 khung vuông 40x40, sơn tĩnh điện đen, có nan gỗ',
  load_test: 'VD: Test giường 1m2 chịu lực với 2 người ngồi + nhảy mạnh',
  price_reveal: 'VD: Giường sắt 990k - giá xưởng, không qua trung gian',
  new_arrival: 'VD: Mẫu giường tầng mới 2026 - sơn trắng, có hộc kéo',
  promotion: 'VD: Tháng 6 giảm 15% giường sắt - còn 3 ngày',
};

export const TIKTOK_CHAR_WARNING = 1500;
export const LS_KEY_CONFIG = 'vtk_config';
export const LS_KEY_BRAND = 'vtk_brand_info';
