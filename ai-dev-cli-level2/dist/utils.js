import fs from 'node:fs';
import path from 'node:path';
export function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}
export function writeFileSafe(filePath, content, overwrite = false) {
    ensureDir(path.dirname(filePath));
    if (fs.existsSync(filePath) && !overwrite) {
        throw new Error(`File đã tồn tại: ${filePath}`);
    }
    fs.writeFileSync(filePath, content, 'utf-8');
}
export function readText(filePath) {
    return fs.readFileSync(filePath, 'utf-8');
}
export function exists(filePath) {
    return fs.existsSync(filePath);
}
export function projectRoot() {
    return process.cwd();
}
export function fromRoot(...segments) {
    return path.join(projectRoot(), ...segments);
}
export function slugify(input) {
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
export function fillTemplate(template, replacements) {
    return Object.entries(replacements).reduce((acc, [key, value]) => acc.replaceAll(key, value), template);
}
