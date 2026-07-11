# Fix Paragraph Dropdown - Dùng Portal như Color Picker

## Vấn đề
Paragraph dropdown không hiển thị menu vì bị che bởi `overflow: hidden` của container cha.

## Giải pháp
Dùng `createPortal` để render menu ra ngoài DOM tree, giống như Color picker đang làm.

## Các bước thực hiện

### Bước 1: Đã hoàn thành ✅
- Thêm `paragraphBtnRef` 
- Thêm `paragraphDropPos` state
- Update button onClick để tính toán vị trí

### Bước 2: Di chuyển menu dropdown ra ngoài

**Tìm đoạn code này (khoảng dòng 1268-1360):**

```tsx
{formatMenuOpen && (
  <>
    {/* Overlay để đóng menu khi click ra ngoài */}
    <div className="fixed inset-0 z-[100]" onClick={() => { setFormatMenuOpen(false); setOpenSubmenu(null); }} />

    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-[110] py-1">
      {/* ... toàn bộ menu content ... */}
    </div>
  </>
)}
```

**XÓA toàn bộ đoạn code trên** (từ `{formatMenuOpen &&` đến `)}` cuối cùng của nó)

### Bước 3: Thêm Portal vào cuối component

**Tìm đoạn code Portal của Color picker (khoảng dòng 1526):**

```tsx
{/* ── Color picker & Font size — rendered via Portal to escape overflow ─── */}
{typeof document !== 'undefined' && showColorPicker && createPortal(
  ...
)}
```

**THÊM code sau ngay sau Font size portal:**

```tsx
{/* ── Paragraph format menu — rendered via Portal ─── */}
{typeof document !== 'undefined' && formatMenuOpen && createPortal(
  <div data-toolbar-dropdown="paragraph">
    {/* Overlay */}
    <div 
      style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
      onClick={() => { setFormatMenuOpen(false); setOpenSubmenu(null); }}
    />
    
    {/* Main menu */}
    <div
      style={{ position: 'fixed', top: paragraphDropPos.top, left: paragraphDropPos.left, zIndex: 9999 }}
      className="w-48 bg-white border border-gray-200 rounded-md shadow-xl py-1"
    >
      {(
        [
          {
            key: 'headings',
            label: 'Headings',
            items: ['H1','H2','H3','H4','H5','H6'].map((h) => ({
              label: `Heading ${h.slice(1)}`,
              cls: '',
              action: () => execFormat('formatBlock', h.toLowerCase()),
            })),
          },
          {
            key: 'inline',
            label: 'Inline',
            items: [
              { label: 'Bold',          cls: 'font-bold',    action: () => execFormat('bold') },
              { label: 'Italic',        cls: 'italic',       action: () => execFormat('italic') },
              { label: 'Underline',     cls: 'underline',    action: () => execFormat('underline') },
              { label: 'Strikethrough', cls: 'line-through', action: () => execFormat('strikeThrough') },
              { label: 'Superscript',   cls: '',             action: () => execFormat('superscript') },
              { label: 'Subscript',     cls: '',             action: () => execFormat('subscript') },
              { label: 'Code',          cls: 'font-mono text-pink-600', action: () => wrapSelection('code') },
            ],
          },
          {
            key: 'blocks',
            label: 'Blocks',
            items: [
              { label: '¶ Paragraph',  cls: '', action: () => execFormat('formatBlock', 'p') },
              { label: '" Blockquote', cls: '', action: () => execFormat('formatBlock', 'blockquote') },
              { label: '</> Pre',       cls: 'font-mono', action: () => execFormat('formatBlock', 'pre') },
            ],
          },
          {
            key: 'align',
            label: 'Align',
            items: [
              { label: '⬅ Left',    cls: '', action: () => execFormat('justifyLeft') },
              { label: '↔ Center',  cls: '', action: () => execFormat('justifyCenter') },
              { label: '➡ Right',   cls: '', action: () => execFormat('justifyRight') },
              { label: '⇔ Justify', cls: '', action: () => execFormat('justifyFull') },
            ],
          },
        ] as const
      ).map((menu) => (
        <div
          key={menu.key}
          className="relative"
          onMouseEnter={() => setOpenSubmenu(menu.key)}
          onMouseLeave={() => setOpenSubmenu(null)}
        >
          {/* Trigger row */}
          <button
            type="button"
            className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between transition-colors ${
              openSubmenu === menu.key ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-blue-50'
            }`}
          >
            {menu.label}
            <span className="text-gray-400">›</span>
          </button>

          {/* Submenu */}
          {openSubmenu === menu.key && (
            <div 
              style={{ position: 'absolute', left: '100%', top: 0, zIndex: 10000 }}
              className="w-40 bg-white border border-gray-200 rounded-md shadow-xl py-1"
            >
              {menu.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    item.action();
                    setFormatMenuOpen(false);
                    setOpenSubmenu(null);
                  }}
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
  document.body
)}
```

### Bước 4: Update useEffect để đóng menu khi click ra ngoài

**Tìm useEffect này (khoảng dòng 364):**

```tsx
useEffect(() => {
  if (!showColorPicker && !showFontSizeMenu) return;
  
  const handler = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-toolbar-dropdown]')) {
      setShowColorPicker(false);
      setShowFontSizeMenu(false);
    }
  };
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
}, [showColorPicker, showFontSizeMenu]);
```

**THAY THÀNH:**

```tsx
useEffect(() => {
  if (!showColorPicker && !showFontSizeMenu && !formatMenuOpen) return;
  
  const handler = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-toolbar-dropdown]')) {
      setShowColorPicker(false);
      setShowFontSizeMenu(false);
      setFormatMenuOpen(false);
      setOpenSubmenu(null);
    }
  };
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
}, [showColorPicker, showFontSizeMenu, formatMenuOpen]);
```

## Kết quả

Sau khi hoàn thành:
1. Click vào "Paragraph ▾" → menu hiện ra
2. Hover vào Headings/Inline/Blocks/Align → submenu hiện bên phải
3. Click chọn option → format được áp dụng
4. Click ra ngoài → menu tự đóng

## Tại sao cách này hoạt động?

- **createPortal**: Render menu ra ngoài DOM tree, thoát khỏi `overflow: hidden`
- **position: fixed**: Menu không bị ảnh hưởng bởi scroll hoặc position của parent
- **Tọa độ tính toán**: Dùng `getBoundingClientRect()` để đặt menu đúng vị trí
- **z-index cao**: Đảm bảo menu luôn hiển thị trên cùng

## Debug

Nếu vẫn không hoạt động:
1. Mở Console (F12)
2. Click "Paragraph" → xem có log lỗi không
3. Kiểm tra `paragraphDropPos` có giá trị đúng không
4. Kiểm tra menu có được render trong `<body>` không (dùng Inspect Element)
