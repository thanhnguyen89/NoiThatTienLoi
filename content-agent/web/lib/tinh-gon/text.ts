function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function stripVietnamese(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function slugify(value: string): string {
  return stripVietnamese(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export function stripHtml(html: string): string {
  return html
    .replace(/<\/?(article|section|div|p|li|h[1-6]|br|tr|td|th|table|ul|ol)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function countWords(value: string): number {
  const text = stripHtml(value);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

export function computeKeywordDensity(value: string, keyword: string): number {
  const words = countWords(value);
  if (!words || !keyword.trim()) return 0;

  const normalizedText = stripVietnamese(stripHtml(value)).toLowerCase();
  const normalizedKeyword = stripVietnamese(keyword).toLowerCase().trim();
  const matches = normalizedText.match(new RegExp(escapeRegExp(normalizedKeyword), 'g')) || [];
  return Number(((matches.length / words) * 100).toFixed(2));
}

export function buildMetaDescription(title: string, keyword: string, angle?: string): string {
  const pieces = [
    keyword.trim(),
    angle?.trim() || title.trim(),
    'Thông tin ngắn gọn, thực tế, dễ áp dụng và đủ để ra quyết định nhanh.',
  ].filter(Boolean);

  const description = pieces.join('. ').replace(/\s+/g, ' ').trim();
  return description.length <= 160 ? description : `${description.slice(0, 157).trimEnd()}...`;
}

function convertPlainTextToHtml(text: string, fallbackTitle: string): string {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const content = lines
    .map((line, index) => {
      if (index === 0 && !line.startsWith('#')) return `<h1>${fallbackTitle}</h1><p>${line}</p>`;
      if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
      if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
      if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
      return `<p>${line}</p>`;
    })
    .join('');

  return `<article>${content}</article>`;
}

export function sanitizeHtmlArticle(raw: string, fallbackTitle: string): string {
  const withoutFence = raw
    .replace(/```html/gi, '')
    .replace(/```/g, '')
    .trim();

  if (!withoutFence) {
    return `<article><h1>${fallbackTitle}</h1><p>Nội dung tạm thời chưa được tạo.</p></article>`;
  }

  const articleMatch = withoutFence.match(/<article[\s\S]*<\/article>/i);
  if (articleMatch) return articleMatch[0].trim();

  const hasHtmlTag = /<[^>]+>/.test(withoutFence);
  if (!hasHtmlTag) {
    return convertPlainTextToHtml(withoutFence, fallbackTitle);
  }

  const hasH1 = /<h1[\s\S]*?>/i.test(withoutFence);
  const prefix = hasH1 ? '' : `<h1>${fallbackTitle}</h1>`;
  return `<article>${prefix}${withoutFence}</article>`;
}

export function clampPercentage(value: number): number {
  return Number(clamp(value, 0, 100).toFixed(2));
}
