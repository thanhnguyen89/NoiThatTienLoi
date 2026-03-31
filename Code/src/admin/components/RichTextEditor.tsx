'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageManagerModal } from './ImageManagerModal';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Module-level flag to prevent double-init from React Strict Mode
// Each instance uses its own containerRef as key
const initializingSet = new WeakSet<HTMLDivElement>();

export function RichTextEditor({ value, onChange, placeholder, disabled }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [showImageManager, setShowImageManager] = useState(false);
  const [ready, setReady] = useState(false);
  const showImageManagerRef = useRef(setShowImageManager);
  showImageManagerRef.current = setShowImageManager;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Already initializing or initialized for this container
    if (initializingSet.has(container)) return;
    initializingSet.add(container);

    // Inject CKEditor CSS once
    if (!document.getElementById('ckeditor5-css')) {
      const link = document.createElement('link');
      link.id = 'ckeditor5-css';
      link.rel = 'stylesheet';
      link.href = '/admin/assets/ckeditor5.css';
      document.head.appendChild(link);
    }

    async function init() {
      const ck = await import('ckeditor5') as any;
      if (!containerRef.current || editorRef.current) return;

      const plugins = [
        ck.Essentials, ck.Paragraph,
        ck.Bold, ck.Italic, ck.Underline, ck.Strikethrough,
        ck.Heading, ck.FontFamily, ck.FontSize, ck.FontColor, ck.FontBackgroundColor,
        ck.Alignment, ck.BlockQuote, ck.Link,
        ck.Image, ck.ImageUpload, ck.ImageToolbar, ck.ImageCaption, ck.ImageStyle, ck.ImageResize,
        ck.MediaEmbed, ck.Table, ck.TableToolbar,
        ck.List, ck.Indent,
        ck.HorizontalLine, ck.SpecialCharacters, ck.SpecialCharactersEssentials,
        ck.Highlight, ck.RemoveFormat,
      ].filter(Boolean);

      const editor = await ck.ClassicEditor.create(containerRef.current, {
        licenseKey: 'GPL',
        plugins,
        toolbar: {
          items: [
            'heading', '|',
            'fontFamily', 'fontSize', '|',
            'bold', 'italic', 'underline', 'strikethrough', '|',
            'fontColor', 'fontBackgroundColor', 'highlight', '|',
            'alignment', '|',
            'bulletedList', 'numberedList', '|',
            'outdent', 'indent', '|',
            'link', 'blockQuote', 'horizontalLine', '|',
            'imageUpload', 'imageLibrary', 'mediaEmbed', '|',
            'insertTable', '|',
            'specialCharacters', 'removeFormat', '|',
            'undo', 'redo',
          ],
        },
        heading: {
          options: [
            { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
            { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_h1' },
            { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_h2' },
            { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_h3' },
            { model: 'heading4', view: 'h4', title: 'Heading 4', class: 'ck-heading_h4' },
          ],
        },
        fontFamily: {
          options: ['default', 'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia', 'Tahoma'],
          supportAllValues: true,
        },
        fontSize: {
          options: [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 48],
          supportAllValues: true,
        },
        image: {
          toolbar: ['imageTextAlternative', 'toggleImageCaption', '|', 'imageStyle:inline', 'imageStyle:block', 'imageStyle:side', '|', 'resizeImage'],
        },
        table: {
          contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'],
        },
        placeholder: placeholder || 'Nhap noi dung...',
        extraPlugins: [
          function uploadPlugin(ed: any) {
            if (ed.plugins.has('FileRepository')) {
              ed.plugins.get('FileRepository').createUploadAdapter = (loader: any) => ({
                upload: async () => {
                  const file = await loader.file;
                  const fd = new FormData();
                  fd.append('files', file);
                  const res = await fetch('/admin/api/upload', { method: 'POST', body: fd });
                  const json = await res.json();
                  if (json.success && json.data?.[0]?.url) return { default: json.data[0].url };
                  throw new Error(json.error || 'Upload failed');
                },
                abort: () => {},
              });
            }
            if (ck.ButtonView) {
              ed.ui.componentFactory.add('imageLibrary', (locale: any) => {
                const btn = new ck.ButtonView(locale);
                btn.set({
                  label: 'Chon anh tu thu vien',
                  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2 3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2zm0 1h16v8.5l-4-4-4 5-3-3-5 5V4zm4 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>',
                  tooltip: true,
                });
                btn.on('execute', () => showImageManagerRef.current(true));
                return btn;
              });
            }
          },
        ],
      });

      editorRef.current = editor;
      if (value) editor.setData(value);
      editor.model.document.on('change:data', () => {
        const data = editor.getData();
        console.log('[RichTextEditor] onChange called, data length:', data.length, 'data:', data.substring(0, 100));
        onChange(data);
      });
      if (disabled) editor.enableReadOnlyMode('disabled');
      setReady(true);
    }

    init().catch(console.error);

    return () => {
      // Remove from set so a real unmount can re-init
      if (container) initializingSet.delete(container);
      if (editorRef.current) {
        editorRef.current.destroy().catch(() => {});
        editorRef.current = null;
        setReady(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !editorRef.current) return;
    if (editorRef.current.getData() !== value) {
      editorRef.current.setData(value || '');
    }
  }, [value, ready]);

  function insertImage(url: string) {
    const editor = editorRef.current;
    if (!editor) return;
    const viewFragment = editor.data.processor.toView(`<figure class="image"><img src="${url}" alt="" /></figure>`);
    const modelFragment = editor.data.toModel(viewFragment);
    editor.model.insertContent(modelFragment);
    editor.editing.view.focus();
  }

  return (
    <div>
      {!ready && (
        <div style={{ minHeight: 300, background: '#f9f9f9', border: '1px solid #dee2e6', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="text-muted small">Dang tai editor...</span>
        </div>
      )}
      <div ref={containerRef} style={{ display: ready ? 'block' : 'none' }} />
      <ImageManagerModal
        isOpen={showImageManager}
        onClose={() => setShowImageManager(false)}
        onSelect={(url) => { insertImage(url); setShowImageManager(false); }}
      />
    </div>
  );
}
