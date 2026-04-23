# Content Marketing Agent

> Full-Stack AI Content Agent: nhập 1 từ khóa → nhận bài viết hoàn chỉnh đã publish.

---

## Kiến trúc

```
Layer 1: CLAUDE.md          Hiến pháp — luôn tải, luôn kích hoạt
Layer 2: Skills             Workflow tái sử dụng theo task
Layer 3: Hooks              Kiểm soát tự động (pre/post/stop)
Layer 4: Subagents          7 AI chuyên biệt theo vai trò
Layer 5: Plugins            Đóng gói, cài cho team
```

## Pipeline 7 bước

```
Từ khóa
   │
   ▼
[1] Researcher      → Thu thập dữ liệu, phân tích đối thủ
   │
   ▼
[2] Architect       → Tạo outline, map keyword, image prompts
   │
   ├──────────────────────────────┐
   ▼                              ▼
[3a] Writer                   [3b] Image Gen
   │                              │
   └──────────────┬───────────────┘
                  │ Merge ảnh vào bài
                  ▼
[5] SEO Specialist  → Tối ưu kỹ thuật, không thay đổi giọng văn
                  │
                  ▼
[6] Editor/QC       → Humanize, xóa dấu vết AI, chấm Humanness Score
                  │
            ┌─────┴──────┐
            ▼            ▼
         ≥76             <76
            │            │
            ▼            ▼
[7] Publisher       Quay lại Writer
```

## Cài đặt nhanh

```bash
# 1. Clone hoặc tải dự án
git clone [repo-url] content-agent
cd content-agent

# 2. Cài dependencies
npm install

# 3. Cấu hình môi trường
cp .env.example .env
# Mở .env và điền API keys

# 4. Chạy thử
npm run pipeline "cà phê giảm cân"
```

## Sử dụng trong Claude Code

```
# Tạo 1 bài
/run cà phê giảm cân

# Xem trạng thái
/status

# Tạo nhiều bài
/bulk keywords.csv
```

## Cấu hình quan trọng

| Biến | Mặc định | Mô tả |
|------|---------|-------|
| HUMANNESS_THRESHOLD | 76 | Điểm tối thiểu để publish |
| AUTO_PUBLISH | false | Luôn hỏi xác nhận trước khi publish |
| MAX_RETRIES | 3 | Số lần retry khi API lỗi |

## Giải thích Humanness Score

| Score | Quyết định | Hành động |
|-------|-----------|----------|
| 90-100 | PUBLISH — Xuất sắc | Publish ngay |
| 76-89 | PUBLISH — Đạt yêu cầu | Publish sau xác nhận |
| 60-75 | REVIEW — Cần xem lại | Hỏi người quản lý |
| 0-59 | REWRITE — Viết lại | Tự động gửi về Writer |

## Cấu trúc file

```
content-agent/
├── CLAUDE.md                   Layer 1: Hiến pháp
├── .claude/
│   ├── settings.json           Global rules
│   ├── memory.md               Bộ nhớ dài hạn
│   ├── agents/                 7 agent prompts
│   │   ├── researcher.md
│   │   ├── architect.md
│   │   ├── writer.md
│   │   ├── image-gen.md
│   │   ├── seo-specialist.md
│   │   ├── editor-qc.md
│   │   └── publisher.md
│   ├── skills/
│   │   ├── create-article.md   Pipeline chính
│   │   └── bulk-content.md     Tạo nhiều bài
│   ├── hooks/
│   │   ├── pre-tool-use.sh     Chặn hành động nguy hiểm
│   │   ├── post-tool-use.sh    Auto-lint, notify Slack
│   │   ├── session-start.sh    Load context, check env
│   │   └── subagent-stop.sh    Validate output, log
│   └── commands/
│       ├── run.md              /run [keyword]
│       ├── status.md           /status
│       └── bulk.md             /bulk [file.csv]
├── plugins/
│   └── plugin.json             Manifest đóng gói
├── src/
│   ├── index.js                Entry point CLI
│   ├── orchestrator/
│   │   └── pipeline.js         Điều phối 7 agent
│   └── utils/
│       ├── logger.js           Logging
│       ├── state.js            State management
│       └── prompts.js          Load agent prompts
├── logs/                       Auto-generated
├── output/                     Bài đã tạo (JSON)
├── .env.example
└── package.json
```
