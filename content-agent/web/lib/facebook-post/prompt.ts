import { buildBrandContext } from './brand-context';
import { FORBIDDEN_WORDS, TEMPLATE_GUIDES, TONE_GUIDES } from './constants';
import type { FacebookPostRequest } from './types';

export function buildFacebookPostPrompt(params: FacebookPostRequest): string {
  const isRewriteMode = params.tone === 'rewrite' || params.tone === 'shorten';

  const templateGuide = isRewriteMode
    ? ''
    : params.template
      ? `\nPHONG CÁCH BÀI VIẾT (dựa theo template "${params.template}"):\n${TEMPLATE_GUIDES[params.template]}`
      : '\nPHONG CÁCH: Tự chọn cấu trúc phù hợp nhất với sản phẩm và đối tượng. Ưu tiên: Hook -> Specs -> Giá -> CTA.';

  const emojiRule = params.includeEmojis
    ? 'Dùng emoji vừa phải: tối đa 4-5 emoji/bài. Đặt đầu đoạn hoặc cuối câu. KHÔNG đặt giữa câu.'
    : 'KHÔNG dùng emoji.';

  const hashtagRule = params.includeHashtags
    ? 'Cuối bài thêm 3-5 hashtag tiếng Việt liên quan: #giuongsat #noithatminhquan #giaxuong...'
    : 'KHÔNG thêm hashtag.';

  const optionalRules = [
    params.urgency ? 'Thêm 1 dòng urgency: "Hàng có sẵn - giao ngay" hoặc "Số lượng có hạn, liên hệ sớm".' : '',
    params.freeShip ? 'Mention miễn phí giao hàng nội thành TP.HCM.' : '',
  ].filter(Boolean);

  const rules = [
    'Không bịa số liệu không có trong brand context. Dùng khoảng giá tham khảo từ catalog.',
    'Câu hook mở đầu KHÔNG bắt đầu bằng "Trong cuộc sống", "Ngày nay", "Hiện nay", "Bạn có biết".',
    `Tránh ngôn ngữ AI rõ ràng: ${FORBIDDEN_WORDS.slice(0, 12).join(', ')}...`,
    'Specs phải cụ thể (mm, kg, ngày giao) - không nói chung chung.',
    'Luôn có CTA rõ ràng ở cuối (inbox/gọi hotline/ghé kho).',
    emojiRule,
    hashtagRule,
    ...optionalRules,
  ];

  const contentInstruction = isRewriteMode
    ? `${params.tone === 'shorten' ? 'Rút ngắn' : 'Viết lại'} bài Facebook post sau đây theo yêu cầu trên:\n\n"""\n${params.keyword}\n"""`
    : `Viết 1 bài Facebook post cho sản phẩm/chủ đề: "${params.keyword}"\nNgành hàng: ${params.industry || 'chưa xác định'}`;

  const wordCountInstruction = isRewriteMode && params.tone === 'shorten'
    ? 'ĐỘ DÀI: Ngắn hơn bài gốc ít nhất 30%. Ưu tiên súc tích hơn đúng số từ.'
    : `ĐỘ DÀI MỤC TIÊU: ~${params.wordCount} từ (±20 từ). Không viết quá ngắn hoặc quá dài.`;

  return `Bạn là chuyên gia viết content Facebook cho nhiều ngành hàng khác nhau.

=== THÔNG TIN THƯƠNG HIỆU ===
${buildBrandContext(params)}

=== YÊU CẦU ===
${contentInstruction}

${wordCountInstruction}

GIỌNG VĂN / CHẾ ĐỘ: ${TONE_GUIDES[params.tone]}
${templateGuide}

=== QUY TẮC BẮT BUỘC ===
${rules.map((rule, index) => `${index + 1}. ${rule}`).join('\n')}

=== FORMAT OUTPUT ===
Chỉ trả về nội dung bài post. Không có giải thích, không có tiêu đề, không có markdown.
Dùng xuống dòng tự nhiên như bài Facebook thật.

=== CẤM TUYỆT ĐỐI ===
- KHÔNG dùng ký tự Unicode đặc biệt để format chữ: KHÔNG in nghiêng kiểu fancy, KHÔNG in đậm kiểu fancy, KHÔNG dùng script/gothic/fullwidth Unicode.
- KHÔNG dùng Markdown: KHÔNG dùng **text**, *text*, _text_, #heading, ---
- CHỈ dùng text thuần (plain text) + emoji + dấu gạch ngang thông thường (-)
- Việc format chữ đậm/nghiêng là do người dùng tự làm sau, AI KHÔNG làm sẵn.`;
}
