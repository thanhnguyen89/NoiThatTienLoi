'use client';

import type { TinhGonOutlineData } from '@/lib/tinh-gon/types';

interface Props {
  keyword: string;
  targetLength: number;
  outline: TinhGonOutlineData | null;
  loading: boolean;
  error: string;
  source: string;
  warning: string;
  sectionCountWarning: string;
  onRegenerate: () => void;
  onBack: () => void;
  onNext: () => void;
  onPickTitle: (value: string) => void;
  onChangeTitle: (value: string) => void;
  onChangeSection: (id: string, field: 'heading' | 'notes' | 'targetWords', value: string) => void;
  onRemoveSection: (id: string) => void;
  onAddSection: () => void;
  onChangeUserNotes: (value: string) => void;
}

export function OutlineEditor({
  keyword,
  targetLength,
  outline,
  loading,
  error,
  source,
  warning,
  sectionCountWarning,
  onRegenerate,
  onBack,
  onNext,
  onPickTitle,
  onChangeTitle,
  onChangeSection,
  onRemoveSection,
  onAddSection,
  onChangeUserNotes,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Viết tinh gọn</h1>
            <p className="text-sm text-blue-600 mt-1">Bước 2 / 3 — Xem và chỉnh outline</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Quay lại
            </button>
            <button
              type="button"
              onClick={onRegenerate}
              disabled={loading}
              className="px-4 py-2 text-sm border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50"
            >
              {loading ? 'Đang tạo...' : '↻ Tạo lại outline'}
            </button>
          </div>
        </div>
        <div className="mt-4 flex gap-1">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`h-1.5 flex-1 rounded-full ${step <= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      </div>

      {loading && !outline ? (
        <div className="bg-white rounded-lg shadow-sm p-10 text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-gray-700">AI đang dựng outline cho “{keyword}”...</p>
          <p className="text-xs text-gray-400 mt-1">Mục tiêu khoảng {targetLength.toLocaleString()} từ.</p>
        </div>
      ) : (
        outline && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gợi ý tiêu đề</label>
                <div className="flex flex-wrap gap-2">
                  {outline.titleOptions.map((title) => {
                    const active = outline.selectedTitle === title;
                    return (
                      <button
                        key={title}
                        type="button"
                        onClick={() => onPickTitle(title)}
                        className={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                          active
                            ? 'bg-blue-50 border-blue-400 text-blue-700'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                        }`}
                      >
                        {title}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tiêu đề sẽ dùng</label>
                <input
                  value={outline.selectedTitle}
                  onChange={(event) => onChangeTitle(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Các mục H2</label>
                  <button
                    type="button"
                    onClick={onAddSection}
                    className="text-xs px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    + Thêm mục
                  </button>
                </div>

                {sectionCountWarning && (
                  <div className="mb-3 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2">
                    <p className="text-xs text-yellow-800">
                      {sectionCountWarning} Bạn vẫn có thể sang bước generate, nhưng nên chỉnh lại outline cho đẹp hơn.
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  {outline.sections.map((section, index) => (
                    <div key={section.id} className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-sm font-semibold text-gray-700">H2 #{index + 1}</p>
                        <button
                          type="button"
                          onClick={() => onRemoveSection(section.id)}
                          className="text-xs px-2.5 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Xóa
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-[1fr_120px] gap-3">
                        <input
                          value={section.heading}
                          onChange={(event) => onChangeSection(section.id, 'heading', event.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          value={section.targetWords}
                          onChange={(event) => onChangeSection(section.id, 'targetWords', event.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <textarea
                        value={section.notes}
                        onChange={(event) => onChangeSection(section.id, 'notes', event.target.value)}
                        placeholder="Ghi chú ngắn cho section này..."
                        rows={2}
                        className="mt-3 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ghi chú thêm cho lúc generate</label>
                <textarea
                  value={outline.userNotes}
                  onChange={(event) => onChangeUserNotes(event.target.value)}
                  rows={3}
                  placeholder="Ví dụ: giữ giọng văn thực tế hơn, thêm case phòng trọ, nhấn mạnh giao nhanh..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onNext}
                  className="px-8 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <span>Viết bài</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm p-5">
                <p className="text-sm font-semibold text-gray-700 mb-3">Tóm tắt outline</p>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Nguồn outline</p>
                    <p className="font-medium text-gray-700">{source === 'ai' ? 'AI generated' : 'Fallback template'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Search intent</p>
                    <p className="text-gray-700 leading-relaxed">{outline.searchIntent}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Góc tiếp cận</p>
                    <p className="text-gray-700 leading-relaxed">{outline.angle}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Số mục</p>
                    <p className="text-gray-700">{outline.sections.length} H2</p>
                    {sectionCountWarning && (
                      <p className="text-xs text-yellow-700 mt-1">{sectionCountWarning}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Số từ dự kiến</p>
                    <p className="text-gray-700">{outline.estimatedWords.toLocaleString()} từ</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-5">
                <p className="text-sm font-semibold text-gray-700 mb-3">Content gaps cần lấp</p>
                <ul className="space-y-2">
                  {outline.contentGaps.map((gap) => (
                    <li key={gap} className="text-sm text-gray-600">
                      • {gap}
                    </li>
                  ))}
                </ul>
              </div>

              {warning && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-yellow-800">AI có trả về fallback</p>
                  <p className="text-xs text-yellow-700 mt-1">{warning}</p>
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
