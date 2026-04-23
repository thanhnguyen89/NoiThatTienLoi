---
name: status
description: Xem trạng thái pipeline hiện tại và thống kê dự án. Usage: /status
---

# Command: /status

## Cú pháp

```
/status
/status --today
/status --article=[slug]
```

## Hành động

Đọc `/tmp/pipeline-state.json` và `/logs/` → hiển thị dashboard:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 CONTENT AGENT STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pipeline hiện tại:
  Bài: "cà phê giảm cân"
  Bước: [5/7] SEO Specialist ⏳
  Thời gian đã chạy: 6m 12s

Thống kê hôm nay:
  ✅ Đã publish: 3 bài
  ❌ Rewrite: 1 bài
  ⏳ Đang xử lý: 1 bài

Thống kê tổng:
  Tổng bài: 47
  Avg Humanness Score: 82/100
  Avg SEO Score: 88/100
  Avg thời gian/bài: 8m 30s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
