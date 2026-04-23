# Modal Click Behavior - Đã sửa

## ❌ Vấn đề trước đây

Modal bị đóng khi:
- Click vào bản đồ
- Click vào danh sách vị trí
- Click vào bất kỳ đâu bên trong modal

**Nguyên nhân:** Event bubbling - click event từ các phần tử con "nổi" lên backdrop và trigger `onClose`.

## ✅ Giải pháp

Thêm `e.stopPropagation()` vào các phần tử bên trong modal để ngăn event bubbling.

### Code thay đổi

```tsx
// Trước
<div className="modal-content">
  <div className="modal-body">
    {/* Nội dung */}
  </div>
</div>

// Sau
<div className="modal-content" onClick={(e) => e.stopPropagation()}>
  <div className="modal-body" onClick={(e) => e.stopPropagation()}>
    {/* Nội dung */}
  </div>
  <div className="modal-footer" onClick={(e) => e.stopPropagation()}>
    {/* Buttons */}
  </div>
</div>
```

## 🎯 Hành vi mới

### Modal CHỈ đóng khi:
- ✅ Click vào backdrop (phần tối bên ngoài modal)
- ✅ Click nút X (close button)
- ✅ Click nút "Hủy"

### Modal KHÔNG đóng khi:
- ✅ Click vào bản đồ
- ✅ Click vào marker trên bản đồ
- ✅ Click vào danh sách vị trí
- ✅ Click vào ô tìm kiếm
- ✅ Click vào bất kỳ phần tử nào bên trong modal

## 🔧 Cách hoạt động

### Event Propagation (Bubbling)
```
Click vào bản đồ
    ↓
LeafletMap component
    ↓
modal-body (stopPropagation ở đây)
    ↓ (DỪNG - không đi tiếp)
modal-content
    ↓
modal-dialog
    ↓
backdrop (onClose không được gọi)
```

### stopPropagation()
```tsx
onClick={(e) => e.stopPropagation()}
```
- `e`: Event object
- `stopPropagation()`: Ngăn event "nổi" lên parent elements
- Kết quả: Click chỉ xử lý ở element hiện tại, không trigger parent handlers

## 📝 Các phần tử có stopPropagation

1. **modal-content**: Ngăn click vào modal đóng backdrop
2. **modal-body**: Ngăn click vào nội dung đóng modal
3. **modal-footer**: Ngăn click vào footer đóng modal

## ✅ Test cases

### Test 1: Click vào bản đồ
1. Mở modal
2. Click vào bản đồ
3. ✅ Modal vẫn mở
4. ✅ Marker xuất hiện

### Test 2: Click vào danh sách
1. Mở modal
2. Click vào một vị trí trong danh sách
3. ✅ Modal vẫn mở
4. ✅ Vị trí được chọn

### Test 3: Click vào backdrop
1. Mở modal
2. Click vào phần tối bên ngoài modal
3. ✅ Modal đóng

### Test 4: Click nút X
1. Mở modal
2. Click nút X ở góc phải trên
3. ✅ Modal đóng

### Test 5: Click nút Hủy
1. Mở modal
2. Click nút "Hủy" ở footer
3. ✅ Modal đóng

## 🎨 UX Improvements

### Trước:
- ❌ Khó sử dụng - modal đóng liên tục
- ❌ Phải mở lại modal nhiều lần
- ❌ Không thể tương tác với bản đồ

### Sau:
- ✅ Dễ sử dụng - modal ổn định
- ✅ Tương tác tự nhiên với bản đồ
- ✅ Chỉ đóng khi người dùng muốn

## 📚 Tham khảo

- [MDN: Event.stopPropagation()](https://developer.mozilla.org/en-US/docs/Web/API/Event/stopPropagation)
- [React: Event Handling](https://react.dev/learn/responding-to-events)
- [Event Bubbling vs Capturing](https://javascript.info/bubbling-and-capturing)

---

**Status:** ✅ Đã sửa  
**Ngày sửa:** 2026-04-22  
**Files thay đổi:** `LocationPickerModal.tsx`
