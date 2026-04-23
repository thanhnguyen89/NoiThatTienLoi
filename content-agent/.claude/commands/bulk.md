---
name: bulk
description: Chạy pipeline cho nhiều từ khóa từ file CSV. Usage: /bulk [file.csv]
---

# Command: /bulk

## Cú pháp

```
/bulk keywords.csv
/bulk keywords.csv --max=5 --interval=10min
```

## Format file CSV

```csv
keyword,category,schedule
cà phê giảm cân,suc-khoe,2025-04-10 08:00
trà xanh giảm cân,suc-khoe,2025-04-11 08:00
ăn kiêng keto,dinh-duong,2025-04-12 08:00
```

## Tham số

| Tham số | Mô tả | Mặc định |
|---------|-------|---------|
| file | Đường dẫn CSV (bắt buộc) | - |
| --max | Số bài tối đa chạy 1 lần | 10 |
| --interval | Khoảng cách giữa các bài | 5min |
| --dry-run | Xem preview, không chạy thật | false |

## Hành động

```
1. Đọc CSV → validate format
2. Hiển thị danh sách bài sẽ tạo → hỏi xác nhận
3. Chạy tuần tự (không song song) — tránh rate limit API
4. Sau mỗi bài: dừng ở bước xác nhận publish
5. Gửi báo cáo tổng kết sau khi xong tất cả
```

## Báo cáo tổng kết

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 BULK REPORT — 3 bài
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ cà phê giảm cân     — Score: 84 — /ca-phe-giam-can
✅ trà xanh giảm cân   — Score: 79 — /tra-xanh-giam-can
⚠️  ăn kiêng keto       — Score: 68 — Cần review thêm
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tổng thời gian: 28 phút
Chi phí API ước tính: ~$3.6
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Giới hạn an toàn

```
❌ Không chạy quá 10 bài/lần để tránh rate limit
❌ Không publish tự động — vẫn phải xác nhận từng bài
✅ Nếu 1 bài fail → bỏ qua, tiếp tục bài tiếp theo
✅ Lưu progress — nếu crash có thể resume
```
