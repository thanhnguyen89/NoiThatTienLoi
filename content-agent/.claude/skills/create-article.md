---
name: create-article
description: Skill chính điều phối toàn bộ pipeline 7 agent. Gọi khi nhận từ khóa mới. Tự động chạy Researcher → Architect → Writer → ImageGen → SEO → Editor/QC → Publisher.
---

# SKILL: CREATE ARTICLE (Pipeline Orchestrator)

## Kích hoạt khi

Người dùng nói: "viết bài về X", "tạo content cho X", "chạy pipeline với từ khóa X"

## Input cần có

```
- Từ khóa chính (bắt buộc)
- Từ khóa phụ (optional)
- Category WordPress (optional)
- Publish ngay hay schedule (optional, default: chờ xác nhận)
```

Nếu thiếu từ khóa chính → hỏi trước khi chạy.

## Pipeline thực thi

```
STEP 1: RESEARCHER
  Input:  { keyword, language: "vi", market: "VN" }
  Output: research.json
  Thời gian: ~2 phút

STEP 2: ARCHITECT
  Input:  research.json
  Output: outline.json
  Thời gian: ~1 phút

  ↓ [Hiện outline cho người quản lý xem — hỏi có muốn chỉnh không]
  ↓ [Nếu OK → tiếp tục. Nếu cần chỉnh → nhận feedback → chỉnh outline]

STEP 3a: WRITER (chạy trước)
  Input:  outline.json + research.json
  Output: article.json (có html_content)
  Thời gian: ~3-4 phút

STEP 3b: IMAGE-GEN (chạy song song với Writer nếu có thể)
  Input:  outline.json → image_prompts
  Output: images.json (có URLs)
  Thời gian: ~2-3 phút

STEP 4: Merge — chèn ảnh URLs vào html_content thay thế [IMAGE: ...] placeholders

STEP 5: SEO-SPECIALIST
  Input:  merged article + keyword data
  Output: seo-optimized.json
  Thời gian: ~2 phút

STEP 6: EDITOR-QC
  Input:  seo-optimized.json
  Output: final.json (có humanness_score)
  Thời gian: ~3-5 phút

  ↓ [Kiểm tra decision]
  ├── REWRITE (score < 60): Gửi feedback → Writer → lặp lại từ STEP 3
  ├── REVIEW (60-75): Hiển thị cho người quản lý, hỏi ý kiến
  └── PUBLISH (76+): Tiếp tục STEP 7

STEP 7: PUBLISHER
  Input:  final.json
  Action: Hiển thị preview → Chờ xác nhận → Publish → Báo cáo
  Thời gian: ~1 phút
```

## Progress Display

Hiển thị real-time sau mỗi bước:

```
🔍 [1/7] Researching "cà phê giảm cân"... ✅ Done (1m 45s)
📐 [2/7] Building outline... ✅ Done (52s)
✍️  [3/7] Writing article... ⏳ In progress...
```

## Xử lý lỗi

```
- Mỗi step fail → retry 3 lần
- Sau 3 lần fail → dừng pipeline, báo cáo lỗi cụ thể
- Lưu state sau mỗi step thành công vào /tmp/pipeline-state.json
- Nếu crash giữa chừng → có thể resume từ step cuối thành công
```

## Log

Mỗi lần chạy tạo log file:
`/logs/YYYY-MM-DD/[slug]-[timestamp].log`
