# Context Menu Debug Guide

## Vấn Đề
Context menu không xuất hiện khi right-click trên text đã chọn.

## Các Bước Debug

### 1. Kiểm Tra Console Logs
Mở Developer Tools (F12) → Console tab

**Logs mong đợi khi trang load:**
```
[Context Menu] Event listeners attached
```

**Logs mong đợi khi right-click:**
```
[Context Menu] Right-click detected
[Context Menu] Selected text: <text bạn đã chọn>
[Context Menu] Showing menu at <x> <y>
```

### 2. Nếu Không Thấy Logs

#### A. ContentRef chưa sẵn sàng
- Check: `[Context Menu] contentRef not ready`
- **Nguyên nhân**: useEffect chạy trước khi contentRef được render
- **Giải pháp**: Đã thêm dependency `[result]` để re-run khi data load

#### B. Event listener không được gắn
- Check: Không có log nào
- **Nguyên nhân**: useEffect không chạy
- **Giải pháp**: Kiểm tra component có render không

### 3. Nếu Thấy "Right-click detected" nhưng không có "Selected text"

**Nguyên nhân**: Không có text được chọn
**Giải pháp**: 
1. Bôi chữ TRƯỚC khi right-click
2. Đảm bảo text được highlight (màu xanh)

### 4. Nếu Thấy "Selected text" nhưng menu không xuất hiện

**Nguyên nhân**: State update không trigger re-render
**Giải pháp**: Check React DevTools → Components → showContextMenu state

### 5. Nếu Menu xuất hiện nhưng biến mất ngay

**Nguyên nhân**: Click handler đóng menu ngay lập tức
**Giải pháp**: Đã thêm `data-context-menu` và check `closest()` để tránh đóng khi click vào menu

## Test Steps

### Test 1: Basic Right-Click
1. Reload trang
2. Check console: `[Context Menu] Event listeners attached`
3. Bôi chữ trong editor
4. Right-click
5. Check console logs
6. Menu phải xuất hiện

### Test 2: Menu Position
1. Right-click ở góc trên trái
2. Menu phải xuất hiện tại vị trí chuột
3. Right-click ở góc dưới phải
4. Menu phải xuất hiện tại vị trí chuột

### Test 3: Click Outside
1. Mở context menu
2. Click ra ngoài menu
3. Menu phải đóng

### Test 4: Click Menu Item
1. Mở context menu
2. Click "Link..."
3. Menu đóng
4. Link modal mở
5. Text đã chọn phải xuất hiện trong modal

## Common Issues

### Issue 1: ContentEditable Conflict
**Triệu chứng**: Right-click không trigger event
**Nguyên nhân**: contentEditable có context menu riêng
**Giải pháp**: `e.preventDefault()` đã được thêm

### Issue 2: Event Bubbling
**Triệu chứng**: Menu đóng ngay khi mở
**Nguyên nhân**: Click event bubble lên document
**Giải pháp**: `e.stopPropagation()` đã được thêm

### Issue 3: Z-Index
**Triệu chứng**: Menu bị che bởi elements khác
**Nguyên nhân**: Z-index không đủ cao
**Giải pháp**: Z-index = 10001 (cao nhất)

### Issue 4: Portal Not Rendering
**Triệu chứng**: Menu không xuất hiện trong DOM
**Nguyên nhân**: `typeof document !== 'undefined'` check fail
**Giải pháp**: Đã thêm check này

## Manual Test in Console

Paste vào browser console để test:

```javascript
// Test 1: Check if contentRef exists
const content = document.querySelector('[contenteditable="true"]');
console.log('ContentRef:', content);

// Test 2: Test selection
const selection = window.getSelection();
console.log('Selection:', selection?.toString());

// Test 3: Simulate right-click
const event = new MouseEvent('contextmenu', {
  bubbles: true,
  cancelable: true,
  clientX: 100,
  clientY: 100
});
content?.dispatchEvent(event);
```

## Expected Behavior

✅ **Bôi chữ** → Text được highlight  
✅ **Right-click** → Browser context menu bị chặn  
✅ **Custom menu xuất hiện** → Tại vị trí chuột  
✅ **Click "Link..."** → Menu đóng, Link modal mở  
✅ **Click outside** → Menu đóng  

## If Still Not Working

### Option 1: Thêm Button Test
Thêm button để test function:

```tsx
<button onClick={() => {
  setContextMenuPos({ x: 100, y: 100 });
  setShowContextMenu(true);
}}>
  Test Context Menu
</button>
```

### Option 2: Check Dependencies
```bash
npm list react react-dom
```

### Option 3: Clear Cache
```bash
rm -rf .next
npm run dev
```

## Current Implementation

**File**: `web/app/viet-bai-thong-minh/step4/page.tsx`

**States**:
- `showContextMenu`: boolean
- `contextMenuPos`: { x: number, y: number }

**Event Listeners**:
- `contextmenu` on contentRef
- `mousedown` on document

**Dependencies**: `[result]`

---

**Next Steps**:
1. Open browser console
2. Reload page
3. Check for logs
4. Report what you see
