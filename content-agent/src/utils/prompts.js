/**
 * Prompts Loader
 * Đọc system prompt từ .claude/agents/[name].md
 * Strip YAML frontmatter, chỉ lấy phần body
 */

import fs from 'fs';
import path from 'path';

const AGENTS_DIR = path.join(process.cwd(), '.claude', 'agents');

export async function readAgentPrompt(agentName) {
  const filePath = path.join(AGENTS_DIR, `${agentName}.md`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Agent prompt không tồn tại: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // Strip YAML frontmatter (--- ... ---)
  const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n/, '');

  // Lấy phần System Prompt từ code block
  const systemMatch = withoutFrontmatter.match(/## System Prompt\s*```\s*([\s\S]*?)```/);
  if (systemMatch) {
    return systemMatch[1].trim();
  }

  // Fallback: trả về toàn bộ nội dung nếu không có code block
  return withoutFrontmatter.trim();
}
