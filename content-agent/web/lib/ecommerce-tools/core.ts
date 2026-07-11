export type EcommerceToolKind =
  | 'meta'
  | 'name'
  | 'description'
  | 'review'
  | 'faq';

export interface EcommerceTab {
  label: string;
  href: string;
}

export const ECOMMERCE_TABS: EcommerceTab[] = [
  { label: 'Tiêu đề SP', href: '/tao-tieu-de-san-pham' },
  { label: 'Tên SP', href: '/tao-ten-san-pham' },
  { label: 'Giới thiệu SP', href: '/gioi-thieu-san-pham' },
  { label: 'Đánh giá SP', href: '/danh-gia-san-pham-nhanh' },
  { label: 'FAQ SP', href: '/faq-san-pham' },
];

export const PRODUCT_TONES = [
  { value: 'seo_focus', label: 'SEO Focus' },
  { value: 'persuasive', label: 'Thuyết phục' },
  { value: 'friendly', label: 'Thân thiện' },
  { value: 'professional', label: 'Chuyên nghiệp' },
  { value: 'luxury', label: 'Cao cấp' },
  { value: 'bold', label: 'Nổi bật' },
  { value: 'engaging', label: 'Kéo click' },
  { value: 'confident', label: 'Tự tin' },
  { value: 'direct', label: 'Trực tiếp' },
  { value: 'casual', label: 'Thoải mái' },
] as const;

export const PRICE_SEGMENTS = [
  { value: 'budget', label: 'Phổ thông' },
  { value: 'mid', label: 'Tầm trung' },
  { value: 'premium', label: 'Cao cấp' },
] as const;

export const DESCRIPTION_LENGTHS = [
  { value: 'short', label: 'Ngắn ~150 từ' },
  { value: 'standard', label: 'Chuẩn ~250 từ' },
  { value: 'detailed', label: 'Chi tiết ~400 từ' },
] as const;

export const DESCRIPTION_FORMATS = [
  { value: 'prose', label: 'Đoạn văn' },
  { value: 'structured', label: 'Có heading + bullet' },
] as const;

export const REVIEW_PERSONAS = [
  { value: 'real_user', label: 'Người mua thật' },
  { value: 'blogger', label: 'Blogger review' },
  { value: 'expert', label: 'Chuyên gia' },
] as const;

export const FAQ_TYPES = [
  { value: 'general', label: 'Câu hỏi chung' },
  { value: 'technical', label: 'Kỹ thuật' },
  { value: 'purchase', label: 'Mua hàng' },
] as const;

export const FAQ_COUNTS = [5, 7, 10] as const;

export const ECOMMERCE_SELECT_OPTIONS = {
  productTones: PRODUCT_TONES.map((item) => ({ value: item.value, label: item.label })),
  priceSegments: PRICE_SEGMENTS.map((item) => ({ value: item.value, label: item.label })),
  descriptionLengths: DESCRIPTION_LENGTHS.map((item) => ({ value: item.value, label: item.label })),
  descriptionFormats: DESCRIPTION_FORMATS.map((item) => ({ value: item.value, label: item.label })),
  reviewPersonas: REVIEW_PERSONAS.map((item) => ({ value: item.value, label: item.label })),
  faqTypes: FAQ_TYPES.map((item) => ({ value: item.value, label: item.label })),
  faqCounts: FAQ_COUNTS.map((item) => ({ value: item, label: `${item} câu hỏi` })),
};

export const COMMON_FORBIDDEN_WORDS = [
  'quan trọng',
  'hiệu quả',
  'tuy nhiên',
  'bên cạnh đó',
  'toàn diện',
  'tối ưu hóa',
  'ngày nay',
  'hiện nay',
  'vô cùng',
  'cực kỳ',
  'tuyệt vời',
  'siêu phẩm',
  'số 1',
  'đẳng cấp',
  'hoàn hảo',
  'không chỉ ... mà còn',
];

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function stripCodeFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json|html|text)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export function safeJsonParse<T>(raw: string): T | null {
  const cleaned = stripCodeFence(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        // continue to array fallback
      }
    }

    const arrayStart = cleaned.indexOf('[');
    const arrayEnd = cleaned.lastIndexOf(']');
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      try {
        return JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1)) as T;
      } catch {
        return null;
      }
    }

    return null;
  }
}

