'use client';

/* eslint-disable @next/next/no-img-element */

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';

interface RichArticleEditorProps {
  html: string;
  streaming?: boolean;
  wordCount?: number;
  keyword?: string;
  articleTitle?: string;
  fullWidth?: boolean;
  onChange: (html: string) => void;
  onSave?: () => void;
  onNewArticle?: () => void;
  onClearHighlights?: () => void;
}

function stripFindHighlights(value: string) {
  return value.replace(/<mark class="find-highlight"[^>]*>([\s\S]*?)<\/mark>/gi, '$1');
}

function unwrapElement(element: HTMLElement) {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
}

function stripEditorHighlights(value: string) {
  const cleanValue = stripFindHighlights(value);
  if (!cleanValue.includes('data-fix-hl')) {
    return cleanValue;
  }

  if (typeof document === 'undefined') {
    return cleanValue;
  }

  const container = document.createElement('div');
  container.innerHTML = cleanValue;

  container.querySelectorAll('[data-fix-hl]').forEach((node) => {
    const element = node as HTMLElement;

    if (element.getAttribute('data-fix-inline') === 'true' || element.tagName === 'MARK') {
      unwrapElement(element);
      return;
    }

    element.removeAttribute('data-fix-hl');
    element.removeAttribute('data-fix-inline');
    element.style.background = '';
    element.style.borderLeft = '';
    element.style.paddingLeft = '';
    element.style.borderRadius = '';
    element.style.outline = '';
    element.style.boxShadow = '';
    element.style.fontWeight = '';
    if (!element.getAttribute('style')) {
      element.removeAttribute('style');
    }
  });

  return container.innerHTML;
}

function buildFindRegex(term: string, matchCase: boolean, wholeWord: boolean, flags = ''): RegExp {
  let escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (wholeWord) escaped = `\\b${escaped}\\b`;
  const finalFlags = (matchCase ? '' : 'i') + flags;
  return new RegExp(`(${escaped})`, finalFlags);
}

function applyFindHighlights(value: string, term: string, matchCase: boolean, wholeWord: boolean) {
  const cleanValue = stripFindHighlights(value);
  const query = term.trim();
  if (!query) return cleanValue;
  const regex = buildFindRegex(query, matchCase, wholeWord, 'g');
  return cleanValue.replace(
    regex,
    '<mark class="find-highlight" style="background:#fef08a;border-radius:2px;padding:0 1px">$1</mark>',
  );
}

