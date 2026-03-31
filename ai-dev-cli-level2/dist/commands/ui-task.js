import { getModelDefinition } from '../config/model-map.js';
import { fillTemplate, fromRoot, readText, slugify, writeFileSafe } from '../utils.js';
function formatList(items) {
    return items.map((x) => `    '${x}',`).join('\n');
}
export function registerUiTaskCommand(program) {
    program
        .command('ui-task')
        .description('Tạo file task cho flow ảnh UI -> task')
        .option('--name <name>', 'Tên task', 'ui-task')
        .option('--module <module>', 'Tên module', 'menu')
        .option('--type <type>', 'Loại task', 'feature')
        .option('--goal <goal>', 'Mục tiêu task', 'Convert ảnh UI thành task kỹ thuật')
        .option('--force', 'Ghi đè file nếu đã tồn tại', false)
        .action((options) => {
        const def = getModelDefinition(options.module);
        const template = readText(new URL('../templates/ui-task.template.ts.txt', import.meta.url).pathname);
        const slug = slugify(options.name);
        const content = fillTemplate(template, {
            '__TASK_NAME__': slug,
            '__MODULE__': def.module,
            '__TYPE__': options.type,
            '__GOAL__': options.goal,
            '__REFERENCE_MODULE__': def.referenceModule,
            '__FILES_TO_READ__': formatList(def.filesToRead),
            '__FILES_TO_MODIFY__': formatList(def.filesToModify),
            '__AFFECTED_LAYERS__': def.affectedLayers.map((x) => `'${x}'`).join(', '),
            '__RISK__': def.type === 'fullCRUD' ? 'high' : 'medium',
        });
        const filePath = fromRoot('document/templates', `${slug}.ts`);
        writeFileSafe(filePath, content, Boolean(options.force));
        console.log(`Đã tạo UI task template: ${filePath}`);
        console.log('\nDùng prompt này trên Claude web:');
        console.log('Phân tích ảnh UI này và output đúng format file template vừa tạo. Không giải thích dài dòng, chỉ trả về code .ts hoàn chỉnh.');
    });
}
