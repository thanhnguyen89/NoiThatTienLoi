# Content Marketing Agent — Hiến pháp Dự Án

> Layer 1 — LUÔN được đọc đầu tiên, LUÔN kích hoạt.
> Mọi agent, skill, hook đều phải tuân theo các quy tắc tại đây.

---

## Dự án là gì

Full-Stack AI Content Agent: nhận 1 từ khóa → trả về bài viết hoàn chỉnh
đã tối ưu SEO, đã humanize, đã publish lên CMS — không cần can thiệp thủ công.

## Kiến trúc 5 Layer

```
Layer 1: CLAUDE.md      → Hiến pháp (file này)
Layer 2: Skills         → Chuyên môn theo task
Layer 3: Hooks          → Kiểm soát tự động
Layer 4: Subagents      → Phân công song song
Layer 5: Plugins        → Đóng gói, phân phối cho team
```

## Tech Stack

- LLM: Claude Sonnet (viết, phân tích) + Claude Haiku (task nhẹ)
- Search: Tavily API
- Image Gen: Flux / DALL-E 3
- CMS: WordPress REST API
- Queue: BullMQ + Redis
- DB: Supabase (PostgreSQL)
- Runtime: Node.js 20+

## Quy ước đặt tên — KHÔNG được sai

```
Agents:   .claude/agents/[vai-tro].md        (kebab-case)
Skills:   .claude/skills/[ten-skill].md      (kebab-case)
Hooks:    .claude/hooks/[loai-hook].sh       (kebab-case)
Commands: .claude/commands/[lenh].md         (kebab-case)
Source:   src/[module]/[tenFile].js          (camelCase)
Env vars: SCREAMING_SNAKE_CASE
```

## Quy tắc kiến trúc — BẮT BUỘC

```
✅ Mỗi agent chỉ làm 1 việc — không kiêm nhiệm
✅ Agent truyền dữ liệu qua JSON — không plain text
✅ Mọi API call phải có try/catch và retry logic (max 3 lần)
✅ Log mọi bước vào /logs/YYYY-MM-DD.log
✅ Không hardcode API key — dùng .env
✅ Subagent KHÔNG được spawn thêm subagent (tránh đệ quy vô hạn)
```

## Quy tắc content — BẮT BUỘC

```
✅ Keyword density: 1.0–1.5%
✅ Humanness Score phải ≥ 76 trước khi publish
✅ Mọi số liệu phải có nguồn thật đi kèm
✅ KHÔNG publish khi chưa có xác nhận người quản lý
✅ KHÔNG xóa file — chỉ archive vào /archive/
```

## Quy tắc an toàn — TUYỆT ĐỐI

```
❌ KHÔNG tự publish lên production khi chưa được xác nhận
❌ KHÔNG chạy rm -rf bất kỳ thư mục nào
❌ KHÔNG commit thẳng lên main branch
❌ KHÔNG bỏ qua bước Editor/QC dù người dùng yêu cầu
❌ KHÔNG lưu API key vào bất kỳ file nào (dùng .env)
```

## Pipeline chuẩn (7 bước)

```
[Từ khóa] → Researcher → Architect → Writer
           → ImageGen  → SEO Specialist → Editor/QC
           → [Xác nhận người quản lý]
           → Publisher → [Báo cáo]
```

## Kỳ vọng kiểm thử

- Mỗi agent có test riêng tại src/[agent]/__tests__/
- Chạy test trước deploy: npm run test
- Không deploy khi test fail

## Sơ đồ repo

```
content-agent/
├── CLAUDE.md                 ← Layer 1 (file này)
├── .claude/
│   ├── settings.json         ← Rules global
│   ├── memory.md             ← Bộ nhớ dài hạn
│   ├── agents/               ← 7 subagents
│   ├── skills/               ← Workflow tái sử dụng
│   ├── hooks/                ← Kiểm soát tự động
│   └── commands/             ← Slash commands
├── plugins/                  ← Đóng gói cho team
├── src/                      ← Source code
├── logs/                     ← Auto-generated
├── .env.example
└── package.json
```
