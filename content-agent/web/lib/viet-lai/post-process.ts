function replaceFirstOutsideTags(input: string, pattern: RegExp, replacer: (value: string) => string): string {
  let done = false;

  return input
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (done || part.startsWith('<')) return part;
      return part.replace(pattern, (value) => {
        done = true;
        return replacer(value);
      });
    })
    .join('');
}

export function injectMainKeywordLink(
  html: string,
  keyword: string,
  url: string,
): string {
  if (!keyword.trim() || !url.trim()) return html;

  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let done = false;

  return html.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (match, attrs, content) => {
    if (done) return match;
    const nextContent = replaceFirstOutsideTags(
      content,
      new RegExp(`\\b(${escaped})\\b`, 'i'),
      (value) => `<a href="${url}" title="${keyword}">${value}</a>`,
    );
    if (nextContent !== content) done = true;
    return `<p${attrs}>${nextContent}</p>`;
  });
}

export function injectAdditionalLinks(
  html: string,
  linkMap: Array<{ keyword: string; url: string }>,
): string {
  let result = html;
  const injected = new Set<string>();

  for (const item of linkMap) {
    const normalized = item.keyword.trim().toLowerCase();
    if (!normalized || !item.url.trim() || injected.has(normalized)) continue;

    const escaped = item.keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let done = false;
    const nextResult = result.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (match, attrs, content) => {
      if (done) return match;
      const nextContent = replaceFirstOutsideTags(
        content,
        new RegExp(`\\b(${escaped})\\b`, 'i'),
        (value) => `<a href="${item.url.trim()}" title="${item.keyword.trim()}">${value}</a>`,
      );
      if (nextContent !== content) done = true;
      return `<p${attrs}>${nextContent}</p>`;
    });

    if (nextResult !== result) {
      result = nextResult;
      injected.add(normalized);
    }
  }

  return result;
}

export function autoBoldContent(
  html: string,
  keyword: string,
  mode: 'none' | 'keyword' | 'headings' | 'both',
): string {
  if (mode === 'none') return html;
  let result = html;

  if ((mode === 'keyword' || mode === 'both') && keyword.trim()) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let done = false;
    result = result.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (match, attrs, content) => {
      if (done) return match;
      const nextContent = replaceFirstOutsideTags(content, new RegExp(escaped, 'i'), (value) => `<strong>${value}</strong>`);
      if (nextContent !== content) done = true;
      return `<p${attrs}>${nextContent}</p>`;
    });
  }

  if (mode === 'headings' || mode === 'both') {
    result = result
      .replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, '<h2$1><strong>$2</strong></h2>')
      .replace(/<h3([^>]*)>([\s\S]*?)<\/h3>/gi, '<h3$1><strong>$2</strong></h3>')
      .replace(/<h4([^>]*)>([\s\S]*?)<\/h4>/gi, '<h4$1><strong>$2</strong></h4>');
  }

  return result;
}

export function appendContentToArticle(
  html: string,
  appendContent: string,
): string {
  if (!appendContent.trim()) return html;
  const appendHtml = `\n<div class="article-append">${appendContent.trim()}</div>`;
  if (html.includes('</article>')) {
    return html.replace('</article>', `${appendHtml}\n</article>`);
  }
  return `${html}${appendHtml}`;
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`(.+?)`/g, '$1');
}
