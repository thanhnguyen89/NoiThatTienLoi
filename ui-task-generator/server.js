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

// Cache — đọc 1 lần khi start
let promptCache = {};

async function getPrompt(name) {
  if (!promptCache[name]) {
    const filePath = join(PROMPTS_DIR, name);
    promptCache[name] = await readFile(filePath, 'utf-8');
    console.log(`[prompt] Loaded ${name} (${promptCache[name].length} chars)`);
  }
  return promptCache[name];
}

async function getTemplates() {
  const raw = await getPrompt('templates.json');
  return JSON.parse(raw);
}

app.use(express.static(join(__dirname, 'public')));
app.use(express.json({ limit: '25mb' }));

// Helper: gọi Claude API
async function callClaude(baseUrl, apiKey, body) {
  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || JSON.stringify(data.error) || `API error ${response.status}`);
  }
  return data;
}

// Extract text from Claude response
function extractText(data) {
  return (data.content || []).map(b => b.text || '').join('').trim();
}

app.post('/api/generate', async (req, res) => {
  try {
    const baseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
    const apiKey = process.env.ANTHROPIC_AUTH_TOKEN;

    if (!apiKey) {
      return res.status(500).json({ error: 'ANTHROPIC_AUTH_TOKEN chưa được set trong file .env' });
    }

    const { model, max_tokens, messages } = req.body;

    // ── PASS 1: Phân tích ảnh → JSON ──
    const pass1Prompt = await getPrompt('pass1-analyze.txt');
    const pass1Data = await callClaude(baseUrl, apiKey, {
      model,
      max_tokens: max_tokens || 4096,
      system: pass1Prompt,
      messages,
    });

    let analysisJson = extractText(pass1Data)
      .replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    // Validate JSON
    let analysis;
    try {
      analysis = JSON.parse(analysisJson);
    } catch {
      // Nếu pass 1 không trả JSON hợp lệ → trả raw cho client debug
      return res.json({
        pass: 1,
        content: [{ type: 'text', text: analysisJson }],
        error: 'Pass 1 không trả về JSON hợp lệ. Hiển thị raw output để debug.',
      });
    }

    // ── PASS 2: JSON → file .ts ──
    const pass2Prompt = await getPrompt('pass2-format.txt');
    const pass2Data = await callClaude(baseUrl, apiKey, {
      model,
      max_tokens: max_tokens || 8192,
      system: pass2Prompt,
      messages: [{
        role: 'user',
        content: `Chuyển JSON phân tích UI sau thành file TypeScript task chuẩn.\nKhông markdown. Không backtick. Chỉ TypeScript thuần.\n\n${JSON.stringify(analysis, null, 2)}`,
      }],
    });

    let taskCode = extractText(pass2Data)
      .replace(/^```(?:typescript|ts)?\n?/, '').replace(/\n?```$/, '').trim();

    res.json({
      pass: 2,
      content: [{ type: 'text', text: taskCode }],
      analysis, // gửi kèm JSON phân tích để client có thể xem
    });

  } catch (err) {
    console.error('[/api/generate error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Reload all prompt caches
app.post('/api/reload-prompt', async (req, res) => {
  promptCache = {};
  await getPrompt('pass1-analyze.txt');
  await getPrompt('pass2-format.txt');
  await getPrompt('templates.json');
  res.json({ ok: true, cached: Object.keys(promptCache) });
});

// Get prompt templates
app.get('/api/templates', async (req, res) => {
  try {
    const templates = await getTemplates();
    res.json(templates);
  } catch (err) {
    console.error('[/api/templates error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/save-task', async (req, res) => {
  try {
    const { filename, content } = req.body;

    if (!filename || !content) {
      return res.status(400).json({ error: 'filename và content là bắt buộc' });
    }

    // Sanitize filename — chỉ cho phép a-z, 0-9, _, -, .
    const safe = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    if (!safe.endsWith('.ts')) {
      return res.status(400).json({ error: 'File phải có đuôi .ts' });
    }

    // Tạo thư mục nếu chưa có
    if (!existsSync(TASKS_DIR)) {
      await mkdir(TASKS_DIR, { recursive: true });
    }

    const filePath = join(TASKS_DIR, safe);
    await writeFile(filePath, content, 'utf-8');

    const relativePath = `document/tasks/${safe}`;
    console.log(`[save-task] Saved: ${relativePath}`);
    res.json({ ok: true, path: relativePath });
  } catch (err) {
    console.error('[/api/save-task error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log('');
  console.log('  ╔═══════════════════════════════════════╗');
  console.log('  ║     UI → Task Generator  v1.0.0       ║');
  console.log('  ╠═══════════════════════════════════════╣');
  console.log(`  ║  Local:  http://localhost:${PORT}         ║`);
  console.log('  ╚═══════════════════════════════════════╝');
  console.log('');
});
