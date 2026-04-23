# Modal - Không đóng khi click ra ngoài

## 🎯 Yêu cầu cuối cùng

- ❌ Click ra ngoài modal → Modal KHÔNG đóng
- ✅ Chỉ đóng khi click nút "Hủy" hoặc nút X
- ✅ Người dùng phải chủ động chọn vị trí và xác nhận

## ✅ Giải pháp

### Xóa onClick khỏi backdrop

**Trước:**
```tsx
<div 
  className="modal show d-block" 
  onClick={handleBackdropClick}  ← XÓA
>
  <div onClick={handleBackdropClick}>  ← XÓA
```

**Sau:**
```tsx
<div 
  className="modal show d-block"
  // KHÔNG có onClick
>
  <div>
    // KHÔNG có onClick
```

## 🎨 Hành vi mới

### Modal CHỈ đóng khi:
1. ✅ Click nút **X** (close button) ở góc phải trên
2. ✅ Click nút **"Hủy"** ở footer

### Modal KHÔNG đóng khi:
- ✅ Click ra ngoài modal (backdrop)
- ✅ Click vào bản đồ
- ✅ Click vào danh sách
- ✅ Click vào bất kỳ đâu

## 💡 Lý do thiết kế

### Ưu điểm:
1. **Tránh mất dữ liệu:** Người dùng không vô tình đóng modal khi đang chọn vị trí
2. **Workflow rõ ràng:** Phải chọn vị trí → Click "Chọn vị trí này" hoặc "Hủy"
3. **UX tốt hơn:** Không bị đóng modal khi click nhầm

### Nhược điểm:
- Không thể đóng nhanh bằng cách click ra ngoài
- Phải click nút để đóng

## 🔄 So sánh

| Hành vi | Trước | Sau |
|---------|-------|-----|
| Click backdrop | Đóng | KHÔNG đóng |
| Click nút X | Đóng | Đóng |
| Click nút Hủy | Đóng | Đóng |
| Click bản đồ | Đóng (lỗi) | KHÔNG đóng |
| Click danh sách | Đóng (lỗi) | KHÔNG đóng |

## 🎯 Workflow người dùng

### Scenario 1: Chọn vị trí thành công
1. Click nút 🗺️
2. Modal mở
3. Tìm kiếm hoặc click vào bản đồ
4. Chọn vị trí
5. Click **"Chọn vị trí này"**
6. Modal đóng ✅
7. Vị trí được điền vào input ✅

### Scenario 2: Hủy bỏ
1. Click nút 🗺️
2. Modal mở
3. Không muốn chọn nữa
4. Click **"Hủy"** hoặc **X**
5. Modal đóng ✅
6. Không có gì thay đổi ✅

### Scenario 3: Click nhầm ra ngoài
1. Click nút 🗺️
2. Modal mở
3. Đang chọn vị trí...
4. Click nhầm ra ngoài modal
5. Modal KHÔNG đóng ✅
6. Tiếp tục chọn vị trí ✅

## 🔧 Code

### Backdrop (không có onClick)
```tsx
<div 
  className="modal show d-block" 
  style={{ background: 'rgba(0,0,0,0.5)' }}
  // KHÔNG có onClick - không đóng khi click
>
```

### Nút đóng
```tsx
// Nút X
<button 
  type="button" 
  className="btn-close" 
  onClick={onClose}  ← Đóng modal
></button>

// Nút Hủy
<button 
  type="button" 
  className="btn btn-secondary" 
  onClick={onClose}  ← Đóng modal
>
  Hủy
</button>

// Nút Chọn
<button 
  type="button" 
  className="btn btn-primary" 
  onClick={handleSelect}  ← Chọn vị trí và đóng modal
>
  Chọn vị trí này
</button>
```

## 📊 Bootstrap Modal Options

Nếu dùng Bootstrap modal thuần, có thể dùng:

```html
<div 
  class="modal" 
  data-bs-backdrop="static"  ← Không đóng khi click backdrop
  data-bs-keyboard="false"   ← Không đóng khi nhấn ESC
>
```

Nhưng vì đang dùng custom modal, chỉ cần không thêm onClick vào backdrop.

## ✅ Test cases

### Test 1: Click backdrop
1. Mở modal
2. Click vào vùng tối bên ngoài
3. ✅ Modal KHÔNG đóng

### Test 2: Click nút X
1. Mở modal
2. Click nút X
3. ✅ Modal đóng

### Test 3: Click nút Hủy
1. Mở modal
2. Click nút "Hủy"
3. ✅ Modal đóng

### Test 4: Click "Chọn vị trí này"
1. Mở modal
2. Chọn một vị trí
3. Click "Chọn vị trí này"
4. ✅ Modal đóng
5. ✅ Vị trí được điền vào input

### Test 5: Click vào bản đồ
1. Mở modal
2. Click vào bản đồ
3. ✅ Modal KHÔNG đóng
4. ✅ Marker xuất hiện

### Test 6: Nhấn ESC (nếu có)
1. Mở modal
2. Nhấn phím ESC
3. ⚠️ Tùy implementation (hiện tại không có)

## 🚀 Tương lai (Optional)

### Thêm phím tắt ESC
```tsx
useEffect(() => {
  function handleEsc(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
  
  if (isOpen) {
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }
}, [isOpen, onClose]);
```

### Thêm option backdrop
```tsx
interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: string) => void;
  currentLocation?: string;
  closeOnBackdrop?: boolean;  // Default: false
}
```

---

**Status:** ✅ Hoàn thành  
**Hành vi:** Modal chỉ đóng khi click nút X hoặc Hủy  
**Ngày cập nhật:** 2026-04-22
