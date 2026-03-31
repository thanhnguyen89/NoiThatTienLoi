import { Command } from 'commander';
import { fromRoot, readText } from '../utils.js';

const filesByMode: Record<string, string> = {
  analyze: 'document/prompts/analyze_task_prompt.md',
  implement: 'document/prompts/implement_task_prompt.md',
  review: 'document/prompts/review_task_prompt.md',
  test: 'document/prompts/test_task_prompt.md',
  ui: 'document/prompts/ui_to_task_prompt.md',
};

export function registerPromptCommand(program: Command) {
  program
    .command('prompt')
    .description('In prompt mẫu')
    .argument('<mode>', 'analyze | implement | review | test | ui')
    .option('--task <task>', 'Task file path', '')
    .action((mode, options) => {
      const file = filesByMode[mode];
      if (!file) {
        console.error('Mode không hợp lệ.');
        process.exit(1);
      }
      let content = readText(fromRoot(file));
      if (options.task) {
        content = content.replaceAll('./document/tasks/<task>.ts', options.task);
        content = content.replaceAll('- ./document/tasks/<task>.ts', `- ${options.task}`);
      }
      console.log(content);
    });
}
