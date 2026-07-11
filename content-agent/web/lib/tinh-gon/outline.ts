import { FALLBACK_SECTIONS, OUTLINE_PROMPTS } from './outline-prompts';
import { slugify } from './text';
import type { TinhGonConfig, TinhGonOutlineData, TinhGonOutlineSection, TinhGonOutlineType } from './types';

type OutlineSectionCandidate =
  | string
  | {
      heading?: string;
      title?: string;
      notes?: string;
      note?: string;
      targetWords?: number;
      target_words?: number;
    };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildSectionId(heading: string, index: number): string {
  const slug = slugify(heading);
  return slug ? `${slug}-${index + 1}` : `section-${index + 1}`;
}

function fillKeyword(template: string, keyword: string): string {
  return template.replaceAll('{keyword}', keyword);
}

function distributeWords(totalWords: number, count: number): number[] {
  const safeCount = Math.max(count, 1);
  const base = Math.floor(totalWords / safeCount);
  const remainder = totalWords % safeCount;
  return Array.from({ length: safeCount }, (_, index) => base + (index < remainder ? 1 : 0));
}

function createTitleOptions(keyword: string, outlineType: TinhGonOutlineType): string[] {
  const map: Record<TinhGonOutlineType, string[]> = {
    review_product: [
      `Đánh giá ${keyword}: Có đáng mua không?`,
      `${keyword} có gì đáng tiền khi dùng thực tế?`,
      `Review ${keyword}: Ưu nhược điểm cần biết trước khi mua`,
    ],
    how_to_choose: [
      `Cách chọn ${keyword} phù hợp với nhu cầu thực tế`,
      `Mua ${keyword}: 5 tiêu chí nên kiểm tra trước`,
      `Chọn ${keyword} sao cho vừa nhu cầu vừa ngân sách`,
    ],
    compare: [
      `${keyword}: So sánh nhanh để chọn đúng`,
      `So sánh ${keyword}: Nên chọn phương án nào?`,
      `${keyword}: Khác nhau ở đâu và ai nên chọn?`,
    ],
    faq: [
      `${keyword}: Những câu hỏi khách hay hỏi nhất`,
      `FAQ về ${keyword}: Giải đáp ngắn gọn, dễ hiểu`,
      `${keyword}: 6 câu hỏi thường gặp trước khi mua`,
    ],
    listicle: [
      `Top lựa chọn ${keyword} đáng cân nhắc`,
      `${keyword}: Danh sách mẫu đáng xem trong tầm giá`,
      `Top ${keyword} nên tham khảo trước khi chốt mua`,
    ],
    problem_solution: [
      `${keyword}: Vấn đề hay gặp và cách xử lý gọn`,
      `Gặp rắc rối với ${keyword}? Đây là cách xử lý thực tế`,
      `${keyword}: Nguyên nhân phổ biến và hướng khắc phục`,
    ],
    step_guide: [
      `Hướng dẫn từng bước với ${keyword}`,
      `${keyword}: Làm theo 5 bước để tránh sai từ đầu`,
      `Checklist thao tác với ${keyword} cho người mới`,
    ],
    story_brand: [
      `${keyword}: Câu chuyện thương hiệu và lý do khách chọn`,
      `Từ xưởng đến tay khách: Góc nhìn thật về ${keyword}`,
      `${keyword}: Điều làm nên khác biệt của thương hiệu`,
    ],
    use_case: [
      `${keyword} phù hợp với những không gian nào?`,
      `${keyword}: 4 trường hợp dùng thực tế dễ hình dung`,
      `Khi nào nên chọn ${keyword} và khi nào không?`,
    ],
    buying_guide: [
      `Cẩm nang mua ${keyword}: Giá, chất liệu, kích thước`,
      `Mua ${keyword}: Cần biết gì để chọn đúng ngay từ đầu?`,
      `${keyword}: Checklist ra quyết định trước khi đặt hàng`,
    ],
  };

  return map[outlineType];
}

export function buildOutlinePrompt(config: TinhGonConfig): string {
  return `
Bạn là SEO Architect chuyên viết bài "tinh gọn": ngắn, chắc, thực tế.

Từ khóa chính: "${config.keyword}"
Ngôn ngữ: ${config.language}
Độ dài mục tiêu: ${config.targetLength} từ
Loại bài: ${config.outlineType}
Từ khóa phụ: ${config.secondaryKeywords.join(', ') || 'không có'}
Ghi chú thêm: ${config.notes || 'không có'}

${OUTLINE_PROMPTS[config.outlineType]}

Yêu cầu:
- Chỉ tạo 4-8 heading H2, không đi quá sâu.
- Mỗi heading cần ngắn gọn, có thể triển khai thành 1-2 đoạn.
- Ưu tiên góc nhìn thực tế, tránh lan man.
- Trả về JSON đúng cấu trúc:
{
  "titleOptions": ["...", "...", "..."],
  "sections": [
    { "heading": "...", "notes": "...", "targetWords": 150 }
  ],
  "angle": "...",
  "searchIntent": "...",
  "contentGaps": ["...", "..."]
}

Chỉ trả JSON, không giải thích.
`.trim();
}

