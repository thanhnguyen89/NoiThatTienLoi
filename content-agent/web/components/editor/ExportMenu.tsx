'use client';

import { useEffect, useRef, useState } from 'react';

interface ExportMenuProps {
  articleId: string;
  html: string;
  title: string;
}

export function ExportMenu({ articleId, html, title }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleExport(format: 'html' | 'txt' | 'md' | 'docx') {
    setLoading(format);
    try {
      if (format === 'html') {
        const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${html}</body></html>`;
        download(`${slugify(title)}.html`, fullHtml, 'text/html');
      } else if (format === 'txt') {
        const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        download(`${slugify(title)}.txt`, text, 'text/plain');
      } else {
        const res = await fetch('/api/editor/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleId, format, html, title }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({ error: 'Export failed' }));
          throw new Error((payload as { error?: string }).error || 'Export failed');
        }
        const blob = await res.blob();
        downloadBlob(blob, `${slugify(title)}.${format}`);
      }
    } catch (error) {
      alert(`Export thất bại: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
    } finally {
      setLoading(null);
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
      >
        Export <span className="text-gray-400">▼</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-36">
          {[
            { format: 'html' as const, label: 'Export .HTML' },
            { format: 'txt' as const, label: 'Export .TXT' },
            { format: 'md' as const, label: 'Markdown .MD' },
            { format: 'docx' as const, label: 'Export .DOCX' },
          ].map(({ format, label }) => (
            <button
              key={format}
              onClick={() => void handleExport(format)}
              disabled={loading === format}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
            >
              {loading === format ? <span className="animate-spin text-xs">⟳</span> : null}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9À-ɏ]+/g, '-').replace(/^-|-$/g, '');
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = Object.assign(document.createElement('a'), { href: url, download: filename });
  anchor.click();
  URL.revokeObjectURL(url);
}
