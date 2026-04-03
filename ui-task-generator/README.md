# UI → Task Generator

Công cụ tự động sinh file `task.ts` chuẩn từ ảnh giao diện UI, dành cho dự án **Nội Thất Tiện Lợi**.

## Cài đặt

```bash
# 1. Cài dependencies
npm install

# 2. Tạo file .env từ template
cp .env.example .env

# 3. Điền Anthropic token vào .env
ANTHROPIC_AUTH_TOKEN=your_token_here

# 4. Chạy
npm run dev
```

Mở trình duyệt tại **http://localhost:3001**

## Cách dùng

1. **Upload ảnh** — kéo thả, click chọn file, hoặc Ctrl+V paste từ clipboard
2. **Điền mô tả bổ sung** (tùy chọn) — context mà ảnh không nói rõ
3. **Chọn module và loại task** nếu đã biết
4. **Nhấn Generate** — AI phân tích và sinh task.ts
5. **Copy hoặc Download** file về dùng với Claude Code

## File task.ts được sinh ra gồm

| Section | Nội dung |
|---|---|
| `TASK_METADATA` | name, module, type, priority, source |
| `TASK_GOAL` | Mục tiêu task |
| `UI_CONTEXT` | Screens, mô tả UI |
| `UI_SUMMARY` | Tóm tắt từ ảnh |
| `ASSUMPTIONS` | Những gì AI đoán từ ảnh |
| `REQUIREMENTS` | Yêu cầu kỹ thuật |
| `BUSINESS_RULES` | Rules nghiệp vụ |
| `RELATED_FILES` | filesToRead + filesToModify |
| `EXPECTED_FLOW` | Luồng user → DB → UI |
| `ACCEPTANCE_CRITERIA` | Tiêu chí chấp nhận |
| `CONSTRAINTS` | Ràng buộc |
| `TEST_REQUIREMENTS` | Test cases |
| `TASK_CONTROL` | riskLevel, rollbackPlan, regressionTargets, manualQaChecklist |
| `RISKS` | Rủi ro kỹ thuật |
| `NOTES` | Ghi chú cho developer |

## Scripts

```bash
npm run dev    # chạy với hot-reload (node --watch)
npm start      # chạy production
```

## Cấu trúc

```
ui-task-generator/
├── server.js          ← Express proxy server
├── public/
│   └── index.html     ← toàn bộ UI
├── .env               ← token (không commit)
├── .env.example       ← template
└── package.json
```
