'use client';

import { useEffect, useRef, useState } from 'react';
import ModelPicker from '@/app/components/ModelPicker';

export type AiAssistCommand =
  | 'explain'
  | 'title'
  | 'outline'
  | 'shorten'
  | 'rewrite'
  | 'humanize'
  | 'list'
  | 'pros_cons'
  | 'intro'
  | 'conclusion'
  | 'faqs';

const COMMANDS: Array<{ value: AiAssistCommand; label: string; icon: string }> = [
  { value: 'explain', label: 'Giải thích', icon: '💬' },
  { value: 'title', label: 'Đặt tiêu đề', icon: '📝' },
  { value: 'outline', label: 'Tạo outline', icon: '📋' },
  { value: 'shorten', label: 'Rút ngắn', icon: '✂️' },
  { value: 'rewrite', label: 'Viết lại', icon: '🔄' },
  { value: 'humanize', label: 'Humanize', icon: '✨' },
  { value: 'list', label: 'Thành danh sách', icon: '📌' },
  { value: 'pros_cons', label: 'Ưu & Nhược điểm', icon: '⚖️' },
  { value: 'intro', label: 'Viết mở bài', icon: '🚀' },
  { value: 'conclusion', label: 'Viết kết bài', icon: '🏁' },
  { value: 'faqs', label: 'Tạo FAQ', icon: '❓' },
];

interface AiAssistPanelProps {
  selectedText: string;
  selectedElement: HTMLElement | null;
  keyword: string;
  onApply: (newHtml: string, element: HTMLElement | null) => void;
  externalCommand?: { command: AiAssistCommand; nonce: number } | null;
  onExternalCommandHandled?: () => void;
}

export function AiAssistPanel({
  selectedText,
  selectedElement,
  keyword,
  onApply,
  externalCommand,
  onExternalCommandHandled,
}: AiAssistPanelProps) {
  const [model, setModel] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [askFree, setAskFree] = useState('');
  const lastExternalCommandNonceRef = useRef<number | null>(null);

  async function runCommand(command: AiAssistCommand | 'ask') {
    const text = selectedText.trim() || keyword;
    if (!text && command !== 'intro' && command !== 'conclusion') return;

    setLoading(true);
    setAiResult('');

    try {
      const res = await fetch('/api/editor/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          text: text || keyword,
          keyword,
          model,
          freePrompt: command === 'ask' ? askFree : undefined,
        }),
      });

      if (!res.ok || !res.body) throw new Error('Lỗi AI');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6)) as { text?: string; done?: boolean };
            if (data.text) setAiResult((prev) => prev + data.text);
          } catch {
            // ignore malformed chunk
          }
        }
      }
    } catch (error) {
      setAiResult(`Lỗi: ${error instanceof Error ? error.message : 'Không xác định'}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!externalCommand) return;
    if (lastExternalCommandNonceRef.current === externalCommand.nonce) return;

    lastExternalCommandNonceRef.current = externalCommand.nonce;
    void runCommand(externalCommand.command).finally(() => {
      onExternalCommandHandled?.();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalCommand?.command, externalCommand?.nonce]);

  return (
    <div className="p-4 flex flex-col h-full gap-3">
      <div className="text-xs text-gray-500 font-semibold uppercase">Đoạn đã chọn</div>
      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 max-h-28 overflow-y-auto border border-gray-200">
        {selectedText || <span className="text-gray-400 italic">Click vào một đoạn văn bên trái để chọn.</span>}
      </div>

      <ModelPicker value={model} onChange={setModel} size="sm" label="" />

      <div className="grid grid-cols-2 gap-1.5">
        {COMMANDS.map((command) => (
          <button
            key={command.value}
            onClick={() => void runCommand(command.value)}
            disabled={loading}
            className="text-xs px-2 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <span>{command.icon}</span>
            <span>{command.label}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={askFree}
          onChange={(event) => setAskFree(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void runCommand('ask');
            }
          }}
          placeholder="Yêu cầu khác..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => void runCommand('ask')}
          disabled={loading || !askFree.trim()}
          className="px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '⟳' : 'Gửi'}
        </button>
      </div>

      {(aiResult || loading) && (
        <div className="flex-1 flex flex-col gap-2">
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-gray-800 flex-1 overflow-y-auto border border-blue-100 whitespace-pre-wrap">
            {loading && !aiResult ? (
              <span className="animate-pulse text-gray-400">AI đang viết...</span>
            ) : (
              aiResult
            )}
          </div>

          {aiResult && !loading && (
            <button
              onClick={() => onApply(aiResult, selectedElement)}
              className="w-full py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 font-medium"
            >
              ✓ Áp dụng thay thế đoạn đã chọn
            </button>
          )}
        </div>
      )}
    </div>
  );
}
