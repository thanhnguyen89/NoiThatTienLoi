#!/usr/bin/env node
import { Command } from 'commander';
import { registerInitCommand } from './commands/init.js';
import { registerCheckCommand } from './commands/check.js';
import { registerNewTaskCommand } from './commands/new-task.js';
import { registerNewModelTaskCommand } from './commands/new-model-task.js';
import { registerPromptCommand } from './commands/prompt.js';
import { registerRunTaskCommand } from './commands/run-task.js';
import { registerRunModelCommand } from './commands/run-model.js';
import { registerUiTaskCommand } from './commands/ui-task.js';
const program = new Command();
program
    .name('ai-dev')
    .description('AI Dev CLI Level 2 cho nhiều model')
    .version('2.0.0');
registerInitCommand(program);
registerCheckCommand(program);
registerNewTaskCommand(program);
registerNewModelTaskCommand(program);
registerPromptCommand(program);
registerRunTaskCommand(program);
registerRunModelCommand(program);
registerUiTaskCommand(program);
program.parse();
