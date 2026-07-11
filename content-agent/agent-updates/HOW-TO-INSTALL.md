# Hướng dẫn cài đặt — Semantic SEO Agent Upgrade

## Các file đã được nâng cấp

| File | Thay đổi chính |
|---|---|
| `researcher.md` | + Dominant Intent (Know/Do/Go/Hybrid), EAV Map, Competitor Outline Patterns, Information Gain Opportunities |
| `architect.md` | + RPP Scoring, tách Title Tag / H1, Macro Context, AM 5 trường per section, is_main_content flag, Topical Map Links |
| `writer.md` | + L0 Subordinate Text rule, 5 Writing Rules (Be Certain / Don't Delay / Numeric Values / How-to≠Definition / Anchor Match) |
| `editor-qc.md` | + Lớp 0 Semantic Structure Check (21 items: 10 OC + 6 AM + 5 WR), Semantic Score, combined Decision logic |

## Cách cài đặt

Copy 4 file sau vào thư mục `.claude/agents/`, ghi đè file cũ:

```
agent-updates/researcher.md  →  .claude/agents/researcher.md
agent-updates/architect.md   →  .claude/agents/architect.md
agent-updates/writer.md      →  .claude/agents/writer.md
agent-updates/editor-qc.md   →  .claude/agents/editor-qc.md
```

## Lưu ý quan trọng

- Pipeline server.js KHÔNG cần thay đổi — các agent vẫn chạy đúng thứ tự cũ
- Input Step 1 UI nên bổ sung thêm field "Vị trí Topical Map" (Hub/Spoke/Standalone) để researcher nhận đúng — đây là optional, có thể làm sau
- Backup file cũ trước khi ghi đè nếu muốn giữ lịch sử

## Thứ tự kiểm tra sau khi cài

1. Chạy 1 bài thử với từ khóa đơn giản (VD: "giường sắt 1m8")
2. Kiểm tra output researcher.md: có `dominant_intent` + `eav_map` không
3. Kiểm tra output architect.md: có `macro_context` + `am` trong từng section không
4. Kiểm tra output writer.md: có `writing_rules_check` không
5. Kiểm tra output editor-qc.md: có `semantic_check.semantic_score` không
