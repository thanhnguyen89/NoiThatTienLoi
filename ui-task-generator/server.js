import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const TASKS_DIR = join(__dirname, 'document', 'tasks');
const PROMPTS_DIR = join(__dirname, 'prompts');

let promptCache = {};
async function getPrompt(name) {
  if (!promptCache[name]) {
    promptCache[name] = await readFile(join(PROMPTS_DIR, name), 'utf-8');
    console.log(`[prompt] Loaded ${name} (${promptCache[name].length} chars)`);
  }
  return promptCache[name];
}

app.use(express.static(join(__dirname, 'public')));
app.use(express.json({ limit: '25mb' }));

// ── Claude API helper ──
async function callClaude(body) {
  const baseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN;
  if (!apiKey) throw new Error('ANTHROPIC_AUTH_TOKEN chưa set trong .env');

  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data.error) || `API ${res.status}`);
  return (data.content || []).map(b => b.text || '').join('').trim();
}

// ── Single pass: Ảnh → JSON ──
app.post('/api/generate', async (req, res) => {
  try {
    const { model, max_tokens, messages } = req.body;
    const prompt = await getPrompt('pass1-analyze.txt');

    let raw = await callClaude({ model, max_tokens: max_tokens || 4096, system: prompt, messages });
    raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    let analysis;
    try { analysis = JSON.parse(raw); }
    catch { return res.json({ ok: false, raw }); }

    res.json({ ok: true, analysis });
  } catch (err) {
    console.error('[generate]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Templates ──
app.get('/api/templates', async (req, res) => {
  try {
    res.json(JSON.parse(await getPrompt('templates.json')));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Save file ──
app.post('/api/save-task', async (req, res) => {
  try {
    const { filename, content } = req.body;
    if (!filename || !content) return res.status(400).json({ error: 'filename và content bắt buộc' });
    const safe = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    if (!safe.endsWith('.ts') && !safe.endsWith('.md') && !safe.endsWith('.json')) return res.status(400).json({ error: 'Đuôi .ts, .md hoặc .json' });
    if (!existsSync(TASKS_DIR)) await mkdir(TASKS_DIR, { recursive: true });
    await writeFile(join(TASKS_DIR, safe), content, 'utf-8');
    const path = `document/tasks/${safe}`;
    console.log(`[save] ${path}`);
    res.json({ ok: true, path });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Reload cache ──
app.post('/api/reload-prompt', async (req, res) => {
  promptCache = {};
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`\n  UI → Task Generator v2.0 | http://localhost:${PORT}\n`);
});
