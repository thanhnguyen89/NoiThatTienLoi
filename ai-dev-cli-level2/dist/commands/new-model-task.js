import { getModelDefinition } from '../config/model-map.js';
import { fillTemplate, fromRoot, readText, slugify, writeFileSafe } from '../utils.js';
function formatList(items) {
    return items.map((x) => `    '${x}',`).join('\n');
}
export function registerNewModelTaskCommand(program) {
    program
        .command('new-model-task')
        .description('Tạo task tự động theo model/module có sẵn')
        .argument('<module>', 'Tên module: menu | category | product | slider | page | news')
        .option('--name <name>', 'Tên task', '')
        .option('--type <type>', 'Loại task', 'feature')
        .option('--priority <priority>', 'Ưu tiên', 'medium')
        .option('--goal <goal>', 'Mục tiêu task', '')
        .option('--force', 'Ghi đè file nếu đã tồn tại', false)
        .action((module, options) => {
        const def = getModelDefinition(module);
        const template = readText(new URL('../templates/task.template.ts.txt', import.meta.url).pathname);
        const rawName = options.name || `${module}-${options.type}`;
        const slug = slugify(rawName);
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
        const filePath = fromRoot('document/tasks', `${slug}.ts`);
        writeFileSafe(filePath, content, Boolean(options.force));
        console.log(`Đã tạo model task: ${filePath}`);
    });
}
