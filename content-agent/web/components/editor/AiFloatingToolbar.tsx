'use client';

import type { AiAssistCommand } from './AiAssistPanel';

interface AiFloatingToolbarProps {
  visible: boolean;
  x: number;
  y: number;
  disabled?: boolean;
  onCommand: (command: AiAssistCommand) => void;
}

const QUICK_COMMANDS: Array<{ value: AiAssistCommand; label: string }> = [
  { value: 'shorten', label: 'Rút ngắn' },
  { value: 'rewrite', label: 'Viết lại' },
  { value: 'humanize', label: 'Humanize' },
  { value: 'explain', label: 'Giải thích' },
];

export function AiFloatingToolbar({ visible, x, y, disabled, onCommand }: AiFloatingToolbarProps) {
  if (!visible) return null;

  return (
    <div
      style={{ left: x, top: y }}
      className="fixed z-[60] -translate-x-1/2 -translate-y-full mb-2 flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 shadow-lg"
    >
      {QUICK_COMMANDS.map((command) => (
        <button
          key={command.value}
          onMouseDown={(event) => {
            event.preventDefault();
            if (!disabled) onCommand(command.value);
          }}
          className="px-2 py-1 text-xs rounded-full hover:bg-blue-50 text-gray-700 disabled:opacity-40"
          disabled={disabled}
        >
          {command.label}
        </button>
      ))}
    </div>
  );
}
