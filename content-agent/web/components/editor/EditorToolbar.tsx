'use client';

import type { RefObject } from 'react';

interface EditorToolbarProps {
  editorRef: RefObject<HTMLDivElement | null>;
  disabled?: boolean;
}

function execCmd(command: string, value?: string) {
  document.execCommand(command, false, value);
}

function ToolBtn({
  label,
  title,
  onClick,
  disabled,
}: {
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      title={title}
      disabled={disabled}
      className="px-2.5 py-1.5 text-sm rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed font-mono"
    >
      {label}
    </button>
  );
}

export function EditorToolbar({ disabled }: EditorToolbarProps) {
  const insertLink = () => {
    const url = prompt('Nhập URL:');
    if (url) execCmd('createLink', url);
  };

  const wrapWithTag = (tag: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const element = document.createElement(tag);
    try {
      range.surroundContents(element);
    } catch {
      execCmd('formatBlock', tag);
    }
  };

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-gray-50 flex-wrap sticky top-0 z-10">
      <ToolBtn label="B" title="Bold (Ctrl+B)" onClick={() => execCmd('bold')} disabled={disabled} />
      <ToolBtn label="I" title="Italic (Ctrl+I)" onClick={() => execCmd('italic')} disabled={disabled} />
      <ToolBtn label="U" title="Underline" onClick={() => execCmd('underline')} disabled={disabled} />
      <div className="w-px h-5 bg-gray-300 mx-1" />
      <ToolBtn label="H2" title="Heading 2" onClick={() => wrapWithTag('h2')} disabled={disabled} />
      <ToolBtn label="H3" title="Heading 3" onClick={() => wrapWithTag('h3')} disabled={disabled} />
      <div className="w-px h-5 bg-gray-300 mx-1" />
      <ToolBtn label="ul" title="Bullet list" onClick={() => execCmd('insertUnorderedList')} disabled={disabled} />
      <ToolBtn label="ol" title="Numbered list" onClick={() => execCmd('insertOrderedList')} disabled={disabled} />
      <ToolBtn label="🔗" title="Insert link" onClick={insertLink} disabled={disabled} />
      <div className="w-px h-5 bg-gray-300 mx-1" />
      <ToolBtn label="↩" title="Undo (Ctrl+Z)" onClick={() => execCmd('undo')} disabled={disabled} />
      <ToolBtn label="↪" title="Redo (Ctrl+Y)" onClick={() => execCmd('redo')} disabled={disabled} />
    </div>
  );
}
