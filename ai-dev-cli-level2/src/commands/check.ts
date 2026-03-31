import { Command } from 'commander';
import { exists, fromRoot } from '../utils.js';

const required = [
  'document/prompts/analyze_task_prompt.md',
  'document/prompts/implement_task_prompt.md',
  'document/prompts/review_task_prompt.md',
  'document/prompts/test_task_prompt.md',
  'document/prompts/ui_to_task_prompt.md',
  'document/outputs/task-analysis.md',
  'document/outputs/implementation-plan.md',
  'document/outputs/review-report.md',
  'document/outputs/test-cases.md',
  'document/tasks',
  'document/templates',
];

export function registerCheckCommand(program: Command) {
  program
    .command('check')
    .description('Kiểm tra file/thư mục còn thiếu')
    .action(() => {
      const missing = required.filter((x) => !exists(fromRoot(x)));
      if (!missing.length) {
        console.log('Hệ thống đầy đủ.');
        return;
      }
      console.log('Thiếu các file/thư mục sau:');
      missing.forEach((x) => console.log(`- ${x}`));
    });
}
