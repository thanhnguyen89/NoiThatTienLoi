---
name: run
description: Chạy pipeline tạo bài mới. Usage: /run [từ khóa]
---

# Command: /run

## Cú pháp

```
/run cà phê giảm cân
/run "cà phê giảm cân" --category=suc-khoe --schedule="2025-04-10 08:00"
```

## Tham số

| Tham số | Mô tả | Mặc định |
|---------|-------|---------|
| keyword | Từ khóa chính (bắt buộc) | - |
| --category | Category WordPress | Uncategorized |
| --schedule | Thời gian publish (ISO format) | Chờ xác nhận |
| --dry-run | Chạy pipeline nhưng không publish | false |

## Hành động

Kích hoạt skill `create-article` với các tham số đã nhận.
Hiển thị progress bar real-time.
Dừng ở bước xác nhận trước khi publish.

## Ví dụ output

```
🚀 Pipeline bắt đầu: "cà phê giảm cân"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ [1/7] Researcher    — 1m 45s
✅ [2/7] Architect     — 52s
   [3/7] Hiển thị outline — Đang chờ xác nhận...
```
