'use client';

import { useCallback, useEffect, useRef } from 'react';
import { EditorToolbar } from './EditorToolbar';

interface ArticleEditorProps {
  html: string;
  streaming?: boolean;
  onChange: (html: string) => void;
  onParagraphSelect?: (text: string, element: HTMLElement) => void;
}

export function ArticleEditor({ html, streaming, onChange, onParagraphSelect }: ArticleEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== html) {
      editorRef.current.innerHTML = html;
    }
  }, [html]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const handleClick = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !editorRef.current) return;
    const node = selection.anchorNode;
    if (!node) return;

    let element: HTMLElement | null = node instanceof HTMLElement ? node : node.parentElement;
    while (element && element !== editorRef.current) {
      if (['P', 'H1', 'H2', 'H3', 'LI'].includes(element.tagName)) {
        onParagraphSelect?.(element.innerText, element);
        return;
      }
      element = element.parentElement;
    }
  }, [onParagraphSelect]);

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar editorRef={editorRef} disabled={streaming} />
      <div
        ref={editorRef}
        contentEditable={!streaming}
        suppressContentEditableWarning
        onInput={handleInput}
        onClick={handleClick}
        className={`
          flex-1 overflow-y-auto p-6 outline-none
          prose prose-sm max-w-none
          [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4
          [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3
          [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-2
          [&_p]:text-gray-800 [&_p]:leading-relaxed [&_p]:mb-3
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3
          [&_strong]:font-semibold
          [&_a]:text-blue-600 [&_a]:underline
          ${streaming ? 'cursor-not-allowed opacity-80 bg-gray-50' : 'bg-white cursor-text'}
        `}
      />
    </div>
  );
}
