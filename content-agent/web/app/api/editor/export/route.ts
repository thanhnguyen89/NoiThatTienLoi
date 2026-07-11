import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const schema = z.object({
  format: z.enum(['md', 'docx']),
  html: z.string(),
  title: z.string(),
  articleId: z.string().optional(),
});

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, '$1\n')
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, '$1\n')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = schema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const { format, html, title } = parsed.data;

    if (format === 'md') {
      const markdown = `# ${title}\n\n${htmlToMarkdown(html)}`;
      return new Response(markdown, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.md"`,
        },
      });
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const HTMLtoDOCX = require('html-to-docx') as (html: string, header: null, opts: object) => Promise<Buffer>;
      const fullHtml = `<!DOCTYPE html><html><body><h1>${title}</h1>${html}</body></html>`;
      const buffer = await HTMLtoDOCX(fullHtml, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
      });

      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.docx"`,
        },
      });
    } catch {
      return NextResponse.json(
        { error: 'DOCX export cần package html-to-docx. Hãy cài dependency này trước khi dùng.' },
        { status: 501 },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi export';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
