'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageManagerModal } from './ImageManagerModal';
import { ClassicEditor } from '@ckeditor/ckeditor5-editor-classic';
import { Essentials } from '@ckeditor/ckeditor5-essentials';
import { Paragraph } from '@ckeditor/ckeditor5-paragraph';
import { Bold, Italic, Strikethrough, Underline, Code } from '@ckeditor/ckeditor5-basic-styles';
import { Heading } from '@ckeditor/ckeditor5-heading';
import { FontFamily, FontSize, FontColor, FontBackgroundColor } from '@ckeditor/ckeditor5-font';
import { Alignment } from '@ckeditor/ckeditor5-alignment';
import { BlockQuote } from '@ckeditor/ckeditor5-block-quote';
import { CodeBlock } from '@ckeditor/ckeditor5-code-block';
import { HorizontalLine } from '@ckeditor/ckeditor5-horizontal-line';
import { Link, AutoLink, LinkImage } from '@ckeditor/ckeditor5-link';
import { Image, ImageCaption, ImageResize, ImageStyle, ImageToolbar, ImageUpload, PictureEditing } from '@ckeditor/ckeditor5-image';
import { MediaEmbed } from '@ckeditor/ckeditor5-media-embed';
import { Table, TableCaption, TableCellProperties, TableProperties, TableToolbar } from '@ckeditor/ckeditor5-table';
import { List, ListProperties } from '@ckeditor/ckeditor5-list';
import { Indent, IndentBlock } from '@ckeditor/ckeditor5-indent';
import { Highlight } from '@ckeditor/ckeditor5-highlight';
import { RemoveFormat } from '@ckeditor/ckeditor5-remove-format';
import { SelectAll } from '@ckeditor/ckeditor5-select-all';
import { FindAndReplace } from '@ckeditor/ckeditor5-find-and-replace';
import { SpecialCharacters } from '@ckeditor/ckeditor5-special-characters';
import { Autoformat } from '@ckeditor/ckeditor5-autoformat';
import { WordCount } from '@ckeditor/ckeditor5-word-count';
import { ShowBlocks } from '@ckeditor/ckeditor5-show-blocks';
import { TextPartLanguage } from '@ckeditor/ckeditor5-language';
import { ClipboardPipeline } from '@ckeditor/ckeditor5-clipboard';
import { CloudServices } from '@ckeditor/ckeditor5-cloud-services';
import { Fullscreen, FullscreenEditing, FullscreenUI } from '@ckeditor/ckeditor5-fullscreen';
import { ButtonView } from '@ckeditor/ckeditor5-ui';

const PLUGINS = [
  Essentials,
  Paragraph,
  CloudServices,
  ClipboardPipeline,
  Bold,
  Italic,
  Strikethrough,
  Underline,
  Code,
  Heading,
  FontFamily,
  FontSize,
  FontColor,
  FontBackgroundColor,
  Alignment,
  BlockQuote,
  CodeBlock,
  HorizontalLine,
  Link,
  AutoLink,
  LinkImage,
  Image,
  ImageCaption,
  ImageResize,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  PictureEditing,
  MediaEmbed,
  Table,
  TableCaption,
  TableCellProperties,
  TableProperties,
  TableToolbar,
  List,
  ListProperties,
  Indent,
  IndentBlock,
  Highlight,
  RemoveFormat,
  SelectAll,
  FindAndReplace,
  SpecialCharacters,
  Autoformat,
  WordCount,
  ShowBlocks,
  TextPartLanguage,
  Fullscreen,
  FullscreenEditing,
  FullscreenUI,
];

