/**
 * State Manager
 * Lưu và đọc trạng thái pipeline
 * Cho phép resume nếu crash giữa chừng
 */

import fs from 'fs';
import path from 'path';

const STATE_DIR = path.join(process.cwd(), 'output', 'states');

export async function saveState(runId, state) {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
  const filePath = path.join(STATE_DIR, `${runId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
}

export async function loadState(runId) {
  const filePath = path.join(STATE_DIR, `${runId}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export async function listStates() {
  if (!fs.existsSync(STATE_DIR)) return [];
  return fs.readdirSync(STATE_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(STATE_DIR, f), 'utf-8'));
      return {
        runId: data.runId,
        keyword: data.keyword,
        status: data.status,
        startedAt: data.startedAt,
        completedAt: data.completedAt
      };
    })
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
}