export interface ProductMetaFallbackResult {
  titles: string[];
  description: string;
}

export function fallbackParseProductMeta(raw: string): ProductMetaFallbackResult {
  const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean);
  const titlePrefixPattern = /^(?:\d+[.):]|[-*])\s*/;
  const descriptionLabelPattern = /^(?:meta\s*)?description\s*[:.-]?\s*/i;
  const titleHeaderPattern = /^here are (?:the )?titles:?$/i;
  const cleanTitle = (line: string) => line.replace(/^\d+[.):]\s*/, '').replace(/^[-*]\s*/, '').trim();

  let description = '';
  let descriptionLineIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!descriptionLabelPattern.test(line)) continue;

    const inlineDescription = line.replace(descriptionLabelPattern, '').trim();
    description = inlineDescription || lines[index + 1] || '';
    descriptionLineIndex = inlineDescription ? index : index + 1;
    break;
  }

  const prefixedTitleLines = lines.filter((line, index) =>
    titlePrefixPattern.test(line) &&
    !descriptionLabelPattern.test(line) &&
    index !== descriptionLineIndex,
  );

  const titleSource = prefixedTitleLines.length > 0
    ? prefixedTitleLines
    : lines.filter((line, index) =>
      !titleHeaderPattern.test(line) &&
      !descriptionLabelPattern.test(line) &&
      index !== descriptionLineIndex &&
      (!description || line !== description),
    );

  const titles = titleSource
    .map(cleanTitle)
    .filter((line) => line && !/description|titles/i.test(line))
    .slice(0, 5);

  if (!description) {
    const nonTitleLines = lines.filter((line, index) =>
      !titleHeaderPattern.test(line) &&
      !descriptionLabelPattern.test(line) &&
      !prefixedTitleLines.includes(line) &&
      index !== descriptionLineIndex,
    );

    description = nonTitleLines
      .sort((left, right) => right.length - left.length)[0] ?? '';
  }

  return { titles, description };
}

export function buildFaqSchema(faqs: Array<{ question: string; answer: string }>): string {
  return JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    },
    null,
    2,
  );
}

export function buildBrandBlock(input: {
  brandName?: string;
  forbidden?: string;
  shopPhone?: string;
  shopAddress?: string;
}): string {
  const lines = [
    input.brandName ? `Thương hiệu: ${input.brandName}` : '',
    input.shopPhone ? `Hotline: ${input.shopPhone}` : '',
    input.shopAddress ? `Địa chỉ: ${input.shopAddress}` : '',
    input.forbidden ? `Từ không dùng bổ sung: ${input.forbidden}` : '',
  ].filter(Boolean);

  return lines.length ? `\n\nThông tin shop/brand:\n${lines.join('\n')}` : '';
}

export function sseEvent(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function generateText(prompt: string, modelId: string): Promise<string> {
  const { buildTinhGonModel } = await import('@/lib/tinh-gon/model');
  const model = buildTinhGonModel(modelId);
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

export async function streamText(
  prompt: string,
  modelId: string,
  onChunk: (chunk: string) => void,
): Promise<string> {
  const { buildTinhGonModel } = await import('@/lib/tinh-gon/model');
  const model = buildTinhGonModel(modelId);

  try {
    const stream = await model.generateContentStream(prompt);
    let output = '';
    for await (const chunk of stream) {
      const text = chunk.text();
      if (!text) continue;
      output += text;
      onChunk(text);
    }
    return output.trim();
  } catch {
    const result = await model.generateContent(prompt);
    const output = result.response.text().trim();
    onChunk(output);
    return output;
  }
}