interface Props {
  value?: string | null;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function CKEditorImpl({ value, onChange, placeholder, disabled }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [showImageManager, setShowImageManager] = useState(false);
  const onChangeRef = useRef(onChange);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const showImageManagerRef = useRef<any>(setShowImageManager);

  useEffect(() => {
    if (onChange) onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let editor: any = null;
    let destroyed = false;

    async function init() {
      if (!containerRef.current) return;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        editor = await (ClassicEditor as any).create(containerRef.current, {
          licenseKey: 'GPL',
          plugins: PLUGINS,
          toolbar: {
            shouldNotGroupWhenFull: false,
            items: [
              'heading',
              'fontFamily',
              'fontSize',
              '|',
              'bold',
              'italic',
              'underline',
              'strikethrough',
              'code',
              '|',
              'fontColor',
              'fontBackgroundColor',
              'highlight',
              '|',
              'alignment',
              '|',
              'bulletedList',
              'numberedList',
              'outdent',
              'indent',
              '|',
              'link',
              'blockQuote',
              'codeBlock',
              'horizontalLine',
              '|',
              'imageUpload',
              'imageLibrary',
              'mediaEmbed',
              'insertTable',
              'specialCharacters',
              '|',
              'selectAll',
              'findAndReplace',
              '|',
              'showBlocks',
              'fullScreen',
              'textPartLanguage',
              'removeFormat',
              '|',
              'undo',
              'redo',
            ],
          },
          heading: {
            options: [
              { model: 'paragraph', title: 'Đoạn văn', class: 'ck-heading_paragraph' },
              { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_h1' },
              { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_h2' },
              { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_h3' },
              { model: 'heading4', view: 'h4', title: 'Heading 4', class: 'ck-heading_h4' },
              { model: 'heading5', view: 'h5', title: 'Heading 5', class: 'ck-heading_h5' },
              { model: 'heading6', view: 'h6', title: 'Heading 6', class: 'ck-heading_h6' },
            ],
          },
          fontFamily: {
            options: [
              'default',
              'Arial, Helvetica, sans-serif',
              'Verdana, Geneva, sans-serif',
              'Times New Roman, Times, serif',
              'Courier New, Courier, monospace',
              'Georgia, serif',
              'Tahoma, Geneva, sans-serif',
              'Trebuchet MS, sans-serif',
              'Palatino Linotype, serif',
              'Roboto, sans-serif',
              'Open Sans, sans-serif',
            ],
            supportAllValues: true,
          },
          fontSize: {
            options: [
              { title: '8px', model: '8px' },
              { title: '10px', model: '10px' },
              { title: '12px', model: '12px' },
              { title: '14px', model: '14px' },
              { title: '16px', model: '16px' },
              { title: '18px', model: '18px' },
              { title: '20px', model: '20px' },
              { title: '24px', model: '24px' },
              { title: '28px', model: '28px' },
              { title: '32px', model: '32px' },
              { title: '36px', model: '36px' },
              { title: '48px', model: '48px' },
              { title: '64px', model: '64px' },
            ],
            supportAllValues: true,
          },
          fontColor: { columns: 8, documentColors: 16 },
          fontBackgroundColor: { columns: 8, documentColors: 16 },
          highlight: {
            options: [
              { model: 'yellowMarker', class: 'marker-yellow', title: 'Đánh dấu vàng', color: '#ffff00', type: 'marker' },
              { model: 'greenMarker', class: 'marker-green', title: 'Đánh dấu xanh lá', color: '#00ff00', type: 'marker' },
              { model: 'pinkMarker', class: 'marker-pink', title: 'Đánh dấu hồng', color: '#ff69b4', type: 'marker' },
              { model: 'blueMarker', class: 'marker-blue', title: 'Đánh dấu xanh dương', color: '#00bfff', type: 'marker' },
              { model: 'redPen', class: 'pen-red', title: 'Bút đỏ', color: '#ff0000', type: 'pen' },
              { model: 'greenPen', class: 'pen-green', title: 'Bút xanh', color: '#00aa00', type: 'pen' },
            ],
          },
          alignment: { options: ['left', 'right', 'center', 'justify'] },
          image: {
            toolbar: [
              'imageTextAlternative',
              'toggleImageCaption',
              '|',
              'imageStyle:inline',
              'imageStyle:wrapText',
              'imageStyle:breakText',
              '|',
              'resizeImage',
              '|',
              'linkImage',
            ],
          },
          mediaEmbed: {
            previewsInData: true,
            providers: ['youtube', 'vimeo', 'dailymotion', 'spotify', 'soundcloud'],
          },
          table: {
            contentToolbar: [
              'tableColumn', 'tableRow', 'mergeTableCells',
              'tableProperties', 'tableCellProperties', 'tableCaption',
            ],
          },
          list: {
            properties: { styles: true, startIndex: true, reversed: true },
          },
          codeBlock: {
            languages: [
              { language: 'plaintext', label: 'Văn bản thuần' },
              { language: 'javascript', label: 'JavaScript' },
              { language: 'typescript', label: 'TypeScript' },
              { language: 'python', label: 'Python' },
              { language: 'html', label: 'HTML' },
              { language: 'css', label: 'CSS' },
              { language: 'sql', label: 'SQL' },
              { language: 'json', label: 'JSON' },
              { language: 'php', label: 'PHP' },
              { language: 'java', label: 'Java' },
              { language: 'csharp', label: 'C#' },
              { language: 'cpp', label: 'C++' },
              { language: 'bash', label: 'Bash' },
            ],
          },
          language: { content: 'vi', ui: 'vi' },
          placeholder: placeholder || 'Nhập nội dung...',
        });

        if (destroyed) {
          editor.destroy();
          return;
        }

        // Setup custom upload adapter
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fileRepo = editor.plugins.get('FileRepository') as any;
          if (fileRepo) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            fileRepo.createUploadAdapter = (loader: any) => {
              return {
                upload: async () => {
                  const file = await loader.file;
                  const fd = new FormData();
                  fd.append('files', file);
                  const res = await fetch('/admin/api/upload', { method: 'POST', body: fd });
                  const json = await res.json();
                  if (json.success && json.data?.[0]?.url) {
                    return { default: json.data[0].url };
                  }
                  throw new Error(json.error || 'Upload failed');
                },
                abort: () => {},
              };
            };
          }
        } catch (e) {
          console.warn('[CKEditor] FileRepository not available:', e);
        }

        // Add "Chọn ảnh từ thư viện" button
        editor.ui.componentFactory.add('imageLibrary', (locale: { t: (key: string) => string }) => {
          const btn = new ButtonView(locale as any);
          btn.set({
            label: 'Chọn ảnh từ thư viện',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H4zm12 12.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
              <path d="M10 14.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
              <path fill-rule="evenodd" d="M4 3h12l-1.5 2H9L7.5 3H4zm0 4h8l1 1.5H5L4 7zm0 5h6l.5 1H7L6 12zm0 5h4l.5 1H7l-.5-1z"/>
            </svg>`,
            tooltip: true,
            withText: false,
          });
          btn.on('execute', () => showImageManagerRef.current(true));
          return btn;
        });

        editor.model.document.on('change:data', () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = (editor as any).getData();
          onChangeRef.current?.(data);
        });

        if (disabled) {
          editor.enableReadOnlyMode('rich-text-editor');
        }

        editorRef.current = editor;

        const safeValue = typeof value === 'string' ? value : '';
        if (safeValue) editor.setData(safeValue);
        setReady(true);
      } catch (err: any) {
        console.error('[CKEditor] Init error:', err);
        console.error('[CKEditor] message:', err?.message);
        console.error('[CKEditor] cause:', err?.cause);
        console.error('[CKEditor] stack:', err?.stack);
      }
    }

    init();

    return () => {
      destroyed = true;
      if (editorRef.current) {
        editorRef.current.destroy().catch(() => {});
        editorRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes
  useEffect(() => {
    if (!ready || !editorRef.current) return;
    const currentValue = typeof value === 'string' ? value : '';
    if (editorRef.current.getData() !== currentValue) {
      editorRef.current.setData(currentValue);
    }
  }, [value, ready]);

  // Handle disabled state changes
  useEffect(() => {
    if (!editorRef.current) return;
    if (disabled) {
      editorRef.current.enableReadOnlyMode('rich-text-editor');
    } else {
      editorRef.current.disableReadOnlyMode('rich-text-editor');
    }
  }, [disabled]);

  const insertImage = (url: string) => {
    const editor = editorRef.current;
    if (!editor || typeof url !== 'string') return;
    const viewFragment = editor.data.processor.toView(
      '<figure class="image image_resized" style="width:75%;"><img src="' + url + '" alt="" /></figure>'
    );
    const modelFragment = editor.data.toModel(viewFragment);
    editor.model.insertContent(modelFragment);
    editor.editing.view.focus();
  };

  return (
    <div>
      <div ref={containerRef} style={{ display: ready ? 'block' : 'none' }} />
      {!ready && (
        <div style={{
          minHeight: 400,
          background: '#f9f9f9',
          border: '1px solid #dee2e6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          flexDirection: 'column',
          gap: 8,
        }}>
          <span style={{
            width: 24,
            height: 24,
            border: '3px solid #e0e0e0',
            borderTopColor: '#0d6efd',
            borderRadius: '50%',
            animation: 'ckeditor-spin 0.8s linear infinite',
          }} />
          <span style={{ color: '#6c757d', fontSize: 14 }}>Đang tải editor...</span>
          <style>{`@keyframes ckeditor-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      <ImageManagerModal
        isOpen={showImageManager}
        onClose={() => setShowImageManager(false)}
        onSelect={(url) => {
          insertImage(url);
          setShowImageManager(false);
        }}
      />
    </div>
  );
}
