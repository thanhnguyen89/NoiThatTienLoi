import type { EmojiLevel, HookStyle, TikTokCTA, TiktokBrandPostConfig, VideoType } from './types';

const VIDEO_TYPE_CONTEXT: Record<VideoType, string> = {
  product_demo:
    'Caption đi kèm video quay sản phẩm thực tế. Mô tả ngắn những gì người xem thấy trong video như màu, khung, kích thước, sau đó nhấn USP chính như chịu lực, bền, giá xưởng, giao nhanh. Không kể hết spec.',
  load_test:
    'Caption đi kèm video thử tải hoặc chịu lực. Hook phải có số liệu kết quả test nếu topic có số liệu. Body giải thích ngắn vì sao chịu được: chất liệu, khung dày, mối hàn. CTA nên là inbox để hỏi thêm.',
  price_reveal:
    'Caption đi kèm video báo giá hoặc so sánh giá. Hook phải đưa giá sớm, không úp mở. Body giải thích lý do giá tốt như trực tiếp từ xưởng, không qua trung gian. CTA mạnh và rõ.',
  new_arrival:
    'Caption đi kèm video giới thiệu mẫu mới về kho. Hook là mẫu mới về và điểm khác biệt lớn nhất. Body nói mẫu này hơn gì mẫu cũ, có sẵn hay giao nhanh. CTA mời hỏi sớm.',
  promotion:
    'Caption đi kèm video khuyến mãi hoặc flash sale. Hook là deal và giá ưu đãi sớm. Body nêu điều kiện ưu đãi, thời hạn, số lượng có hạn nếu có. CTA có urgency cụ thể.',
};

const HOOK_INSTRUCTIONS: Record<HookStyle, string> = {
  pov:
    'Mở đầu chính xác bằng "POV:" rồi đặt người xem vào một tình huống cụ thể, gây tò mò hoặc đồng cảm ngay.',
  challenge:
    'Câu đầu là statement ngược, gây sốc nhẹ hoặc cảnh báo. Tuyệt đối không dùng "Bạn có biết".',
  number:
    'Câu đầu phải có con số cụ thể cộng kết quả bất ngờ. Format gợi ý: "[Số liệu] - [hệ quả/giá]".',
  question:
    'Câu đầu là câu hỏi người xem đang tự hỏi nhưng chưa biết câu trả lời. Không viết câu hỏi tu từ chung chung.',
  story:
    'Mở bằng tình huống thật ngắn 1-2 câu: ai gặp vấn đề gì, shop giải quyết thế nào. Tự nhiên, không kể lể dài.',
};

const CTA_INSTRUCTIONS: Record<TikTokCTA, string> = {
  inbox:
    'Kết thúc bằng lời mời inbox hoặc DM trực tiếp. Dùng "mình" làm chủ ngữ nhận DM nếu brand không có xưng hô khác.',
  comment_key:
    'Kết thúc bằng kêu gọi comment keyword cụ thể. Format bắt buộc: "Comment \'[KEYWORD]\' để mình [làm gì]."',
  bio_link:
    'Kết thúc bằng hướng đến TikTok Shop hoặc link trong bio. Ngắn gọn, tự nhiên.',
  phone:
    'Kết thúc bằng kêu gọi nhắn tin hoặc gọi hotline. Nếu brand chưa có số điện thoại, ghi "hotline" hoặc "{SĐT}", không bịa số.',
};

const EMOJI_INSTRUCTIONS: Record<EmojiLevel, string> = {
  none: 'Tuyệt đối không dùng emoji. Plain text hoàn toàn.',
  low: 'Tối đa 1-2 emoji toàn caption. Đặt ở cuối hook hoặc CTA.',
  medium: 'Dùng 3-4 emoji phù hợp. Đặt ở đầu hoặc cuối câu, không đặt giữa câu.',
  high: 'Dùng 5+ emoji phù hợp cho promotion hoặc content vui. Không làm rối caption.',
};

const HASHTAG_CONTEXT: Record<VideoType, string> = {
  product_demo: '#noithatminhquan #giuongsat #noithat #giuongsatgiare #noithatphongngu',
  load_test: '#noithatminhquan #giuongsat #giuongsatben #chiuluc #noithatbenvung',
  price_reveal: '#noithatminhquan #giuongsat #giaxuong #noithatgiare #muanoithatonline',
  new_arrival: '#noithatminhquan #newcollection #giuongsat #noithatmoi #noithat2026',
  promotion: '#noithatminhquan #sale #giamgia #giuongsat #flashsale #muanhanh',
};

