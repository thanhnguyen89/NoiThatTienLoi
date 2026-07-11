export function extractToplistItemNames(html: string): string[] {
  const names: string[] = [];
  const numberedRegex = /<h2[^>]*>\s*\d+\.\s*([\s\S]*?)<\/h2>/gi;

  for (const match of html.matchAll(numberedRegex)) {
    const name = match[1].replace(/<[^>]+>/g, '').trim();
    if (name) names.push(name);
  }

  if (names.length > 0) return names;

  const fallbackRegex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  for (const match of html.matchAll(fallbackRegex)) {
    const name = match[1].replace(/<[^>]+>/g, '').trim();
    if (name) names.push(name);
  }

  return names;
}

export async function fetchYandexImage(query: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(query);
    const url = `https://yandex.com/images/search?text=${q}&itype=photo`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const html = await response.text();
    const imgMatch = html.match(/"url"\s*:\s*"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
    if (imgMatch) return imgMatch[1].replace(/\\u002F/g, '/');

    const ogMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
    if (ogMatch) return ogMatch[1];

    return null;
  } catch {
    return null;
  }
}

export async function injectYandexImages(
  html: string,
  keyword: string,
): Promise<{ html: string; injectedCount: number }> {
  const itemNames = extractToplistItemNames(html);
  if (itemNames.length === 0) return { html, injectedCount: 0 };

  const imageUrls = await Promise.all(
    itemNames.map(async (name, index) => {
      await new Promise((resolve) => setTimeout(resolve, index * 200));
      return fetchYandexImage(`${keyword} ${name}`);
    }),
  );

  let injectedCount = 0;
  let result = html;

  for (let index = itemNames.length - 1; index >= 0; index -= 1) {
    const imgUrl = imageUrls[index];
    if (!imgUrl) continue;

    const escapedName = itemNames[index].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const numberedRegex = new RegExp(`(<h2[^>]*>\\s*${index + 1}\\.\\s*${escapedName}[\\s\\S]*?<\\/h2>)`, 'i');
    const fallbackRegex = new RegExp(`(<h2[^>]*>[\\s\\S]*?${escapedName}[\\s\\S]*?<\\/h2>)`, 'i');

    const imgTag = `<figure class="toplist-item-image" style="margin:0 0 16px 0">
  <img src="${imgUrl}" alt="${itemNames[index]}" loading="lazy" style="width:100%;max-width:640px;height:auto;border-radius:8px" />
</figure>`;

    if (numberedRegex.test(result)) {
      result = result.replace(numberedRegex, `$1\n${imgTag}`);
      injectedCount += 1;
      continue;
    }

    if (fallbackRegex.test(result)) {
      result = result.replace(fallbackRegex, `$1\n${imgTag}`);
      injectedCount += 1;
    }
  }

  return { html: result, injectedCount };
}
