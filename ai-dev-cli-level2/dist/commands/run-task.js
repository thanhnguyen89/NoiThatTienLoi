import path from 'node:path';
import { fromRoot, readText } from '../utils.js';
export function registerRunTaskCommand(program) {
    program
        .command('run-task')
        .description('Ghép prompt analyze hoàn chỉnh cho 1 task')
        .argument('<taskFile>', 'Đường dẫn file task, ví dụ: ./document/tasks/admin_menu_feature_request.ts')
        .action((taskFile) => {
        const prompt = readText(fromRoot('document/prompts/analyze_task_prompt.md'));
        const finalPrompt = `Bạn đang làm việc trên dự án Nội Thất Tiện Lợi.\n\n` +
            `Hãy đọc các file sau trước:\n\n` +
            `- ./document/1.skill-noithat-dev.ts\n` +
            `- ./document/2.skill-noithat-dev.md\n` +
            `- ./document/4.AI_DEV_SYSTEM_LEVEL2.md\n` +
            `- ./document/5.unit-test-checklist.md\n` +
            `- ${taskFile}\n\n` +
            `${prompt}\n\n` +
            `Sau bước phân tích, hãy ghi kết quả vào:\n` +
            `- ./document/outputs/task-analysis.md\n` +
            `- ./document/outputs/implementation-plan.md\n`;
        console.log(finalPrompt);
        console.error(`\n[run-task] Task: ${path.basename(taskFile)}`);
    });
}