function buildBrandBlock(config: TiktokBrandPostConfig): string {
  const { brand } = config;
  if (!brand.shopName && !brand.brandDesc && !brand.mainProducts && !brand.ctaStandard) {
    return '';
  }

  return `
## Thông tin thương hiệu
- Tên: ${brand.shopName || 'Nội Thất Minh Quân'}
- Ngành: ${brand.industry || 'Nội thất'}
- Xưng hô thương hiệu -> khách: ${brand.brandPronouns || 'mình'} -> ${brand.brandAudience || 'bạn'}
- Sản phẩm chính: ${brand.mainProducts || ''}
- CTA chuẩn: ${brand.ctaStandard || ''}
- Giọng văn / USP: ${brand.brandToneNotes || ''}
${brand.brandDesc ? `- Mô tả thương hiệu: ${brand.brandDesc}` : ''}
${brand.brandForbidden ? `- Từ/cụm cấm dùng: ${brand.brandForbidden}` : ''}
${brand.phone ? `- Hotline: ${brand.phone}` : ''}
${brand.address ? `- Địa chỉ / website: ${brand.address}` : ''}
`.trim();
}

export function buildTiktokBrandPostPrompt(config: TiktokBrandPostConfig): string {
  const { topic, videoType, hookStyle, ctaStyle, language, emojiLevel, brand } = config;
  const brandBlock = buildBrandBlock(config);
  const brandPronouns = brand.brandPronouns || 'mình';
  const brandAudience = brand.brandAudience || 'bạn';

  return `
Bạn là chuyên gia viết TikTok content cho thương hiệu nội thất Việt Nam.

${brandBlock ? `${brandBlock}\n` : ''}
## Ngữ cảnh video
${VIDEO_TYPE_CONTEXT[videoType]}
Hook approach: ${HOOK_INSTRUCTIONS[hookStyle]}

## Mô tả video / ý tưởng chính
${topic}

## Yêu cầu output
- Ngôn ngữ: ${language}
- TITLE: tối đa 50 ký tự, KHÔNG emoji, là hook ngắn hiển thị to trên TikTok.
- CAPTION: 100-200 từ. TUYỆT ĐỐI không vượt 200 từ. KHÔNG có hashtag trong CAPTION.
- HASHTAGS: 5-10 hashtag riêng, mỗi tag bắt đầu bằng #.
- Emoji: ${EMOJI_INSTRUCTIONS[emojiLevel]}
- Xưng hô: "${brandPronouns}" -> "${brandAudience}". Không dùng "chúng tôi" hay "quý khách" trên TikTok.

## Hashtag gợi ý theo ngữ cảnh
${HASHTAG_CONTEXT[videoType]}

## Cấu trúc CAPTION
1. Hook 1-2 câu: scroll-stop, gây tò mò hoặc đồng cảm ngay. Không lặp y nguyên TITLE nếu không cần.
2. Body 3-5 câu: thông tin chính, USP thực tế, số liệu, chất liệu hoặc giá nếu phù hợp.
3. CTA 1 câu: ${CTA_INSTRUCTIONS[ctaStyle]}

## Format output bắt buộc
TITLE: [tiêu đề TikTok <= 50 ký tự, không emoji]
CAPTION:
[mô tả 100-200 từ, không hashtag]
HASHTAGS:
[#tag1 #tag2 #tag3 #tag4 #tag5]

## Quy tắc bắt buộc
- Không dùng markdown như **, *, # heading.
- Không dùng hashtag trong CAPTION body. Hashtag chỉ nằm trong HASHTAGS.
- Không bắt đầu bằng "Xin chào", "Caption:", "Đây là".
- Giọng văn ngắn, thật, gần gũi, không hoa mỹ, không cliché.

## Từ cấm dùng
quan trọng, hiệu quả, tuy nhiên, bên cạnh đó, tối ưu hóa, vô cùng, cực kỳ,
tuyệt vời, siêu phẩm, số 1, đẳng cấp, hoàn hảo, không chỉ mà còn
`.trim();
}
