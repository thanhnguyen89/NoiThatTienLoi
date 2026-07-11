'use client';

import { useState, useRef } from 'react';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'json' | 'csv', includeSecrets: boolean) => void;
  onImport: (data: any[], overwrite: boolean) => void;
}

export default function ImportExportModal({ isOpen, onClose, onExport, onImport }: ImportExportModalProps) {
  const [tab, setTab] = useState<'export' | 'import'>('export');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [includeSecrets, setIncludeSecrets] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [importData, setImportData] = useState<any[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        if (!Array.isArray(data)) {
          setParseError('File phải chứa một mảng các cấu hình website');
          return;
        }

        setImportData(data);
        setParseError(null);
      } catch (error) {
        setParseError('Không thể đọc file JSON. Vui lòng kiểm tra định dạng.');
        setImportData(null);
      }
    };
    reader.readAsText(file);
  }

  function handleExport() {
    onExport(exportFormat, includeSecrets);
    onClose();
  }

  function handleImport() {
    if (!importData) return;
    onImport(importData, overwrite);
    onClose();
    // Reset
    setImportData(null);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose() {
    onClose();
    // Reset state
    setTab('export');
    setImportData(null);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Xuất / Nhập Cấu Hình</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-4 pb-0">
          {[
            { key: 'export', label: '↓ Xuất cấu hình', icon: '📤' },
            { key: 'import', label: '↑ Nhập cấu hình', icon: '📥' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as 'export' | 'import')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Export Tab */}
          {tab === 'export' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Định dạng file</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'json', label: 'JSON', desc: 'Dễ đọc, có thể nhập lại' },
                    { value: 'csv', label: 'CSV', desc: 'Mở bằng Excel' },
                  ].map(format => (
                    <label
                      key={format.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        exportFormat === format.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="format"
                        value={format.value}
                        checked={exportFormat === format.value}
                        onChange={e => setExportFormat(e.target.value as 'json' | 'csv')}
                        className="mt-0.5 accent-blue-600"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{format.label}</p>
                        <p className="text-xs text-gray-500">{format.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSecrets}
                    onChange={e => setIncludeSecrets(e.target.checked)}
                    className="mt-0.5 accent-yellow-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-yellow-900">Bao gồm mật khẩu và API keys</p>
                    <p className="text-xs text-yellow-700">
                      ⚠️ Cẩn thận! File sẽ chứa thông tin nhạy cảm. Không chia sẻ file này.
                    </p>
                  </div>
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  💡 <strong>Lưu ý:</strong> File xuất sẽ chứa tất cả cấu hình website hiện tại. Bạn có thể nhập lại
                  file này để khôi phục hoặc chuyển sang hệ thống khác.
                </p>
              </div>
            </>
          )}

          {/* Import Tab */}
          {tab === 'import' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Chọn file JSON</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {parseError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">⚠️ {parseError}</p>
                </div>
              )}

              {importData && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    ✓ Đã đọc thành công <strong>{importData.length}</strong> cấu hình website
                  </p>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwrite}
                    onChange={e => setOverwrite(e.target.checked)}
                    className="mt-0.5 accent-yellow-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-yellow-900">Ghi đè cấu hình trùng tên</p>
                    <p className="text-xs text-yellow-700">
                      Nếu đã có website cùng tên, cấu hình mới sẽ thay thế cấu hình cũ
                    </p>
                  </div>
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  💡 <strong>Lưu ý:</strong> File JSON phải có định dạng đúng (mảng các object cấu hình). Bạn có thể
                  xuất file mẫu từ tab &quot;Xuất cấu hình&quot;.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={handleClose}
            className="px-5 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Hủy
          </button>

          {tab === 'export' ? (
            <button
              onClick={handleExport}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              📤 Xuất file {exportFormat.toUpperCase()}
            </button>
          ) : (
            <button
              onClick={handleImport}
              disabled={!importData}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              📥 Nhập {importData?.length || 0} website
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
