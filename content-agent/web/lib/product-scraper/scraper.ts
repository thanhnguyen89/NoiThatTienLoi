import type { ProductData } from './types';

const SUPPORTED_DOMAINS = ['shopee', 'lazada', 'amazon', 'etsy', 'alibaba', 'myshopify', 'woocommerce', 'wordpress'];

export function isSupportedUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return SUPPORTED_DOMAINS.some((domain) => hostname.includes(domain));
  } catch {
    return false;
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  );
}

function extractBodyText(html: string, maxLength: number): string {
  return stripTags(
    html
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<header[\s\S]*?<\/header>/gi, ' ')
      .replace(/<aside[\s\S]*?<\/aside>/gi, ' '),
  ).slice(0, maxLength);
}

function findBestMatch(html: string, patterns: RegExp[], maxLength: number): string {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    const value = stripTags(match[1]).trim().slice(0, maxLength);
    if (value) return value;
  }

  return '';
}

function extractProductData(html: string, sourceUrl: string): ProductData {
  const name = findBestMatch(html, [
    /<h1[^>]*class="[^"]*product[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
    /<h1[^>]*itemprop="name"[^>]*>([\s\S]*?)<\/h1>/i,
    /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  ], 300) || 'Sản phẩm';

  const price = findBestMatch(html, [
    /itemprop="price"[^>]*content="([^"]+)"/i,
    /<[^>]*class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i,
  ], 50) || undefined;

  const rating = findBestMatch(html, [
    /itemprop="ratingValue"[^>]*content="([^"]+)"/i,
    /<[^>]*class="[^"]*rating[^"]*"[^>]*>([\s\S]{0,30})<\/[^>]+>/i,
  ], 20) || undefined;

  const imageUrl = findBestMatch(html, [
    /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i,
    /itemprop="image"[^>]*content="([^"]+)"/i,
  ], 1000) || undefined;

  let info = '';
  for (const pattern of [
    /<div[^>]*itemprop="description"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*product-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*product-detail[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<meta[^>]*name="description"[^>]*content="([^"]+)"/i,
    /<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i,
  ]) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    info = stripTags(match[1]).replace(/\s+/g, ' ').trim().slice(0, 3000);
    if (info.length > 100) break;
  }

  if (!info || info.length < 100) {
    info = extractBodyText(html, 2500);
  }

  const summaryLines = [
    `Tên sản phẩm: ${name}`,
    price ? `Giá tham khảo: ${price}` : '',
    rating ? `Đánh giá: ${rating}` : '',
    `Nguồn: ${sourceUrl}`,
    '',
    info,
  ].filter(Boolean);

  return {
    name,
    info: summaryLines.join('\n'),
    price,
    rating,
    imageUrl,
    sourceUrl,
    scrapedAt: new Date().toISOString(),
  };
}

export async function scrapeProductUrl(url: string): Promise<ProductData> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Trang này không cho phép thu thập tự động. Vui lòng copy thông tin sản phẩm thủ công.');
      }

      throw new Error(`Không thể truy cập URL (HTTP ${response.status})`);
    }

    const html = await response.text();
    return extractProductData(html, url);
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error('Thu thập quá lâu. Vui lòng nhập thông tin thủ công.');
    }

    throw error instanceof Error ? error : new Error('Không thể crawl URL');
  }
}
