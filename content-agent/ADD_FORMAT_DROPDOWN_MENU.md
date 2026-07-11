# Thêm Format Dropdown Menu - Hoàn tất

## Tính năng mới
Thay thế dropdown `<select>` đơn giản bằng custom dropdown menu với submenu như trong hình.

## Cấu trúc menu

### 1. **Headings** submenu
- Heading 1 (H1)
- Heading 2 (H2)
- Heading 3 (H3)
- Heading 4 (H4)
- Heading 5 (H5)
- Heading 6 (H6)

### 2. **Inline** submenu
- **Bold** - In đậm
- *Italic* - In nghiêng
- <u>Underline</u> - Gạch chân
- ~~Strikethrough~~ - Gạch ngang
- Superscript - Chỉ số trên (x²)
- Subscript - Chỉ số dưới (H₂O)
- `Code` - Inline code (màu hồng)

### 3. **Blocks** submenu
- ✓ Paragraph - Đoạn văn thường (mặc định)
- Blockquote - Trích dẫn
- Div - Container
- **Pre** - Preformatted text (highlight xanh)

### 4. **Align** submenu
- **Left** - Căn trái (mặc định, highlight xanh)
- Center - Căn giữa
- Right - Căn phải
- Justify - Căn đều

## Các thay đổi code

### 1. Thêm state
**File: `web/app/viet-bai-thong-minh/step4/page.tsx`**

```typescript
const [formatMenuOpen, setFormatMenuOpen] = useState(false);
```

### 2. Thêm hàm wrapSelection
Để wrap text với tag `<code>`:

```typescript
function wrapSelection(tag: string) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  
  const range = selection.getRangeAt(0);
  const selectedText = range.toString();
  
  if (!selectedText) return;
  
  const wrapper = document.createElement(tag);
  wrapper.textContent = selectedText;
  
  range.deleteContents();
  range.insertNode(wrapper);
  
  selection.removeAllRanges();
  contentRef.current?.focus();
}
```

### 3. Thay thế dropdown
**Trước:**
```tsx
<select onChange={(e) => execFormat('formatBlock', e.target.value)}>
  <option value="p">Paragraph</option>
  <option value="h1">H1</option>
  <option value="h2">H2</option>
  <option value="h3">H3</option>
  <option value="h4">H4</option>
</select>
```

**Sau:**
```tsx
<div className="relative">
  <button onClick={() => setFormatMenuOpen(!formatMenuOpen)}>
    Paragraph ▾
  </button>
  
  {formatMenuOpen && (
    <div className="dropdown-menu">
      {/* Headings submenu */}
      <div className="group">
        <button>Headings ›</button>
        <div className="submenu">
          {/* H1-H6 options */}
        </div>
      </div>
      
      {/* Inline submenu */}
      {/* Blocks submenu */}
      {/* Align submenu */}
    </div>
  )}
</div>
```

## Cách sử dụng

### 1. Headings
1. Click vào dropdown "Paragraph"
2. Hover vào "Headings"
3. Click chọn H1, H2, H3, H4, H5, hoặc H6
4. Đoạn văn hiện tại sẽ chuyển thành heading

### 2. Inline formatting
1. **Bôi đen text** cần format
2. Click dropdown "Paragraph"
3. Hover vào "Inline"
4. Click chọn:
   - Bold → text in đậm
   - Italic → text in nghiêng
   - Underline → text gạch chân
   - Strikethrough → text gạch ngang
   - Superscript → text chỉ số trên
   - Subscript → text chỉ số dưới
   - Code → text inline code (màu hồng)

### 3. Blocks
1. Click dropdown "Paragraph"
2. Hover vào "Blocks"
3. Click chọn:
   - Paragraph → đoạn văn thường
   - Blockquote → trích dẫn (thường có border trái)
   - Div → container
   - Pre → preformatted text (giữ nguyên format, space, line break)

### 4. Align
1. Click vào đoạn văn cần căn
2. Click dropdown "Paragraph"
3. Hover vào "Align"
4. Click chọn Left/Center/Right/Justify

## Styling

### Submenu hover effect
```css
.group:hover .submenu {
  display: block;
}
```

### Active item highlight
- **Pre** trong Blocks → background xanh
- **Left** trong Align → background xanh (mặc định)

### Checkmark
- **Paragraph** trong Blocks → có dấu ✓ (mặc định)

## Technical notes

### 1. Overlay để đóng menu
```tsx
{formatMenuOpen && (
  <>
    <div className="fixed inset-0 z-40" onClick={() => setFormatMenuOpen(false)} />
    <div className="dropdown-menu z-50">...</div>
  </>
)}
```

### 2. Submenu positioning
```css
.submenu {
  position: absolute;
  left: 100%;  /* Hiển thị bên phải */
  top: 0;
  margin-left: 4px;
}
```

### 3. Group hover
```tsx
<div className="relative group">
  <button>Headings ›</button>
  <div className="hidden group-hover:block">
    {/* Submenu */}
  </div>
</div>
```

## Browser compatibility

### document.execCommand
Tất cả các lệnh format đều dùng `document.execCommand`:
- ✅ bold, italic, underline
- ✅ strikeThrough
- ✅ superscript, subscript
- ✅ formatBlock (h1-h6, p, blockquote, div, pre)
- ✅ justifyLeft, justifyCenter, justifyRight, justifyFull

### Custom wrapSelection
Dùng cho `<code>` tag vì `document.execCommand` không hỗ trợ:
```typescript
wrapSelection('code')
```

## Kết quả
✅ Dropdown menu giống hình mẫu
✅ Submenu hover hiển thị bên phải
✅ Click chọn option → menu tự đóng
✅ Tất cả format commands hoạt động
✅ Responsive và smooth UX
