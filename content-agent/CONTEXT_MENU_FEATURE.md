# Context Menu (Right-Click) Feature - Hoàn Thành ✅

## Tính Năng Mới
Đã thêm **Context Menu** (menu chuột phải) để nhanh chóng tạo link khi bôi chữ và nhấp chuột phải.

## Các Thành Phần Đã Thêm

### 1. State Management
```typescript
const [showContextMenu, setShowContextMenu] = useState(false);
const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
```

### 2. Event Handlers

#### Context Menu Handler (useEffect)
```typescript
useEffect(() => {
  if (!contentRef.current) return;
  
  const handleContextMenu = (e: MouseEvent) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      e.preventDefault(); // Prevent default browser context menu
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    }
  };
  
  const handleClick = () => {
    setShowContextMenu(false); // Close on any click
  };
  
  contentRef.current.addEventListener('contextmenu', handleContextMenu);
  document.addEventListener('click', handleClick);
  
  return () => {
    contentRef.current?.removeEventListener('contextmenu', handleContextMenu);
    document.removeEventListener('click', handleClick);
  };
}, []);
```

### 3. Functions

#### `openLinkFromContextMenu()`
```typescript
function openLinkFromContextMenu() {
  setShowContextMenu(false);
  openLinkModal();
}
```

### 4. UI Component - Context Menu

**Vị trí**: Portal-rendered tại vị trí chuột (clientX, clientY)

**Cấu trúc**:
```tsx
{showContextMenu && typeof document !== 'undefined' && createPortal(
  <div
    style={{
      position: 'fixed',
      top: contextMenuPos.y,
      left: contextMenuPos.x,
      zIndex: 10001,
    }}
    className="bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[180px]"
  >
    <button onClick={openLinkFromContextMenu}>
      <svg>...</svg>
      Link... <span>Ctrl+K</span>
    </button>
  </div>,
  document.body
)}
```

## Styling

### Context Menu Container
- **Position**: Fixed tại vị trí chuột
- **Z-index**: 10001 (cao hơn View Source modal)
- **Background**: White
- **Border**: Gray-200
- **Shadow**: XL shadow
- **Min-width**: 180px
- **Border-radius**: Rounded-lg

### Menu Item (Link Button)
- **Padding**: px-4 py-2
- **Text**: Gray-700
- **Hover**: Blue-50 background, Blue-700 text
- **Icon**: Link icon (4x4)
- **Shortcut**: "Ctrl+K" displayed on right

## Cách Sử Dụng

### Bước 1: Bôi chữ
- Chọn/bôi đen text trong editor

### Bước 2: Nhấp chuột phải
- Click chuột phải trên text đã chọn
- Context menu xuất hiện tại vị trí chuột

### Bước 3: Chọn "Link..."
- Click vào "Link..." trong menu
- Modal Insert/Edit Link mở ra
- Text đã chọn tự động điền vào "Text to display"

### Bước 4: Nhập URL và Save
- Nhập URL vào ô "URL"
- (Optional) Nhập Title
- (Optional) Chọn "Open link in..."
- Click "Save"

## Tính Năng

✅ **Right-click detection** - Chỉ hiện menu khi có text được chọn  
✅ **Position at cursor** - Menu xuất hiện đúng vị trí chuột  
✅ **Portal rendering** - Không bị giới hạn bởi overflow containers  
✅ **Auto-close** - Đóng khi click bất kỳ đâu  
✅ **Prevent default** - Chặn context menu mặc định của browser  
✅ **Icon + Shortcut** - Hiển thị icon link và phím tắt Ctrl+K  
✅ **Smooth transition** - Hover effect mượt mà  
✅ **High z-index** - Luôn hiển thị trên cùng  

## Logic Flow

```
1. User bôi chữ trong editor
2. User nhấp chuột phải
3. Check: Có text được chọn?
   ├─ YES: 
   │   ├─ Prevent default context menu
   │   ├─ Lưu vị trí chuột (clientX, clientY)
   │   └─ Hiển thị custom context menu
   └─ NO: Không làm gì (browser context menu xuất hiện)
4. User click "Link..."
5. Đóng context menu
6. Mở Link modal với text đã chọn
7. User nhập URL và save
8. Link được chèn vào editor
```

## Technical Details

### Event Listeners
- **contextmenu**: Bắt sự kiện chuột phải
- **click**: Đóng menu khi click bất kỳ đâu

### Selection Detection
```typescript
const selection = window.getSelection();
if (selection && selection.toString().trim()) {
  // Có text được chọn → hiện menu
}
```

### Position Calculation
```typescript
setContextMenuPos({ 
  x: e.clientX,  // Vị trí X của chuột
  y: e.clientY   // Vị trí Y của chuột
});
```

### Portal Rendering
- Render vào `document.body`
- Tránh bị clip bởi overflow containers
- Z-index cao để luôn hiển thị trên cùng

## Integration với Link Modal

Context menu tích hợp hoàn hảo với Link Modal hiện có:
1. Gọi `openLinkModal()` - function đã có sẵn
2. Text được chọn tự động điền vào `linkText`
3. Nếu text đã là link, URL được pre-fill
4. Selection được lưu và restore khi insert link

## Browser Compatibility

✅ **Chrome/Edge**: Full support  
✅ **Firefox**: Full support  
✅ **Safari**: Full support  
⚠️ **Mobile**: Context menu không hoạt động (mobile không có right-click)

## Use Cases

1. **Tạo link nhanh**: Bôi chữ → Right-click → Link
2. **Edit link**: Right-click trên link có sẵn → Edit URL
3. **Keyboard alternative**: Thay vì Ctrl+K, có thể dùng chuột phải
4. **Intuitive UX**: Giống các editor phổ biến (Word, Google Docs)

## Future Enhancements (Optional)

- [ ] Thêm các options khác: Bold, Italic, Copy, Cut, Paste
- [ ] Submenu cho formatting options
- [ ] Keyboard navigation (Arrow keys)
- [ ] Context-aware menu (khác nhau cho text, image, table)
- [ ] Custom menu items dựa trên selection type

## Files Modified

- `web/app/viet-bai-thong-minh/step4/page.tsx`
  - Added state: `showContextMenu`, `contextMenuPos`
  - Added useEffect: Context menu event handlers
  - Added function: `openLinkFromContextMenu()`
  - Added UI: Context menu component (Portal-rendered)

## Testing Checklist

- [x] Bôi chữ và nhấp chuột phải → Menu xuất hiện
- [x] Menu xuất hiện đúng vị trí chuột
- [x] Click "Link..." → Link modal mở
- [x] Text đã chọn tự động điền vào modal
- [x] Click bất kỳ đâu → Menu đóng
- [x] Không bôi chữ + right-click → Browser context menu xuất hiện
- [x] Menu không bị clip bởi overflow containers
- [x] Z-index đủ cao để hiển thị trên các elements khác
- [x] Hover effect hoạt động mượt mà
- [x] Icon và shortcut hiển thị đúng

---

**Ngày**: 2026-05-12  
**Trạng thái**: ✅ HOÀN THÀNH  
**Server**: Running at http://localhost:3001
