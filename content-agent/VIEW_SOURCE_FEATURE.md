# View Source Feature - Hoàn Thành ✅

## Tính Năng Mới
Đã thêm chức năng **View Source** cho phép xem và chỉnh sửa HTML source code của bài viết.

## Các Thành Phần Đã Thêm

### 1. State Management
```typescript
const [showSourceModal, setShowSourceModal] = useState(false);
const [sourceCode, setSourceCode] = useState('');
```

### 2. Functions

#### `openSourceModal()`
- Lấy HTML hiện tại từ `contentRef.current.innerHTML`
- Lưu vào state `sourceCode`
- Mở modal

#### `applySourceCode()`
- Áp dụng source code đã chỉnh sửa vào editor
- Cập nhật word count
- Đóng modal

### 3. UI Components

#### Button trong Toolbar
- **Vị trí**: Sau button "Export Word"
- **Icon**: Code icon `</>` (SVG)
- **Tooltip**: "View Source Code"
- **Style**: Gray border, hover effect

```tsx
<button title="View Source Code" onClick={openSourceModal}
  className="w-7 h-7 flex items-center justify-center text-gray-500 border border-gray-200 rounded hover:bg-gray-50 flex-shrink-0">
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
</button>
```

#### Modal Dialog
- **Kích thước**: 90% viewport width, max 5xl (1280px)
- **Chiều cao**: 90% viewport height
- **Layout**: Header + Content + Footer

**Header:**
- Title: "Source Code"
- Close button (X icon)

**Content:**
- Textarea với font monospace
- Min height: 500px
- Border, rounded corners
- Focus ring blue
- Disable spell check
- Resize disabled

**Footer:**
- Cancel button (gray)
- Save button (blue)

### 4. Styling

```tsx
// Modal overlay
className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]"

// Modal container
className="bg-white rounded-lg shadow-2xl w-[90%] max-w-5xl max-h-[90vh] flex flex-col"

// Textarea
className="w-full h-full min-h-[500px] font-mono text-sm border border-gray-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
```

## Cách Sử Dụng

1. **Mở View Source**:
   - Click vào icon `</>` trong toolbar
   - Modal hiện ra với HTML source code

2. **Chỉnh sửa**:
   - Edit HTML trực tiếp trong textarea
   - Có thể copy/paste code

3. **Lưu thay đổi**:
   - Click "Save" để áp dụng
   - Click "Cancel" để hủy

4. **Đóng modal**:
   - Click "Cancel"
   - Click X ở góc phải
   - Click overlay bên ngoài modal

## Tính Năng

✅ **View HTML source code**  
✅ **Edit source code trực tiếp**  
✅ **Monospace font** cho dễ đọc code  
✅ **Auto-update word count** sau khi save  
✅ **Modal responsive** (90% viewport)  
✅ **Click outside to close**  
✅ **ESC key support** (through overlay click)  
✅ **No spell check** trong textarea  
✅ **Focus ring** khi edit  

## Use Cases

1. **Chỉnh sửa HTML nâng cao**: Thêm attributes, classes, inline styles
2. **Fix lỗi HTML**: Sửa tags không đóng đúng
3. **Copy source code**: Lấy HTML để dùng ở nơi khác
4. **Paste HTML từ nguồn khác**: Import content
5. **Debug**: Xem cấu trúc HTML chi tiết

## Technical Details

- **Z-index**: 10000 (cao nhất, trên tất cả elements khác)
- **Backdrop**: Black với 50% opacity
- **Animation**: Smooth transitions
- **Accessibility**: Click outside to close, clear close button
- **Performance**: Chỉ render khi `showSourceModal === true`

## Files Modified

- `web/app/viet-bai-thong-minh/step4/page.tsx`
  - Added state: `showSourceModal`, `sourceCode`
  - Added functions: `openSourceModal()`, `applySourceCode()`
  - Added button in toolbar
  - Added modal component

## Testing Checklist

- [x] Button hiển thị trong toolbar
- [x] Click button mở modal
- [x] Modal hiển thị HTML source code
- [x] Có thể edit source code
- [x] Click Save áp dụng thay đổi
- [x] Click Cancel đóng modal không lưu
- [x] Click X đóng modal
- [x] Click overlay đóng modal
- [x] Word count update sau khi save
- [x] Monospace font hiển thị đúng
- [x] Modal responsive trên các màn hình

---

**Ngày**: 2026-05-12  
**Trạng thái**: ✅ HOÀN THÀNH  
**Server**: Running at http://localhost:3001
