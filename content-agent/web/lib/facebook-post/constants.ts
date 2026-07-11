import type { FacebookPostTemplate, FacebookPostTone } from './types';

export const FACEBOOK_POST_QUICK_MIN_WORDS = 60;
export const FACEBOOK_POST_QUICK_MAX_WORDS = 320;
export const FACEBOOK_POST_ROUTE_MAX_WORDS = 1000;
export const FACEBOOK_POST_DEFAULT_WORD_COUNT = 140;

export const TONES: Array<{ value: FacebookPostTone; label: string }> = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'sales', label: 'Sales' },
  { value: 'rewrite', label: 'Rewrite' },
  { value: 'shorten', label: 'Shorten' },
];

export const TEMPLATES: Array<{ value: FacebookPostTemplate; label: string }> = [
  { value: '', label: 'Auto template' },
  { value: 'product_intro', label: 'Product intro' },
  { value: 'combo_wholesale', label: 'Combo wholesale' },
  { value: 'bulk_b2b', label: 'Bulk B2B' },
  { value: 'friendly_stock', label: 'Friendly stock' },
  { value: 'branding', label: 'Branding' },
];

export const FORBIDDEN_WORDS = [
  'quan trọng',
  'hiệu quả',
  'tuy nhiên',
  'bên cạnh đó',
  'đáng kể',
  'không thể phủ nhận',
  'toàn diện',
  'tối ưu hóa',
  'nhìn chung',
  'thực tế cho thấy',
  'đặc biệt là',
  'chính vì vậy',
  'như vậy',
  'tóm lại',
  'nói tóm lại',
  'như đã đề cập',
  'trong cuộc sống hiện đại',
  'ngày nay',
  'hiện nay',
  'bạn có biết rằng',
  'trong xã hội ngày nay',
  'trong bài viết này',
  'trên đây là',
  'hy vọng bài viết',
  'thông tin hữu ích',
  'vô cùng',
  'cực kỳ',
  'tuyệt vời',
  'đáng chú ý',
  'siêu phẩm',
  'số 1',
  'đẳng cấp',
  'hoàn hảo',
  'không chỉ ... mà còn',
  'sang trọng',
  'nâng tầm',
] as const;

export const TEMPLATE_GUIDES: Record<Exclude<FacebookPostTemplate, ''>, string> = {
  product_intro:
    'Cấu trúc: Hook mạnh (câu hỏi/tình huống) -> Pain point 1-2 câu -> Giới thiệu SP + specs cụ thể -> Bullet ưu điểm (3-4 điểm) -> Bảng giá/size -> Giao hàng -> CTA.\nHook KHÔNG bắt đầu bằng tên shop hay "Chào mừng". Phải bắt đầu bằng vấn đề của khách.',
  combo_wholesale:
    'Cấu trúc: Hook ngắn -> Tên SP + chất liệu/specs -> Ứng dụng đa dạng (3-4 đối tượng) -> Giá lẻ / giá sỉ (nếu số lượng lớn) -> CTA inbox/gọi.\nNhấn mạnh: "Bán lẻ & sỉ số lượng lớn", "Không qua trung gian", "Gia công theo yêu cầu".',
  bulk_b2b:
    'Cấu trúc: Hook nhắm đúng đối tượng (công nhân/ký túc xá/nhà xưởng) -> SP + specs kỹ thuật -> Tại sao phù hợp B2B -> Giá xưởng + chính sách sỉ -> Giao hàng nhanh -> CTA.\nTừ khóa cần có: "giá xưởng", "sỉ số lượng lớn", "giao nhanh toàn quốc".',
  friendly_stock:
    'Cấu trúc: Mở đầu thân thiện như đang nhắn tin ("Dạ bên em...", "Kho mình đang có...") -> SP ngắn gọn -> Giá -> Giao hàng -> CTA inbox.\nTone: tự nhiên, gần gũi, không quảng cáo quá mức. Câu ngắn. Dưới 150 từ.',
  branding:
    'Cấu trúc: Mở đầu định vị thương hiệu -> Giá trị cốt lõi (chắc, bền, giá xưởng) -> 2-3 sản phẩm tiêu biểu -> Lời mời khám phá -> CTA.\nKhông dùng ngôn ngữ "cao cấp giả tạo". Giữ tone chuyên nghiệp nhưng gần gũi.',
};

export const TONE_GUIDES: Record<FacebookPostTone, string> = {
  friendly: 'Thân thiện, gần gũi - như người bạn đang tư vấn. Xưng "mình" hoặc "Minh Quân".',
  professional: 'Chuyên nghiệp - số liệu cụ thể (mm, kg, ngày), không nói chung chung.',
  casual: 'Tự nhiên như nhắn tin - "Dạ bên em có...", câu ngắn, dễ đọc trên điện thoại.',
  sales: 'Tạo urgency - "Hàng có sẵn", "Số lượng có hạn", "Giao ngay hôm nay".',
  rewrite:
    'Viết lại nội dung gốc: giữ nguyên ý chính, thông tin sản phẩm, CTA - nhưng đổi mới hoàn toàn câu từ, tăng tính tự nhiên, xóa dấu vết AI.',
  shorten:
    'Rút ngắn nội dung gốc: chỉ giữ hook mạnh nhất, điểm bán hàng chính, CTA - cắt bỏ phần thừa. Bài đầu ra PHẢI ngắn hơn bài gốc ít nhất 30%.',
};
