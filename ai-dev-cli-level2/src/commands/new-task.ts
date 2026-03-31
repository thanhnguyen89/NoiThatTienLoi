import { Command } from 'commander';
import { fillTemplate, fromRoot, readText, slugify, writeFileSafe } from '../utils.js';

export function registerNewTaskCommand(program: Command) {
  program
    .command('new-task')
    .description('Tạo file task mới cơ bản')
    .argument('<name>', 'Tên task')
    .option('--module <module>', 'Tên module', 'common')
    .option('--type <type>', 'Loại task', 'feature')
    .option('--priority <priority>', 'Ưu tiên', 'medium')
    .option('--goal <goal>', 'Mục tiêu task', 'Mô tả mục tiêu task tại đây')
    .option('--force', 'Ghi đè file nếu đã tồn tại', false)
    .action((name, options) => {
      const template = readText(new URL('../templates/task.template.ts.txt', import.meta.url).pathname);
      const slug = slugify(name);
      const content = fillTemplate(template, {
        '__TASK_NAME__': slug,
        '__MODULE__': options.module,
        '__TYPE__': options.type,
        '__PRIORITY__': options.priority,
        '__GOAL__': options.goal,
        '__REFERENCE_MODULE__': '',
        '__FILES_TO_READ__': '',
        '__FILES_TO_MODIFY__': '',
        '__AFFECTED_LAYERS__': `'ui'`,
        '__RISK__': 'medium',
      });
      const filePath = fromRoot('document/tasks', `${slug}.ts`);
      writeFileSafe(filePath, content, Boolean(options.force));
      console.log(`Đã tạo task: ${filePath}`);
    });
}