export function RichArticleEditor({
  html,
  streaming,
  wordCount,
  keyword,
  articleTitle,
  fullWidth,
  onChange,
  onSave,
  onNewArticle,
  onClearHighlights,
}: RichArticleEditorProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const fontBtnRef = useRef<HTMLButtonElement>(null);
  const paragraphBtnRef = useRef<HTMLButtonElement>(null);
  const tableBtnRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  // Toolbar dropdowns
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const [currentFontSize, setCurrentFontSize] = useState('14px');
  const [colorDropPos, setColorDropPos] = useState({ top: 0, left: 0 });
  const [fontDropPos, setFontDropPos] = useState({ top: 0, left: 0 });
  const [paragraphDropPos, setParagraphDropPos] = useState({ top: 0, left: 0 });
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [tableGridSize, setTableGridSize] = useState({ rows: 0, cols: 0 });
  const [tableDropPos, setTableDropPos] = useState({ top: 0, left: 0 });
  const [hasHighlights, setHasHighlights] = useState(false);

  // Link modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkTarget, setLinkTarget] = useState('_self');

  // Image modal
  const [showImgModal, setShowImgModal] = useState(false);
  const [imgUrl, setImgUrl] = useState('');
  const [imgAlt, setImgAlt] = useState('');
  const [imgTitle, setImgTitle] = useState('');
  const [imgWidth, setImgWidth] = useState('');
  const [imgHeight, setImgHeight] = useState('');
  const [imgModalTab, setImgModalTab] = useState<'general' | 'upload'>('general');

  // Source modal
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [sourceCode, setSourceCode] = useState('');

  // Find & Replace
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [activeFindTerm, setActiveFindTerm] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findCount, setFindCount] = useState<number | null>(null);
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [findInSel, setFindInSel] = useState(false);
  const [showFindOpts, setShowFindOpts] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const editorNode = contentRef.current;
    if (!editorNode) return;

    const handleHighlightSync = () => {
      setHasHighlights(Boolean(editorNode.querySelector('[data-fix-hl], mark.find-highlight')));
    };

    editorNode.addEventListener('editor-highlight-sync', handleHighlightSync);
    return () => editorNode.removeEventListener('editor-highlight-sync', handleHighlightSync);
  }, []);

  // Sync html prop → editor DOM
  useEffect(() => {
    if (!contentRef.current) return;
    if (contentRef.current.innerHTML !== html) {
      contentRef.current.innerHTML = html;
    }
    if (activeFindTerm.trim()) {
      contentRef.current.innerHTML = applyFindHighlights(contentRef.current.innerHTML, activeFindTerm.trim(), matchCase, wholeWord);
    }
    setHasHighlights(Boolean(contentRef.current.querySelector('[data-fix-hl], mark.find-highlight')));
  }, [activeFindTerm, html, matchCase, wholeWord]);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!showColorPicker && !showFontSizeMenu && !formatMenuOpen && !showTableMenu) return;
    const handler = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('[data-toolbar-dropdown]')) {
        setShowColorPicker(false);
        setShowFontSizeMenu(false);
        setFormatMenuOpen(false);
        setShowTableMenu(false);
        setOpenSubmenu(null);
        setTableGridSize({ rows: 0, cols: 0 });
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showColorPicker, showFontSizeMenu, formatMenuOpen, showTableMenu]);

  // Ctrl+S / Ctrl+H shortcuts
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        if (document.activeElement === contentRef.current || contentRef.current?.contains(document.activeElement)) {
          event.preventDefault();
          onSave?.();
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        setShowFindReplace(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onSave]);

  function handleContentInput() {
    if (!contentRef.current) return;
    syncHighlightState();
    onChange(stripEditorHighlights(contentRef.current.innerHTML));
  }

  function syncHighlightState() {
    if (!contentRef.current) {
      setHasHighlights(false);
      return;
    }
    setHasHighlights(Boolean(contentRef.current.querySelector('[data-fix-hl], mark.find-highlight')));
  }

  function execFormat(command: string, value?: string) {
    document.execCommand(command, false, value);
    contentRef.current?.focus();
    handleContentInput();
  }

  function wrapSelection(tag: string) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    if (!selectedText) return;
    const wrapper = document.createElement(tag);
    wrapper.textContent = selectedText;
    range.deleteContents();
    range.insertNode(wrapper);
    selection.removeAllRanges();
    contentRef.current?.focus();
    handleContentInput();
  }

  function saveSelection() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    if (!savedRangeRef.current) return;
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(savedRangeRef.current);
  }

  function openLinkModal() {
    saveSelection();
    const selection = window.getSelection();
    setLinkText(selection?.toString() || '');
    setShowLinkModal(true);
  }

  function insertLink() {
    if (!linkUrl.trim()) return;
    restoreSelection();
    const displayText = linkText.trim() || linkUrl.trim();
    const titleAttr = linkTitle ? ` title="${linkTitle}"` : '';
    const targetAttr = linkTarget !== '_self' ? ` target="${linkTarget}" rel="noopener noreferrer"` : '';
    document.execCommand('insertHTML', false, `<a href="${linkUrl.trim()}"${titleAttr}${targetAttr}>${displayText}</a>`);
    contentRef.current?.focus();
    setShowLinkModal(false);
    setLinkUrl('');
    setLinkText('');
    setLinkTitle('');
    setLinkTarget('_self');
    handleContentInput();
  }

  function applyColor(color: string) {
    setCurrentColor(color);
    setShowColorPicker(false);
    contentRef.current?.focus();
    document.execCommand('foreColor', false, color);
    handleContentInput();
  }

  function applyFontSize(size: string) {
    setCurrentFontSize(size);
    setShowFontSizeMenu(false);
    contentRef.current?.focus();
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const text = selection.toString();
    document.execCommand('insertHTML', false, `<span style="font-size:${size}">${text}</span>`);
    handleContentInput();
  }

  function handleImgFileUpload(file: File) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImgUrl(dataUrl);
      if (!imgAlt && keyword) setImgAlt(keyword);
    };
    reader.readAsDataURL(file);
  }

  function insertImage() {
    if (!imgUrl.trim()) return;
    const alt = imgAlt.trim() || keyword || '';
    const title = imgTitle.trim();
    const width = imgWidth.trim();
    const height = imgHeight.trim();
    const style = ['max-width:100%', 'border-radius:8px', 'display:inline-block', width ? `width:${width}px` : '', height ? `height:${height}px` : '']
      .filter(Boolean).join(';');
    const figHtml = `<figure style="margin:1.25rem 0;text-align:center">
      <img src="${imgUrl.trim()}" alt="${alt}"${title ? ` title="${title}"` : ''} style="${style}" loading="lazy" />
      ${alt ? `<figcaption style="font-size:0.8rem;color:#6b7280;margin-top:0.4rem">${alt}</figcaption>` : ''}
    </figure>`;
    restoreSelection();
    document.execCommand('insertHTML', false, figHtml);
    contentRef.current?.focus();
    setImgUrl(''); setImgAlt(''); setImgTitle(''); setImgWidth(''); setImgHeight('');
    setImgModalTab('general');
    setShowImgModal(false);
    handleContentInput();
  }

  function insertTableWithSize(rows: number, cols: number) {
    const tableHtml = `<table style="width:100%;border-collapse:collapse;margin:1rem 0">
      ${Array.from({ length: rows }, (_, ri) =>
        `<tr>${Array.from({ length: cols }, (_, ci) => {
          const tag = ri === 0 ? 'th' : 'td';
          return `<${tag} style="border:1px solid #d1d5db;padding:8px 12px">${ri === 0 ? `Cột ${ci + 1}` : 'Nội dung'}</${tag}>`;
        }).join('')}</tr>`
      ).join('')}
    </table>`;
    restoreSelection();
    document.execCommand('insertHTML', false, tableHtml);
    setShowTableMenu(false);
    setTableGridSize({ rows: 0, cols: 0 });
    handleContentInput();
  }

  function clearFixHighlights() {
    if (!contentRef.current) return;
    contentRef.current.querySelectorAll('[data-fix-hl], mark.find-highlight').forEach((node) => {
      const element = node as HTMLElement;
      if (element.matches('mark.find-highlight') || element.getAttribute('data-fix-inline') === 'true' || element.tagName === 'MARK') {
        unwrapElement(element);
      } else {
        element.removeAttribute('data-fix-hl');
        element.removeAttribute('data-fix-inline');
        element.style.background = '';
        element.style.borderLeft = '';
        element.style.paddingLeft = '';
        element.style.borderRadius = '';
        element.style.outline = '';
        element.style.boxShadow = '';
        element.style.fontWeight = '';
        if (!element.getAttribute('style')) {
          element.removeAttribute('style');
        }
      }
    });
    setActiveFindTerm('');
    setFindText('');
    setFindCount(null);
    setReplaceText('');
    setShowFindOpts(false);
    syncHighlightState();
    handleContentInput();
    onClearHighlights?.();
  }

  function exportToWord() {
    const editorHtml = stripEditorHighlights(contentRef.current?.innerHTML ?? html);
    const title = articleTitle || 'bai-viet';
    const wordHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${title}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.6;margin:2cm}
        h1{font-size:18pt;font-weight:bold;margin-bottom:12pt}
        h2{font-size:14pt;font-weight:bold;margin-top:18pt;margin-bottom:6pt}
        h3{font-size:12pt;font-weight:bold;margin-top:12pt;margin-bottom:4pt}
        p{margin-bottom:8pt}
        table{border-collapse:collapse;width:100%;margin:10pt 0}
        td,th{border:1px solid #999;padding:5pt 8pt}
        th{background:#f0f0f0;font-weight:bold}
        ul,ol{padding-left:20pt;margin-bottom:8pt}
        li{margin-bottom:3pt}
        img{max-width:100%}
      </style></head>
      <body>${editorHtml}</body></html>`;
    const blob = new Blob(['﻿', wordHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${title.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '-') || 'bai-viet'}.doc`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function openSourceModal() {
    if (!contentRef.current) return;
    setSourceCode(stripEditorHighlights(contentRef.current.innerHTML));
    setShowSourceModal(true);
  }

  function applySourceCode() {
    if (!contentRef.current) return;
    contentRef.current.innerHTML = sourceCode;
    handleContentInput();
    setShowSourceModal(false);
  }

  function handleFind() {
    if (!contentRef.current || !findText.trim()) return;
    let source = stripFindHighlights(contentRef.current.innerHTML);
    const term = findText.trim();
    if (findInSel) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && sel.toString().trim()) source = sel.toString();
    }
    const regex = buildFindRegex(term, matchCase, wholeWord, 'g');
    const matches = (source.match(regex) || []).length;
    setFindCount(matches);
    if (findInSel) {
      setActiveFindTerm('');
      return;
    }
    setActiveFindTerm(term);
    contentRef.current.innerHTML = applyFindHighlights(source, term, matchCase, wholeWord);
    syncHighlightState();
  }

  function handleReplaceAll() {
    if (!contentRef.current || !findText.trim()) return;
    const term = findText.trim();
    setActiveFindTerm(term);
    const regex = buildFindRegex(term, matchCase, wholeWord, 'g');
    const newHtml = stripFindHighlights(contentRef.current.innerHTML).replace(regex, replaceText);
    contentRef.current.innerHTML = applyFindHighlights(newHtml, term, matchCase, wholeWord);
    setFindCount((newHtml.match(buildFindRegex(term, matchCase, wholeWord, 'g')) || []).length);
    handleContentInput();
  }

  function handleReplaceOne() {
    if (!contentRef.current || !findText.trim()) return;
    const term = findText.trim();
    setActiveFindTerm(term);
    const regex = buildFindRegex(term, matchCase, wholeWord);
    const newHtml = stripFindHighlights(contentRef.current.innerHTML).replace(regex, replaceText);
    contentRef.current.innerHTML = applyFindHighlights(newHtml, term, matchCase, wholeWord);
    setFindCount((newHtml.match(buildFindRegex(term, matchCase, wholeWord, 'g')) || []).length);
    handleContentInput();
  }

  function closeFindReplace() {
    setShowFindReplace(false);
    setShowFindOpts(false);
    setFindCount(null);
  }

  const displayedWordCount = wordCount ?? 0;
  const articleFrameClass = fullWidth
    ? 'article-body bg-white rounded-sm shadow-sm w-full px-12 py-10 min-h-[600px] focus:outline-none'
    : 'article-body bg-white rounded-sm shadow-sm mx-auto px-12 py-10 min-h-[600px] max-w-3xl focus:outline-none';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ─── Toolbar ─── */}
      <div className="border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto">

          {/* Paragraph dropdown */}
          <div className="relative flex-shrink-0" data-toolbar-dropdown="paragraph">
            <button
              ref={paragraphBtnRef}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const rect = paragraphBtnRef.current?.getBoundingClientRect();
                if (rect) setParagraphDropPos({ top: rect.bottom + 4, left: rect.left });
                setFormatMenuOpen(!formatMenuOpen);
                setShowColorPicker(false);
                setShowFontSizeMenu(false);
              }}
              className="h-7 px-2 text-xs border border-gray-200 rounded text-gray-600 hover:bg-gray-50 focus:outline-none flex items-center gap-1"
            >
              Paragraph <span className="text-gray-400">▾</span>
            </button>
          </div>

          <div className="h-5 border-l border-gray-100 mx-1 flex-shrink-0" />

          {/* H2 / H3 */}
          {['H2', 'H3'].map((heading) => (
            <button
              key={heading}
              onClick={() => execFormat('formatBlock', heading.toLowerCase())}
              className="px-2 py-0.5 text-xs font-bold text-gray-600 border border-gray-200 rounded hover:bg-gray-50 flex-shrink-0"
            >
              {heading}
            </button>
          ))}

          <div className="h-5 border-l border-gray-100 mx-1 flex-shrink-0" />

          {/* Color picker */}
          <div className="flex-shrink-0" data-toolbar-dropdown="color">
            <button
              ref={colorBtnRef}
              title="Màu chữ"
              onClick={() => {
                const rect = colorBtnRef.current?.getBoundingClientRect();
                if (rect) setColorDropPos({ top: rect.bottom + 4, left: rect.left });
                setShowColorPicker((v) => !v);
                setShowFontSizeMenu(false);
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
            >
              <span className="relative inline-block w-3.5 h-3.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10M12 3L5 17h14L12 3z" />
                </svg>
                <span className="absolute bottom-0 left-0 right-0 h-1 rounded" style={{ backgroundColor: currentColor }} />
              </span>
              <svg className="w-2.5 h-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Font size */}
          <div className="flex-shrink-0" data-toolbar-dropdown="font">
            <button
              ref={fontBtnRef}
              title="Cỡ chữ"
              onClick={() => {
                const rect = fontBtnRef.current?.getBoundingClientRect();
                if (rect) setFontDropPos({ top: rect.bottom + 4, left: rect.left });
                setShowFontSizeMenu((v) => !v);
                setShowColorPicker(false);
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50 min-w-[52px]"
            >
              <span>{currentFontSize}</span>
              <svg className="w-2.5 h-2.5 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <div className="h-5 border-l border-gray-100 mx-1 flex-shrink-0" />

          {/* B / I / U */}
          {[
            { icon: 'B', cmd: 'bold', cls: 'font-bold' },
            { icon: 'I', cmd: 'italic', cls: 'italic' },
            { icon: 'U', cmd: 'underline', cls: 'underline' },
          ].map((tool) => (
            <button
              key={tool.cmd}
              onClick={() => execFormat(tool.cmd)}
              className={`w-7 h-7 text-xs ${tool.cls} text-gray-600 border border-gray-200 rounded hover:bg-gray-50 flex-shrink-0`}
            >
              {tool.icon}
            </button>
          ))}

          <div className="h-5 border-l border-gray-100 mx-1 flex-shrink-0" />

          {/* Align */}
          {[
            { title: 'Align left', cmd: 'justifyLeft', svg: 'M3 6h18M3 12h12M3 18h15' },
            { title: 'Align center', cmd: 'justifyCenter', svg: 'M3 6h18M6 12h12M4 18h16' },
            { title: 'Align right', cmd: 'justifyRight', svg: 'M3 6h18M9 12h12M6 18h15' },
          ].map((align) => (
            <button
              key={align.cmd}
              title={align.title}
              onClick={() => execFormat(align.cmd)}
              className="w-7 h-7 flex items-center justify-center text-gray-500 border border-gray-200 rounded hover:bg-gray-50 flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={align.svg} />
              </svg>
            </button>
          ))}

          <div className="h-5 border-l border-gray-100 mx-1 flex-shrink-0" />

          {/* ul / ol */}
          <button onClick={() => execFormat('insertUnorderedList')} title="Danh sách gạch đầu dòng"
            className="w-7 h-7 flex items-center justify-center text-gray-500 border border-gray-200 rounded hover:bg-gray-50 flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
          <button onClick={() => execFormat('insertOrderedList')} title="Danh sách đánh số"
            className="w-7 h-7 flex items-center justify-center text-gray-500 border border-gray-200 rounded hover:bg-gray-50 flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
            </svg>
          </button>

          <div className="h-5 border-l border-gray-100 mx-1 flex-shrink-0" />

          {/* Link */}
          <button title="Chèn / sửa link" onClick={openLinkModal}
            className="w-7 h-7 flex items-center justify-center text-gray-500 border border-gray-200 rounded hover:bg-gray-50 flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>

          {/* Image */}
          <button title="Chèn hình ảnh" onClick={() => { saveSelection(); setShowImgModal(true); }}
            className="w-7 h-7 flex items-center justify-center text-gray-500 border border-gray-200 rounded hover:bg-gray-50 flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Table */}
          <button
            ref={tableBtnRef}
            title="Chèn bảng"
            onClick={() => {
              saveSelection();
              const rect = tableBtnRef.current?.getBoundingClientRect();
              if (rect) setTableDropPos({ top: rect.bottom + 4, left: rect.left });
              setShowTableMenu(!showTableMenu);
              setShowColorPicker(false);
              setShowFontSizeMenu(false);
              setFormatMenuOpen(false);
            }}
            className="w-7 h-7 flex items-center justify-center text-gray-500 border border-gray-200 rounded hover:bg-gray-50 flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M6 3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6a3 3 0 013-3z" />
            </svg>
          </button>

          <div className="h-5 border-l border-gray-100 mx-1 flex-shrink-0" />

          {/* Undo / Redo */}
          <button title="Undo" onClick={() => execFormat('undo')}
            className="w-7 h-7 flex items-center justify-center text-gray-500 border border-gray-200 rounded hover:bg-gray-50 flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6" />
            </svg>
          </button>
          <button title="Redo" onClick={() => execFormat('redo')}
            className="w-7 h-7 flex items-center justify-center text-gray-500 border border-gray-200 rounded hover:bg-gray-50 flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6M21 10l-6-6" />
            </svg>
          </button>

          {/* Find & Replace */}
          <button
            title="Tìm & Thay thế (Ctrl+H)"
            onClick={() => setShowFindReplace(true)}
            className={`w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-50 flex-shrink-0 transition-colors ${
              showFindReplace ? 'bg-blue-50 border-blue-300 text-blue-600' : 'text-gray-500 border-gray-200'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Clear highlights */}
          {hasHighlights && (
            <button
              title="Xóa tô đỏ vùng đã fix"
              onClick={clearFixHighlights}
              className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-red-600 border border-red-300 bg-red-50 rounded hover:bg-red-100 flex-shrink-0 transition-colors"
            >
              🧹 Xóa highlight
            </button>
          )}

          {/* Export Word */}
          <button title="Xuất file Word (.doc)" onClick={exportToWord}
            className="w-7 h-7 flex items-center justify-center text-blue-700 border border-blue-200 rounded hover:bg-blue-50 flex-shrink-0 font-bold text-xs">
            W↓
          </button>

          {/* View Source */}
          <button title="View Source Code" onClick={openSourceModal}
            className="w-7 h-7 flex items-center justify-center text-gray-500 border border-gray-200 rounded hover:bg-gray-50 flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </button>

          <div className="flex-1" />

          {/* Word count */}
          <span className="text-xs text-gray-400 flex-shrink-0 mr-1">{displayedWordCount.toLocaleString()} từ ✏️</span>

          {onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={streaming}
              title="Lưu bài viết vào database (Ctrl+S)"
              className="px-2 py-1 text-xs font-semibold text-blue-700 border border-blue-200 rounded hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 flex-shrink-0"
            >
              Lưu
            </button>
          )}

          {/* New article button */}
          {onNewArticle && (
            <button onClick={onNewArticle}
              className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded flex-shrink-0">
              Bài mới
            </button>
          )}
        </div>
      </div>

      {/* ─── Find & Replace bar ─── */}
      {showFindReplace && (
        <div className="absolute top-[52px] left-1/2 -translate-x-1/2 z-40 w-[480px] bg-white rounded-xl shadow-2xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">Find and Replace</span>
            <button onClick={closeFindReplace} className="text-gray-400 hover:text-gray-700 text-xl leading-none w-6 h-6 flex items-center justify-center">×</button>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text" value={findText}
                onChange={(e) => { setFindText(e.target.value); setFindCount(null); }}
                onKeyDown={(e) => e.key === 'Enter' && handleFind()}
                placeholder="Find" autoFocus
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-300"
              />
              <button onClick={handleFind} className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-400">🔍</button>
            </div>
            <input
              type="text" value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleReplaceOne()}
              placeholder="Replace with"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-300"
            />
            {findCount !== null && (
              <p className={`text-xs ${findCount > 0 ? 'text-gray-500' : 'text-red-500'}`}>
                {findCount > 0 ? `Tìm thấy ${findCount} kết quả` : 'Không tìm thấy kết quả nào'}
              </p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <div className="relative">
                <button
                  onClick={() => setShowFindOpts(!showFindOpts)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs transition-colors ${showFindOpts ? 'bg-gray-100 border-gray-300' : 'border-gray-200 hover:bg-gray-50'} text-gray-500`}
                >
                  ⚙ <span className="text-[10px]">▾</span>
                </button>
                {showFindOpts && (
                  <div className="absolute bottom-full left-0 mb-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                    {[
                      { label: 'Match case', state: matchCase, set: setMatchCase },
                      { label: 'Find whole words only', state: wholeWord, set: setWholeWord },
                      { label: 'Find in selection', state: findInSel, set: setFindInSel },
                    ].map((option) => (
                      <button key={option.label}
                        onClick={() => { option.set(!option.state); setFindCount(null); }}
                        className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${option.state ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <span>{option.label}</span>
                        {option.state && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1" />
              <button onClick={handleFind} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">Find</button>
              <button onClick={handleReplaceOne} disabled={!findText.trim()} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40">Replace</button>
              <button onClick={handleReplaceAll} disabled={!findText.trim()} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40">Replace all</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Editor area ─── */}
      <div className="flex-1 overflow-y-auto bg-gray-100 p-6 relative">
        {streaming && !html ? (
          <div className={articleFrameClass}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-blue-700">AI đang viết bài...</p>
            </div>
            {html && <div className="whitespace-pre-wrap text-xs text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />}
          </div>
        ) : (
          <div
            ref={contentRef}
            contentEditable={!streaming}
            suppressContentEditableWarning
            className={articleFrameClass}
            onInput={handleContentInput}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                onSave?.();
              }
            }}
          />
        )}
      </div>

      {/* ─── Portal dropdowns ─── */}
      {mounted && showColorPicker && createPortal(
        <div data-toolbar-dropdown
          style={{ position: 'fixed', top: colorDropPos.top, left: colorDropPos.left, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-lg shadow-xl p-3 w-52"
        >
          <p className="text-xs font-medium text-gray-500 mb-2">Màu cơ bản</p>
          <div className="grid grid-cols-8 gap-1 mb-3">
            {['#000000','#374151','#6B7280','#9CA3AF','#D1D5DB','#F3F4F6','#FFFFFF','#EF4444','#F97316','#EAB308','#22C55E','#3B82F6','#8B5CF6','#EC4899','#DC2626','#EA580C','#CA8A04','#16A34A','#2563EB','#7C3AED','#DB2777','#FEF2F2','#FFF7ED','#FEFCE8','#F0FDF4','#EFF6FF','#F5F3FF','#FDF2F8','#FCA5A5','#FDBA74','#FDE047','#86EFAC','#93C5FD','#C4B5FD','#F9A8D4'].map((color) => (
              <button key={color} onClick={() => applyColor(color)}
                style={{ backgroundColor: color }}
                className={`w-5 h-5 rounded border border-gray-200 hover:scale-110 transition-transform ${color === '#FFFFFF' ? 'border-gray-400' : ''}`}
                title={color}
              />
            ))}
          </div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Màu tùy chỉnh</p>
          <div className="flex items-center gap-2">
            <input type="color" value={currentColor} onChange={(e) => setCurrentColor(e.target.value)} className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5" />
            <input type="text" value={currentColor}
              onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setCurrentColor(e.target.value); }}
              className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
              maxLength={7}
            />
            <button onClick={() => applyColor(currentColor)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">OK</button>
          </div>
        </div>,
        document.body,
      )}

      {mounted && showFontSizeMenu && createPortal(
        <div data-toolbar-dropdown
          style={{ position: 'fixed', top: fontDropPos.top, left: fontDropPos.left, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-lg shadow-xl py-1 w-28"
        >
          {['10px','12px','13px','14px','15px','16px','18px','20px','22px','24px','28px','32px','36px','48px'].map((size) => (
            <button key={size} onClick={() => applyFontSize(size)}
              className={`w-full px-3 py-1 text-left text-xs hover:bg-blue-50 hover:text-blue-700 transition-colors ${size === currentFontSize ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
            >
              {size}
            </button>
          ))}
        </div>,
        document.body,
      )}

      {mounted && formatMenuOpen && createPortal(
        <div data-toolbar-dropdown="paragraph">
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => { setFormatMenuOpen(false); setOpenSubmenu(null); }} />
          <div style={{ position: 'fixed', top: paragraphDropPos.top, left: paragraphDropPos.left, zIndex: 9999 }}
            className="w-48 bg-white border border-gray-200 rounded-lg shadow-xl py-1"
          >
            {([
              { key: 'headings', label: 'Headings', items: ['H1','H2','H3','H4','H5','H6'].map((h) => ({ label: `Heading ${h.slice(1)}`, cls: '', action: () => execFormat('formatBlock', h.toLowerCase()) })) },
              { key: 'inline', label: 'Inline', items: [
                { label: 'Bold', cls: 'font-bold', action: () => execFormat('bold') },
                { label: 'Italic', cls: 'italic', action: () => execFormat('italic') },
                { label: 'Underline', cls: 'underline', action: () => execFormat('underline') },
                { label: 'Strikethrough', cls: 'line-through', action: () => execFormat('strikeThrough') },
                { label: 'Code', cls: 'font-mono text-pink-600', action: () => wrapSelection('code') },
              ]},
              { key: 'blocks', label: 'Blocks', items: [
                { label: '¶ Paragraph', cls: '', action: () => execFormat('formatBlock', 'p') },
                { label: '" Blockquote', cls: '', action: () => execFormat('formatBlock', 'blockquote') },
                { label: '</> Pre', cls: 'font-mono', action: () => execFormat('formatBlock', 'pre') },
              ]},
              { key: 'align', label: 'Align', items: [
                { label: '≡ Left', cls: '', action: () => execFormat('justifyLeft') },
                { label: '≡ Center', cls: '', action: () => execFormat('justifyCenter') },
                { label: '≡ Right', cls: '', action: () => execFormat('justifyRight') },
                { label: '≡ Justify', cls: '', action: () => execFormat('justifyFull') },
              ]},
            ] as const).map((menu) => (
              <div key={menu.key} className="relative" onMouseEnter={() => setOpenSubmenu(menu.key)} onMouseLeave={() => setOpenSubmenu(null)}>
                <button type="button"
                  className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between transition-colors ${openSubmenu === menu.key ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-blue-50'}`}
                >
                  {menu.label}
                  <span className="text-gray-400">›</span>
                </button>
                {openSubmenu === menu.key && (
                  <div style={{ position: 'absolute', left: '100%', top: 0, zIndex: 10000 }} className="w-40 bg-white border border-gray-200 rounded-lg shadow-xl py-1">
                    {menu.items.map((item) => (
                      <button key={item.label} type="button"
                        onClick={() => { item.action(); setFormatMenuOpen(false); setOpenSubmenu(null); }}
                        className={`w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors ${item.cls}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}

      {mounted && showTableMenu && createPortal(
        <div data-toolbar-dropdown="table">
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => { setShowTableMenu(false); setTableGridSize({ rows: 0, cols: 0 }); }} />
          <div style={{ position: 'fixed', top: tableDropPos.top, left: tableDropPos.left, zIndex: 9999 }}
            className="bg-white border border-gray-200 rounded-lg shadow-xl p-3"
          >
            <p className="text-xs text-gray-500 mb-2 text-center font-medium">
              {tableGridSize.rows > 0 && tableGridSize.cols > 0 ? `${tableGridSize.rows} × ${tableGridSize.cols}` : 'Chọn kích thước'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 18px)', gap: '2px' }}>
              {Array.from({ length: 100 }, (_, index) => {
                const row = Math.floor(index / 10) + 1;
                const col = (index % 10) + 1;
                const isHighlighted = row <= tableGridSize.rows && col <= tableGridSize.cols;
                return (
                  <div key={index}
                    onMouseEnter={() => setTableGridSize({ rows: row, cols: col })}
                    onClick={(e) => { e.stopPropagation(); insertTableWithSize(row, col); }}
                    style={{ width: 18, height: 18, border: '1px solid #d1d5db', cursor: 'pointer', backgroundColor: isHighlighted ? '#3b82f6' : '#ffffff', transition: 'background-color 0.1s ease' }}
                  />
                );
              })}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ─── Link modal ─── */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowLinkModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-[440px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Chèn / Sửa liên kết</h3>
              <button onClick={() => setShowLinkModal(false)} className="text-gray-400 hover:text-gray-700 text-xl w-6 h-6 flex items-center justify-center">×</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">URL *</label>
                <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && insertLink()} placeholder="https://example.com" autoFocus className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Văn bản hiển thị</label>
                <input type="text" value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="Để trống = dùng URL" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tiêu đề (title)</label>
                <input type="text" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Hiển thị khi hover" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mở link trong</label>
                <select value={linkTarget} onChange={(e) => setLinkTarget(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                  <option value="_self">Cửa sổ hiện tại</option>
                  <option value="_blank">Cửa sổ mới (_blank)</option>
                  <option value="_parent">Khung cha (_parent)</option>
                  <option value="_top">Toàn bộ cửa sổ (_top)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={() => { setShowLinkModal(false); setLinkUrl(''); setLinkText(''); setLinkTitle(''); setLinkTarget('_self'); }} className="flex-1 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Huỷ</button>
              <button onClick={insertLink} disabled={!linkUrl.trim()} className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium">Chèn link</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Image modal ─── */}
      {showImgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowImgModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-[480px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Chèn / Sửa hình ảnh</h3>
              <button onClick={() => setShowImgModal(false)} className="text-gray-400 hover:text-gray-700 text-xl w-6 h-6 flex items-center justify-center">×</button>
            </div>
            <div className="flex border-b border-gray-100">
              {(['general', 'upload'] as const).map((tab) => (
                <button key={tab} onClick={() => setImgModalTab(tab)}
                  className={`px-5 py-2.5 text-xs font-medium transition-colors ${imgModalTab === tab ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {tab === 'general' ? 'Chung' : 'Tải lên'}
                </button>
              ))}
            </div>
            <div className="p-5">
              {imgModalTab === 'general' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nguồn ảnh (URL) *</label>
                    <input type="url" value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} placeholder="https://example.com/image.jpg" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Alt text (SEO)</label>
                    <input type="text" value={imgAlt} onChange={(e) => setImgAlt(e.target.value)} placeholder={keyword || 'Mô tả hình ảnh...'} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tiêu đề ảnh (title)</label>
                    <input type="text" value={imgTitle} onChange={(e) => setImgTitle(e.target.value)} placeholder="Hiển thị khi hover..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Chiều rộng (px)</label>
                      <input type="number" value={imgWidth} onChange={(e) => setImgWidth(e.target.value)} placeholder="auto" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Chiều cao (px)</label>
                      <input type="number" value={imgHeight} onChange={(e) => setImgHeight(e.target.value)} placeholder="auto" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                  </div>
                  {imgUrl && (
                    <img src={imgUrl} alt="preview" className="w-full h-32 object-contain rounded-lg border border-gray-200 bg-gray-50" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  )}
                </div>
              ) : (
                <div>
                  <label
                    className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleImgFileUpload(file); }}
                  >
                    <span className="text-xs text-gray-500 mb-1">Kéo thả ảnh vào đây</span>
                    <span className="text-xs text-gray-400">hoặc</span>
                    <span className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded-lg">Chọn file</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImgFileUpload(file); }} />
                  </label>
                  {imgUrl?.startsWith('data:') && (
                    <div className="mt-3">
                      <img src={imgUrl} alt="preview" className="w-full h-32 object-contain rounded-lg border border-gray-200 bg-gray-50" />
                      <p className="text-xs text-green-600 mt-1 text-center">✅ Ảnh đã tải lên — nhấn &quot;Chèn ảnh&quot; để chèn vào bài</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={() => { setShowImgModal(false); setImgUrl(''); setImgAlt(''); setImgTitle(''); setImgWidth(''); setImgHeight(''); setImgModalTab('general'); }} className="flex-1 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Huỷ</button>
              <button onClick={insertImage} disabled={!imgUrl.trim()} className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium">Chèn ảnh</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Source modal ─── */}
      {showSourceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]" onClick={() => setShowSourceModal(false)}>
          <div className="bg-white rounded-lg shadow-2xl w-[90%] max-w-5xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Source Code</h2>
              <button onClick={() => setShowSourceModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <textarea
                value={sourceCode}
                onChange={(e) => setSourceCode(e.target.value)}
                className="w-full h-full min-h-[500px] font-mono text-sm border border-gray-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                spellCheck={false}
              />
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button onClick={() => setShowSourceModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={applySourceCode} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
