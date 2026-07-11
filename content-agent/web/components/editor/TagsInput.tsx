'use client';

import { useState, type KeyboardEvent } from 'react';

interface TagsInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagsInput({ tags, onChange }: TagsInputProps) {
  const [input, setInput] = useState('');

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    onChange([...tags, trimmed]);
    setInput('');
  }

  function removeTag(tag: string) {
    onChange(tags.filter((item) => item !== tag));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag(input);
    }

    if (event.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center p-3 border border-gray-300 rounded-lg bg-white min-h-[44px]">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
        >
          {tag}
          <button onClick={() => removeTag(tag)} className="hover:text-blue-900 leading-none">×</button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? 'Thêm tag, nhấn Enter...' : ''}
        className="flex-1 min-w-24 text-sm outline-none bg-transparent"
      />
    </div>
  );
}
