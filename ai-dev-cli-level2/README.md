# AI Dev CLI Level 2

CLI level 2 cho hệ thống AI Dev xử lý nhiều model/module.

## Lệnh chính
- `ai-dev init`
- `ai-dev check`
- `ai-dev new-task`
- `ai-dev new-model-task`
- `ai-dev run-task`
- `ai-dev run-model`
- `ai-dev ui-task`
- `ai-dev prompt`

## Cài đặt
```bash
npm install
npm run build
npm link
```

## Ví dụ
```bash
ai-dev init
ai-dev new-model-task menu --type feature --name add-menu-type-filter
ai-dev run-task ./document/tasks/add-menu-type-filter.ts
ai-dev run-model product --type bugfix --goal "fix submit form khi thiếu slug"
ai-dev ui-task --name menu-ui-update
```
