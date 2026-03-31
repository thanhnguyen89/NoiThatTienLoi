import fs from 'node:fs';
import path from 'node:path';

export function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function writeFileSafe(filePath: string, content: string, overwrite = false) {
  ensureDir(path.dirname(filePath));
  if (fs.existsSync(filePath) && !overwrite) {
    throw new Error(`File đã tồn tại: ${filePath}`);
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

export function readText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

export function exists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function projectRoot(): string {
  return process.cwd();
}

export function fromRoot(...segments: string[]): string {
  return path.join(projectRoot(), ...segments);
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function fillTemplate(template: string, replacements: Record<string, string>) {
  return Object.entries(replacements).reduce(
    (acc, [key, value]) => acc.replaceAll(key, value),
    template
  );
}
