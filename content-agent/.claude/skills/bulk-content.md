---
name: bulk-content
description: Tạo nhiều bài viết từ danh sách từ khóa CSV. Gọi khi người dùng muốn tạo hàng loạt content.
---

# SKILL: BULK CONTENT

## Kích hoạt khi

Người dùng cung cấp file CSV chứa nhiều từ khóa, hoặc nói:
"tạo 5 bài về...", "chạy bulk với danh sách này..."

## Quy trình

```
BƯỚC 1 — VALIDATE INPUT
  Đọc CSV → kiểm tra format
  Hiển thị preview danh sách → hỏi xác nhận

BƯỚC 2 — QUEUE
  Tạo queue từ danh sách từ khóa
  Ước tính tổng thời gian và chi phí

BƯỚC 3 — CHẠY TUẦN TỰ
  Với mỗi từ khóa:
    → Gọi skill create-article
    → Dừng ở bước xác nhận publish
    → Sau khi xác nhận → tiếp tục bài tiếp theo
    → Ghi kết quả vào bulk-report.json

BƯỚC 4 — BÁO CÁO TỔNG KẾT
  Đọc bulk-report.json → hiển thị báo cáo
```

## Lưu state

```json
// /tmp/bulk-state.json
{
  "total": 5,
  "completed": 2,
  "failed": 0,
  "pending": 3,
  "results": [
    {
      "keyword": "cà phê giảm cân",
      "status": "published",
      "url": "https://...",
      "humanness_score": 84,
      "seo_score": 88
    }
  ]
}
```

## Giới hạn

```
Tối đa 10 từ khóa mỗi lần chạy.
Khoảng cách giữa các bài: tối thiểu 5 phút (tránh rate limit).
```
