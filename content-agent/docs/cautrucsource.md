content-agent/
│
├── CLAUDE.md                          ← 🏛️ HIẾN PHÁP DỰ ÁN (Layer 1)
│                                         Quy tắc bắt buộc cho mọi agent:
│                                         keyword density 1-1.5%, humanness ≥76,
│                                         không publish khi chưa xác nhận,
│                                         mỗi agent chỉ làm 1 việc, truyền JSON
│
├── .env.example                       ← Template biến môi trường
├── package.json                       ← Dependencies gốc (Anthropic SDK, BullMQ...)
│
├── .claude/                           ← 🧠 AI AGENT LAYER
│   ├── settings.json                  ← Cấu hình global cho Claude
│   ├── memory.md                      ← Bộ nhớ dài hạn giữa các phiên
│   │
│   ├── agents/                        ← 7 AGENT PROMPTS (mỗi file = 1 vai trò)
│   │   ├── researcher.md              ← Bước 1: Phân tích keyword, intent, đối thủ
│   │   ├── architect.md               ← Bước 2: Tạo outline H2/H3, map keyword
│   │   ├── writer.md                  ← Bước 3: Viết bài HTML theo outline
│   │   ├── seo-specialist.md          ← Bước 4: Tối ưu SEO (title, meta, density)
│   │   ├── editor-qc.md              ← Bước 5: Humanize, xóa dấu vết AI, chấm điểm
│   │   ├── image-gen.md               ← Bước 6-7: Tạo ảnh thumbnail + section
│   │   └── publisher.md               ← Bước 8: Publish lên CMS
│   │
│   ├── skills/                        ← WORKFLOW TÁI SỬ DỤNG
│   │   ├── create-article.md          ← Pipeline chính: keyword → bài viết
│   │   └── bulk-content.md            ← Tạo nhiều bài từ CSV
│   │
│   ├── commands/                      ← SLASH COMMANDS
│   │   ├── run.md                     ← /run [keyword]
│   │   ├── status.md                  ← /status
│   │   └── bulk.md                    ← /bulk [file.csv]
│   │
│   └── hooks/                         ← KIỂM SOÁT TỰ ĐỘNG
│       ├── pre-tool-use.sh            ← Chặn hành động nguy hiểm trước khi chạy
│       ├── post-tool-use.sh           ← Auto-lint, notify sau khi chạy
│       ├── session-start.sh           ← Load context, check env khi bắt đầu
│       └── subagent-stop.sh           ← Validate output agent, ghi log
│
├── exmple/                            ← 📦 DỮ LIỆU MẪU (Brand Forme)
│   ├── brand-guideline.md             ← Tone of voice, màu sắc, typography
│   ├── customer-persona.md            ← Chân dung khách hàng 40-55 tuổi
│   ├── marketing-channels.md          ← Instagram, Website, Showroom
│   ├── product-catalog.md             ← 4 sản phẩm: Lento, Cleo, Noir, Arc
│   └── prompt.txt                     ← Prompt mẫu tạo skill
│
├── src/                               ← 💻 SOURCE CODE (CLI pipeline)
│   ├── index.js                       ← Entry point: nhận keyword từ CLI
│   ├── orchestrator/
│   │   └── pipeline.js                ← Điều phối 7 agent tuần tự qua Anthropic API
│   └── utils/
│       ├── logger.js                  ← Ghi log ra console + file /logs/
│       ├── state.js                   ← Lưu/đọc state pipeline (resume khi crash)
│       └── prompts.js                 ← Load agent prompt từ .claude/agents/
│
├── web/                               ← 🌐 WEB UI (Express + SSE)
│   ├── .env                           ← Gemini API key, TLS config
│   ├── package.json                   ← Dependencies: express, axios, dotenv
│   ├── server.js                      ← Server chính:
│   │                                     - Load CLAUDE.md → inject vào mọi agent call
│   │                                     - Load 7 agent prompts từ .claude/agents/
│   │                                     - Load brand data từ exmple/
│   │                                     - Pipeline 8 bước qua SSE streaming
│   │                                     - Gemini API (axios) + mock fallback
│   ├── test-gemini.js                 ← Script test Gemini API
│   └── public/                        ← Frontend tĩnh
│       ├── index.html                 ← Giao diện: sidebar + form + 8 bước + preview
│       ├── styles.css                 ← Theme Forme (warm white, caramel, dark brown)
│       └── app.js                     ← SSE client, render từng bước real-time
│
├── docs/
│   └── README.md                      ← Tài liệu: kiến trúc, cài đặt, sử dụng
│
└── plugins/                           ← 🔌 ĐÓNG GÓI CHO TEAM (chưa dùng)
    ├── plugin.json                    ← Manifest
    ├── agents/                        ← (trống)
    ├── commands/                      ← (trống)
    ├── hooks/                         ← (trống)
    └── skills/                        ← (trống)
Browser nhập keyword
    ↓
server.js nhận request SSE
    ↓
Load CLAUDE.md (hiến pháp) ← inject vào MỌI bước
    ↓
Bước 1: researcher.md + brand data → Gemini → research JSON
Bước 2: architect.md + research → Gemini → outline JSON
Bước 3: writer.md + outline + research → Gemini → HTML content
Bước 4: seo-specialist.md + content → Gemini → SEO optimized
Bước 5: editor-qc.md + SEO output → Gemini → humanized + score
Bước 6+7: (song song) thumbnail + section images → mock/AI
Bước 8: publisher → báo cáo + chờ xác nhận
    ↓
SSE stream từng bước → Browser render real-time
