export interface PostPublishInput {
  url: string;
  sitemapUrl?: string;
  bingApiKey?: string;
}

export interface PostPublishResult {
  google: false;
  bing: boolean;
  sitemap: boolean;
}

function buildSitemapUrl(url: string): string {
  const parsed = new URL(url);
  return `${parsed.origin}/sitemap.xml`;
}

export async function runPostPublishActions(input: PostPublishInput): Promise<PostPublishResult> {
  const result: PostPublishResult = { google: false, bing: false, sitemap: false };
  const sitemapUrl = input.sitemapUrl || buildSitemapUrl(input.url);

  try {
    const sitemapRes = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
    result.sitemap = sitemapRes.ok;
  } catch {
    result.sitemap = false;
  }

  if (input.bingApiKey) {
    try {
      const parsed = new URL(input.url);
      const bingRes = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: parsed.hostname,
          key: input.bingApiKey,
          keyLocation: `${parsed.origin}/${input.bingApiKey}.txt`,
          urlList: [input.url],
        }),
      });
      result.bing = bingRes.ok;
    } catch {
      result.bing = false;
    }
  }

  return result;
}
