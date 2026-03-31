import { Command } from 'commander';
import { getModelDefinition } from '../config/model-map.js';
import { fromRoot, readText, slugify, fillTemplate, writeFileSafe } from '../utils.js';

function formatList(items: string[]) {
  return items.map((x) => `    '${x}',`).join('\n');
}

export function registerRunModelCommand(program: Command) {
  program
    .command('run-model')
    .description('Tạo task tự động theo model rồi in prompt analyze')
    .argument('<module>', 'Tên module')
    .option('--type <type>', 'Loại task', 'feature')
    .option('--goal <goal>', 'Mục tiêu task', '')
    .option('--name <name>', 'Tên task', '')
    .option('--priority <priority>', 'Ưu tiên', 'medium')
    .option('--force', 'Ghi đè file nếu đã tồn tại', false)
    .action((module, options) => {
      const def = getModelDefinition(module);
      const template = readText(new URL('../templates/task.template.ts.txt', import.meta.url).pathname);
      const name = options.name || `${module}-${options.type}`;
      const slug = slugify(name);
      const goal = options.goal || `Cập nhật module ${module}: ${def.description}`;
      const content = fillTemplate(template, {
        '__TASK_NAME__': slug,
        '__MODULE__': def.module,
        '__TYPE__': options.type,
        '__PRIORITY__': options.priority,
        '__GOAL__': goal,
        '__REFERENCE_MODULE__': def.referenceModule,
        '__FILES_TO_READ__': formatList(def.filesToRead),
        '__FILES_TO_MODIFY__': formatList(def.filesToModify),
        '__AFFECTED_LAYERS__': def.affectedLayers.map((x) => `'${x}'`).join(', '),
        '__RISK__': def.type === 'fullCRUD' ? 'high' : 'medium',
      });
      const taskPath = fromRoot('document/tasks', `${slug}.ts`);
      writeFileSafe(taskPath, content, Boolean(options.force));

      const prompt = readText(fromRoot('document/prompts/analyze_task_prompt.md'));
      const finalPrompt = `Bạn đang làm việc trên dự án Nội Thất Tiện Lợi.\n\n` +
        `Hãy đọc các file sau trước:\n\n` +
        `- ./document/1.skill-noithat-dev.ts\n` +
        `- ./document/2.skill-noithat-dev.md\n` +
        `- ./document/4.AI_DEV_SYSTEM_LEVEL2.md\n` +
        `- ./document/5.unit-test-checklist.md\n` +
        `- ./document/tasks/${slug}.ts\n\n` +
        `${prompt}\n\n` +
        `Sau bước phân tích, hãy ghi kết quả vào:\n` +
        `- ./document/outputs/task-analysis.md\n` +
        `- ./document/outputs/implementation-plan.md\n`;
      console.log(finalPrompt);
    });
}
