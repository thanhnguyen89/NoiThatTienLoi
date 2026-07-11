'use client';

export function KeyboardShortcutsHelp({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const mod = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    { keys: `${mod} + N`, desc: 'Thêm website mới' },
    { keys: `${mod} + K`, desc: 'Tìm kiếm' },
    { keys: `${mod} + E`, desc: 'Xuất cấu hình' },
    { keys: `${mod} + I`, desc: 'Nhập cấu hình' },
    { keys: `${mod} + R`, desc: 'Làm mới danh sách' },
    { keys: `${mod} + A`, desc: 'Chọn tất cả' },
    { keys: 'ESC', desc: 'Đóng modal / Bỏ chọn' },
    { keys: '?', desc: 'Hiển thị phím tắt' },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">⌨️ Phím Tắt</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-2">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">{shortcut.desc}</span>
              <kbd className="px-3 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono font-semibold text-gray-700">
                {shortcut.keys}
              </kbd>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
