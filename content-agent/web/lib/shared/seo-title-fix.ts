export function stripInlineHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function fitSeoTitleLength(title: string, keyword: string): string {
  const year = new Date().getFullYear();
  let nextTitle = stripInlineHtml(title).trim() || keyword.trim();

  if (!nextTitle) return '';

  const additions = [
    `chi tiet ${year}`,
    'de hieu',
    'cho nguoi moi',
    'kem luu y thuc te',
  ];

  for (const item of additions) {
    if (nextTitle.length >= 50) break;
    nextTitle = `${nextTitle} ${item}`.trim();
  }

  if (nextTitle.length > 70) {
    nextTitle = nextTitle.slice(0, 70).replace(/\s+\S*$/, '').trim();
  }

  return nextTitle;
}

function buildSlug(value: string, limit = 80): string {
  return stripInlineHtml(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, limit)
    .replace(/-+$/g, '');
}

export function fitSeoSlugLength(source: string, keyword: string): string {
  const clampSlug = (value: string) => {
    if (value.length <= 75) return value;
    const trimmed = value.slice(0, 75).replace(/-[^-]*$/g, '').replace(/-+$/g, '');
    return trimmed || value.slice(0, 75).replace(/-+$/g, '');
  };

  const nextSlug = clampSlug(buildSlug(source, 80));
  if (nextSlug) return nextSlug;

  return clampSlug(buildSlug(keyword, 75));
}
