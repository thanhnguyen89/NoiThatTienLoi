import { Command } from 'commander';
import { ensureDir, fromRoot, writeFileSafe } from '../utils.js';

const files: Record<string, string> = {
  'document/prompts/analyze_task_prompt.md': `Hãy đọc:
- ./document/1.skill-noithat-dev.ts
- ./document/2.skill-noithat-dev.md
- ./document/4.AI_DEV_SYSTEM_LEVEL2.md
- ./document/5.unit-test-checklist.md
- ./document/tasks/<task>.ts

Sau đó:
1. Phân loại task
2. Xác định module liên quan
3. Liệt kê file cần đọc
4. Tóm tắt logic hiện tại
5. Viết implementation plan
6. Viết risk list
KHÔNG code.`,
  'document/prompts/implement_task_prompt.md': `Proceed with implementation.
Only modify directly related files.
Follow the approved plan strictly.
After coding, generate review report and test plan.`,
  'document/prompts/review_task_prompt.md': `Hãy review thay đổi theo:
1. Architecture
2. Type safety
3. Scope creep
4. Runtime risks
5. Missing validations
6. Missing edge cases`,
  'document/prompts/test_task_prompt.md': `Hãy tạo test plan theo unit-test-checklist.md:
- validator tests
- service tests
- repository tests
- API tests
- manual QA checklist
- regression cases`,
  'document/prompts/ui_to_task_prompt.md': `Phân tích ảnh UI này và convert thành task kỹ thuật theo UI_IMAGE_TO_TASK_TEMPLATE.ts.
Không code ngay.`,
  'document/outputs/task-analysis.md': '# Task Analysis\n\n',
  'document/outputs/implementation-plan.md': '# Implementation Plan\n\n',
  'document/outputs/review-report.md': '# Review Report\n\n',
  'document/outputs/test-cases.md': '# Test Cases\n\n',
};

export function registerInitCommand(program: Command) {
  program
    .command('init')
    .description('Khởi tạo cấu trúc document cho AI Dev System')
    .option('--force', 'Ghi đè file nếu đã tồn tại', false)
    .action((options) => {
      const overwrite = Boolean(options.force);
      [
        'document',
        'document/prompts',
        'document/tasks',
        'document/templates',
        'document/outputs',
      ].forEach((dir) => ensureDir(fromRoot(dir)));

      for (const [file, content] of Object.entries(files)) {
        writeFileSafe(fromRoot(file), content, overwrite);
      }

      console.log('Đã khởi tạo AI Dev System level 2.');
    });
}
