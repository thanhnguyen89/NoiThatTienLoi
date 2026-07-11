import { SEO_WEIGHTS } from '@/lib/seo-weights';

export interface SeoCheck {
  label: string;
  pass: boolean;
  fixable?: boolean;
  detail?: string;
  group: 'basic' | 'advanced' | 'title';
}

export interface SeoCheckInput {
  title: string;
  metaDescription: string;
  html: string;
  wordCount: number;
  keyword: string;
  secondaryKeywords?: string[];
  affiliateLink?: string;
  sourceCount?: number;
  variant?: 'default' | 'news' | 'product_review';
  slug: string;
  internalDomain?: string;
  minWordCount?: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function stripVietnamese(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function computeSeoChecks(input: SeoCheckInput): { checks: SeoCheck[]; score: number } {
  const kw = input.keyword.toLowerCase().trim();
  const kwEsc = escapeRegExp(kw);
  const htmlLow = input.html.toLowerCase();
  const titleLow = input.title.toLowerCase();
  const metaLow = input.metaDescription.toLowerCase();
  const plainText = stripHtml(input.html).toLowerCase();
  const first10pct = plainText.slice(0, Math.ceil(plainText.length * 0.1));
  const minWordCount = input.minWordCount ?? 800;
  const internalDomain = input.internalDomain ?? 'noithatminhquan.vn';
  const internalDomainEsc = escapeRegExp(internalDomain.replace(/^www\./, ''));
  const internalDomainRaw = internalDomain.replace(/^www\./, '');
  const affiliateLink = input.affiliateLink?.trim() || '';
  const hasBuyLink = !affiliateLink || input.html.includes(affiliateLink);
  const sourceCount = input.sourceCount ?? 0;
  const variant = input.variant ?? 'default';

  const kwCount = (plainText.match(new RegExp(kwEsc, 'g')) || []).length;
  const density = input.wordCount > 0 ? (kwCount / input.wordCount) * 100 : 0;
  const densityPass = density >= 1.0 && density <= 1.5;
  const internalLinks = (input.html.match(new RegExp(`href=["'](?:/(?!/)|[^"']*${internalDomainEsc})[^"']*["']`, 'gi')) || []).length;
  const hrefMatches = [...input.html.matchAll(/href=["']([^"']+)["']/gi)].map((match) => match[1]);
  const externalLinks = hrefMatches.filter((href) => /^https?:\/\//i.test(href) && !href.includes(internalDomainRaw)).length;
  const hasKwInAlt = new RegExp(`alt=["'][^"']*${kwEsc}[^"']*["']`, 'i').test(input.html);
  const kwIdx = titleLow.indexOf(kw);
  const kwAtStart = kwIdx !== -1 && kwIdx <= Math.ceil(titleLow.length / 3);
  const titleHasNum = /\d/.test(input.title);
  const slugNorm = stripVietnamese(input.slug.toLowerCase()).replace(/[^a-z0-9]+/g, '-');
  const kwSlug = stripVietnamese(kw).replace(/\s+/g, '-');
  const h1Count = (input.html.match(/<h1[\s>]/gi) || []).length;
  const h2Count = (input.html.match(/<h2[\s>]/gi) || []).length;
  const headingLevels = [...input.html.matchAll(/<(h[1-6])[\s>]/gi)].map((match) => Number.parseInt(match[1][1] || '1', 10));
  const hasValidHeadingHierarchy = (() => {
    let maxSeen = 1;
    for (const level of headingLevels) {
      if (level > maxSeen + 1) return false;
      maxSeen = Math.max(maxSeen, level);
    }
    return true;
  })();
  const hasFaq = input.wordCount < 1000
    || htmlLow.includes('faq')
    || htmlLow.includes('câu hỏi thường gặp')
    || htmlLow.includes('cau hoi thuong gap')
    || htmlLow.includes('class="faq');
  const hasToc = input.wordCount < 1500
    || /<nav[\s>]/i.test(input.html)
    || htmlLow.includes('mục lục')
    || htmlLow.includes('muc luc');

  const variantCheck =
    variant === 'news'
      ? {
          group: 'advanced' as const,
          label: 'Có từ 2 nguồn tin trở lên',
          pass: sourceCount === 0 ? true : sourceCount >= 2,
          detail: sourceCount > 0
            ? (sourceCount >= 2
                ? `${sourceCount} nguồn tham khảo`
                : `Hiện có ${sourceCount} nguồn, nên tổng hợp từ nhiều nguồn hơn`)
            : undefined,
        }
      : variant === 'product_review'
        ? {
            group: 'advanced' as const,
            label: 'Có chèn link mua hàng tự nhiên',
            pass: hasBuyLink,
            detail: affiliateLink
              ? (hasBuyLink ? 'Đã có link mua hàng trong bài' : 'AI chưa chèn link mua hàng hoặc affiliate')
              : 'Không dùng affiliate link',
          }
        : {
            group: 'advanced' as const,
            label: 'Có từ khóa phụ trong nội dung',
            pass: (input.secondaryKeywords?.length ?? 0) === 0 || (input.secondaryKeywords || []).some((sk) => plainText.includes(sk.toLowerCase())),
            detail: input.secondaryKeywords?.length
              ? `${(input.secondaryKeywords || []).filter((sk) => plainText.includes(sk.toLowerCase())).length}/${input.secondaryKeywords?.length} từ khóa phụ`
              : undefined,
          };

  const checks: SeoCheck[] = [
    { group: 'basic', label: 'Từ khóa chính có trong SEO title', pass: titleLow.includes(kw), fixable: true },
    { group: 'basic', label: 'Từ khóa chính trong Meta Description', pass: metaLow.includes(kw), fixable: true },
    {
      group: 'basic',
      label: 'Từ khóa chính xuất hiện trong URL slug',
      pass: slugNorm.includes(kwSlug) || slugNorm.includes(kw.replace(/\s+/g, '-')) || slugNorm.includes(kw.replace(/\s+/g, '')),
      fixable: true,
    },
    { group: 'basic', label: 'Từ khóa trong 10% đầu nội dung', pass: first10pct.includes(kw) },
    { group: 'basic', label: 'Từ khóa chính xuất hiện trong nội dung', pass: htmlLow.includes(kw) },
    {
      group: 'basic',
      label: `Độ dài nội dung >= ${minWordCount} từ`,
      pass: input.wordCount >= minWordCount,
      detail: `${input.wordCount.toLocaleString()} từ`,
    },
    { group: 'advanced', label: 'Mật độ từ khóa đạt 1-1.5%', pass: densityPass, detail: `${kwCount} lần - ${density.toFixed(2)}%` },
    { group: 'advanced', label: 'URL slug <= 75 ký tự', pass: input.slug.length <= 75, fixable: true, detail: `${input.slug.length} ký tự` },
    { group: 'advanced', label: 'Có >= 1 internal link', pass: internalLinks >= 1, fixable: true, detail: `${internalLinks} internal link` },
    { group: 'advanced', label: 'Có >= 1 external link', pass: externalLinks >= 1, fixable: true, detail: `${externalLinks} external link` },
    { group: 'advanced', label: 'Từ khóa trong alt text ảnh', pass: hasKwInAlt, fixable: true },
    variantCheck,
    { group: 'title', label: 'Từ khóa ở 1/3 đầu tiêu đề', pass: kwAtStart, fixable: true },
    { group: 'title', label: 'Tiêu đề chứa số (năm/thông số...)', pass: titleHasNum, fixable: true },
    { group: 'advanced', label: 'Chỉ có 1 thẻ <h1> trong bài', pass: h1Count === 1, detail: `${h1Count} H1` },
    { group: 'advanced', label: 'Có ít nhất 2 thẻ <h2>', pass: h2Count >= 2, detail: `${h2Count} H2` },
    { group: 'advanced', label: 'Cấu trúc heading đúng thứ bậc', pass: hasValidHeadingHierarchy },
    {
      group: 'title',
      label: 'Tiêu đề SEO 50-70 ký tự',
      pass: input.title.length >= 50 && input.title.length <= 70,
      fixable: true,
      detail: `${input.title.length} ký tự`,
    },
    {
      group: 'advanced',
      label: 'Meta description 120-160 ký tự',
      pass: input.metaDescription.length >= 120 && input.metaDescription.length <= 160,
      fixable: true,
      detail: `${input.metaDescription.length} ký tự`,
    },
    { group: 'advanced', label: 'Có section FAQ khi bài >= 1000 từ', pass: hasFaq },
    { group: 'advanced', label: 'Có TOC khi bài >= 1500 từ', pass: hasToc },
  ];

  const score = checks.reduce((sum, item, index) => sum + (item.pass ? (SEO_WEIGHTS[index] || 0) : 0), 0);
  return { checks, score };
}
