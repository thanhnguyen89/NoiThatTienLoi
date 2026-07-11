export interface SeoCheckResult {
  label: string;
  passed: boolean;
  message: string;
}

export interface SeoScore {
  basic: SeoCheckResult[];
  additional: SeoCheckResult[];
  titleRead: SeoCheckResult[];
  contentRead: SeoCheckResult[];
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getFirstNWords(text: string, n: number): string {
  return text.split(/\s+/).slice(0, n).join(' ');
}

function countWordsFn(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

const POWER_WORDS = [
  'tốt nhất', 'hàng đầu', 'nên mua', 'đáng mua', 'so sánh',
  'hướng dẫn', 'cách chọn', 'kinh nghiệm', 'thực tế', 'đánh giá',
  'top', 'best', 'guide', 'review', 'tips', 'secrets', 'proven',
  'ultimate', 'complete', 'essential',
];

export function runBasicSeoChecks(
  html: string,
  keyword: string,
  metaDescription: string,
): SeoCheckResult[] {
  const text = stripHtmlTags(html).toLowerCase();
  const kw = keyword.toLowerCase();
  const first150 = getFirstNWords(text, 150);
  const wordCount = countWordsFn(text);
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1Text = h1Match ? stripHtmlTags(h1Match[1]).toLowerCase() : '';
  const h2Count = (html.match(/<h2[^>]+>/gi) || []).length;
  const allH1s = (html.match(/<h1[^>]+>/gi) || []).length;

  return [
    {
      label: 'Từ khoá trong tiêu đề H1',
      passed: h1Text.includes(kw),
      message: 'Thêm từ khoá chính vào thẻ H1.',
    },
    {
      label: 'Từ khoá trong 150 từ đầu',
      passed: first150.includes(kw),
      message: 'Đưa từ khoá vào đoạn mở bài (150 từ đầu).',
    },
    {
      label: 'Bài đủ dài (≥ 300 từ)',
      passed: wordCount >= 300,
      message: `Bài hiện có ${wordCount} từ — cần ít nhất 300 từ.`,
    },
    {
      label: 'Có ít nhất 1 thẻ H2',
      passed: h2Count >= 1,
      message: 'Thêm ít nhất 1 heading H2 để cấu trúc bài.',
    },
    {
      label: 'Meta description đã điền',
      passed: metaDescription.trim().length >= 30,
      message: 'Meta description cần ít nhất 30 ký tự.',
    },
    {
      label: 'Từ khoá trong meta description',
      passed: metaDescription.toLowerCase().includes(kw),
      message: 'Thêm từ khoá vào meta description.',
    },
    {
      label: 'Chỉ có 1 thẻ H1',
      passed: allH1s === 1,
      message: allH1s === 0 ? 'Thiếu thẻ H1.' : `Có ${allH1s} thẻ H1 — chỉ nên có 1.`,
    },
  ];
}

export function runAdditionalSeoChecks(
  html: string,
  keyword: string,
): SeoCheckResult[] {
  const text = stripHtmlTags(html).toLowerCase();
  const kw = keyword.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const kwCount = words.filter((word) => word.includes(kw.split(' ')[0] || kw)).length;
  const density = words.length > 0 ? (kwCount / words.length) * 100 : 0;

  const allImgs = html.match(/<img[^>]+>/gi) || [];
  const noAltImgs = allImgs.filter((img) => !/alt\s*=\s*["'][^"']+["']/i.test(img));

  const internalLinks = (html.match(/<a[^>]+href\s*=\s*["']\/[^"']+["']/gi) || []).length;
  const externalLinks = (html.match(/<a[^>]+href\s*=\s*["']https?:\/\/[^"']+["']/gi) || []).length;

  const firstH2Match = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const firstH2Text = firstH2Match ? stripHtmlTags(firstH2Match[1]).toLowerCase() : '';

  const passiveMatches = (text.match(/\b(được|bị)\s+\w+/giu) || []).length;
  const sentenceCount = (text.match(/[.!?]/g) || []).length || 1;
  const passiveRatio = passiveMatches / sentenceCount;

  return [
    {
      label: 'Mật độ từ khoá 0.5–3%',
      passed: density >= 0.5 && density <= 3,
      message: `Mật độ hiện tại: ${density.toFixed(1)}%. ${density < 0.5 ? 'Quá ít.' : 'Nhồi nhét — giảm xuống.'}`,
    },
    {
      label: 'Ảnh có alt text',
      passed: noAltImgs.length === 0,
      message: `${noAltImgs.length} ảnh thiếu alt text.`,
    },
    {
      label: 'Có internal link',
      passed: internalLinks >= 1,
      message: 'Thêm ít nhất 1 link nội bộ đến bài liên quan.',
    },
    {
      label: 'Có external link',
      passed: externalLinks >= 1,
      message: 'Thêm ít nhất 1 link ngoài (nguồn, tham khảo).',
    },
    {
      label: 'Từ khoá trong H2 đầu tiên',
      passed: firstH2Text.includes(kw),
      message: 'Đưa từ khoá vào heading H2 đầu tiên.',
    },
    {
      label: 'Câu bị động < 30%',
      passed: passiveRatio < 0.3,
      message: `${Math.round(passiveRatio * 100)}% câu bị động — chuyển sang chủ động.`,
    },
    {
      label: 'Không nhồi từ khoá',
      passed: density <= 3,
      message: 'Mật độ từ khoá vượt 3% — giảm bớt.',
    },
  ];
}

export function runTitleReadabilityChecks(title: string): SeoCheckResult[] {
  const len = title.length;
  const hasNum = /\d/.test(title);
  const hasPower = POWER_WORDS.some((word) => title.toLowerCase().includes(word));
  const isAllCaps = title === title.toUpperCase() && title.length > 5;

  return [
    {
      label: 'Độ dài tiêu đề 40–70 ký tự',
      passed: len >= 40 && len <= 70,
      message: `Tiêu đề ${len} ký tự. ${len < 40 ? 'Quá ngắn.' : 'Quá dài — sẽ bị cắt trên SERP.'}`,
    },
    {
      label: 'Tiêu đề có chứa số',
      passed: hasNum,
      message: 'Thêm số vào tiêu đề (VD: Top 10, 5 cách, 2025).',
    },
    {
      label: 'Tiêu đề có power word',
      passed: hasPower,
      message: 'Thêm từ hấp dẫn: tốt nhất, nên mua, so sánh, hướng dẫn...',
    },
    {
      label: 'Tiêu đề không viết hoa toàn bộ',
      passed: !isAllCaps,
      message: 'Không nên viết hoa toàn bộ tiêu đề.',
    },
  ];
}

export function runContentReadabilityChecks(html: string): SeoCheckResult[] {
  const text = stripHtmlTags(html);
  const sentences = text.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.length > 10);
  const avgWords = sentences.length
    ? sentences.reduce((sum, sentence) => sum + sentence.split(/\s+/).length, 0) / sentences.length
    : 0;

  const passiveCount = (text.match(/\b(được|bị)\s+\w+/giu) || []).length;
  const passiveRatio = sentences.length > 0 ? passiveCount / sentences.length : 0;

  const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
  const longParas = paragraphs.filter((paragraph) => countWordsFn(stripHtmlTags(paragraph)) > 150).length;

  return [
    {
      label: 'Câu trung bình < 20 từ',
      passed: avgWords <= 20,
      message: `Độ dài câu trung bình: ${avgWords.toFixed(1)} từ. Rút ngắn các câu dài.`,
    },
    {
      label: 'Câu bị động < 25%',
      passed: passiveRatio < 0.25,
      message: `${Math.round(passiveRatio * 100)}% câu bị động. Viết chủ động hơn.`,
    },
    {
      label: 'Đoạn văn không quá dài (< 150 từ)',
      passed: longParas === 0,
      message: `${longParas} đoạn văn quá dài — tách ra cho dễ đọc.`,
    },
  ];
}

export function runAllSeoChecks(
  html: string,
  keyword: string,
  title: string,
  metaDescription: string,
): SeoScore {
  return {
    basic: runBasicSeoChecks(html, keyword, metaDescription),
    additional: runAdditionalSeoChecks(html, keyword),
    titleRead: runTitleReadabilityChecks(title),
    contentRead: runContentReadabilityChecks(html),
  };
}

export function countPassedChecks(checks: SeoCheckResult[]): number {
  return checks.filter((check) => check.passed).length;
}