export function extractJsonPayload(text: string): unknown | null {
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      return null;
    }
  }

  const candidates = [
    text.match(/\{[\s\S]*\}/),
    text.match(/\[[\s\S]*\]/),
  ]
    .map((match) => match?.[0])
    .filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }

  return null;
}

export function buildOutlineFallback(config: TinhGonConfig): TinhGonOutlineData {
  const templates = FALLBACK_SECTIONS[config.outlineType];
  const sectionCount = clamp(Math.round(config.targetLength / 180), 4, Math.min(8, templates.length));
  const selectedTemplates = templates.slice(0, sectionCount);
  const wordsPerSection = distributeWords(config.targetLength, selectedTemplates.length);

  const sections: TinhGonOutlineSection[] = selectedTemplates.map((template, index) => ({
    id: buildSectionId(fillKeyword(template.heading, config.keyword), index),
    heading: fillKeyword(template.heading, config.keyword),
    notes: fillKeyword(template.notes, config.keyword),
    targetWords: clamp(wordsPerSection[index], 80, 260),
  }));

  return {
    titleOptions: createTitleOptions(config.keyword, config.outlineType),
    selectedTitle: createTitleOptions(config.keyword, config.outlineType)[0],
    sections,
    angle: `Đi theo hướng ${config.outlineType.replaceAll('_', ' ')} nhưng giữ giọng viết ngắn, thực tế, dễ quét.`,
    searchIntent: 'Người đọc muốn ra quyết định nhanh, hiểu đủ thông tin mà không phải đọc quá dài.',
    contentGaps: [
      'Thiếu số liệu cụ thể hoặc ví dụ thực tế.',
      'Ít chỉ ra trường hợp nên mua và không nên mua.',
      'Chưa chốt CTA hoặc checklist ra quyết định.',
    ],
    estimatedWords: sections.reduce((sum, section) => sum + section.targetWords, 0),
    userNotes: '',
  };
}

function normalizeSections(candidateSections: OutlineSectionCandidate[] | undefined, fallback: TinhGonOutlineData): TinhGonOutlineSection[] {
  const fallbackWords = distributeWords(fallback.estimatedWords, fallback.sections.length);
  const normalized = (candidateSections || [])
    .map((section, index) => {
      if (typeof section === 'string') {
        return {
          id: buildSectionId(section, index),
          heading: section.trim(),
          notes: '',
          targetWords: fallbackWords[index] || 150,
        };
      }

      const heading = (section.heading || section.title || '').trim();
      if (!heading) return null;

      const targetWords = Number(section.targetWords ?? section.target_words ?? fallbackWords[index] ?? 150);
      return {
        id: buildSectionId(heading, index),
        heading,
        notes: (section.notes || section.note || '').trim(),
        targetWords: clamp(targetWords, 80, 260),
      };
    })
    .filter(Boolean) as TinhGonOutlineSection[];

  return normalized.length >= 4 ? normalized.slice(0, 8) : fallback.sections;
}

export function normalizeOutlinePayload(raw: unknown, config: TinhGonConfig): TinhGonOutlineData {
  const fallback = buildOutlineFallback(config);
  if (!raw || typeof raw !== 'object') return fallback;

  const candidate = raw as Record<string, unknown>;
  const titleOptions = Array.isArray(candidate.titleOptions)
    ? candidate.titleOptions
    : Array.isArray(candidate.suggestedTitles)
      ? candidate.suggestedTitles
      : Array.isArray(candidate.title_candidates)
        ? candidate.title_candidates
        : [];

  const normalizedTitles = Array.from(
    new Set(
      titleOptions
        .filter((title): title is string => typeof title === 'string')
        .map((title) => title.trim())
        .filter(Boolean),
    ),
  ).slice(0, 5);

  const sections = normalizeSections(
    Array.isArray(candidate.sections) ? (candidate.sections as OutlineSectionCandidate[]) : undefined,
    fallback,
  );

  return {
    titleOptions: normalizedTitles.length ? normalizedTitles : fallback.titleOptions,
    selectedTitle: normalizedTitles[0] || fallback.selectedTitle,
    sections,
    angle: typeof candidate.angle === 'string' && candidate.angle.trim() ? candidate.angle.trim() : fallback.angle,
    searchIntent:
      typeof candidate.searchIntent === 'string' && candidate.searchIntent.trim()
        ? candidate.searchIntent.trim()
        : fallback.searchIntent,
    contentGaps: Array.isArray(candidate.contentGaps)
      ? candidate.contentGaps.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, 6)
      : fallback.contentGaps,
    estimatedWords: clamp(
      Number(candidate.estimatedWords) || sections.reduce((sum, section) => sum + section.targetWords, 0),
      800,
      1500,
    ),
    userNotes: typeof candidate.userNotes === 'string' ? candidate.userNotes : '',
  };
}
