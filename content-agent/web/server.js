/**
 * Content Agent â€” Web UI Server
 * Pipeline 8 bÆ°á»›c: Research â†’ Outline â†’ Content â†’ SEO â†’ QC â†’ Thumbnail + Section Images (song song) â†’ Publish
 * Gemini API + Mock fallback
 */

import 'dotenv/config';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Gemini
let geminiAvailable = !!process.env.GEMINI_API_KEY;

app.use(express.json());

// ============================================
// AUTH (basic login)
// ============================================

const ADMIN_USERS = [
  {
    id: '1',
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    displayName: 'Quáº£n trá»‹ viÃªn',
    role: 'admin'
  }
];

const sessions = new Map();

function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((result, part) => {
      const idx = part.indexOf('=');
      if (idx === -1) return result;
      const key = part.slice(0, idx).trim();
      const value = decodeURIComponent(part.slice(idx + 1).trim());
      result[key] = value;
      return result;
    }, {});
}

function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  sessions.set(token, {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    expiresAt
  });
  return token;
}

function readSession(req) {
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const cookieToken = parseCookies(req.headers.cookie || '').ca_token || '';
  const token = bearerToken || cookieToken;

  if (!token) return null;

  const session = sessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }

  return { token, session };
}

function requireAuth(req, res, next) {
  const auth = readSession(req);
  if (!auth) {
    return res.status(401).json({ success: false, error: 'ChÆ°a Ä‘Äƒng nháº­p' });
  }

  req.user = auth.session;
  req.token = auth.token;
  next();
}

function setAuthCookie(res, token) {
  res.setHeader('Set-Cookie', `ca_token=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=28800; SameSite=Lax`);
}

function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', 'ca_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
}

app.use(express.static(path.join(__dirname, 'public')));

// Brand data â€” Ä‘á»c tá»« context/
const contextDir = path.join(__dirname, '..', 'context');
function loadContext(name) {
  const file = path.join(contextDir, name);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : '';
}
const brandData = {
  brandGuideline: loadContext('brand-guideline.md'),
  customerPersona: loadContext('customer-persona.md'),
  marketingChannels: loadContext('marketing-channels.md'),
  productCatalog: loadContext('product-catalog.md'),
};

// SOP + Data
const sopDir = path.join(__dirname, '..', 'sop');
const dataDir = path.join(__dirname, '..', 'data');
function loadSop(name) {
  const file = path.join(sopDir, name);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : '';
}
function loadData(name) {
  const file = path.join(dataDir, name);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : '';
}
const contentSop = loadSop('content-sop.md');
const researchSop = loadSop('research-sop.md');
const performanceData = loadData('performance-latest.md');

// Agent prompts
const agentsDir = path.join(__dirname, '..', '.claude', 'agents');
function loadAgentPrompt(name) {
  const file = path.join(agentsDir, `${name}.md`);
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf-8').replace(/^---[\s\S]*?---\n/, '');
}

// CLAUDE.md â€” Hiáº¿n phÃ¡p dá»± Ã¡n, inject vÃ o má»i agent call
const claudeMdPath = path.join(__dirname, '..', 'CLAUDE.md');
const claudeMd = fs.existsSync(claudeMdPath) ? fs.readFileSync(claudeMdPath, 'utf-8') : '';
console.log(claudeMd ? 'ðŸ“œ CLAUDE.md loaded' : 'âš ï¸ CLAUDE.md not found');


// ============================================
// AUTH ROUTES
// ============================================

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = ADMIN_USERS.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
  }
  const token = createSession(user);
  setAuthCookie(res, token);
  return res.json({
    success: true,
    data: { token, displayName: user.displayName, username: user.username, role: user.role }
  });
});

app.post('/api/auth/logout', (req, res) => {
  const auth = readSession(req);
  if (auth) sessions.delete(auth.token);
  clearAuthCookie(res);
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ success: true, data: req.user });
});
// ============================================
// API
// ============================================
app.get('/api/brand', requireAuth, (req, res) => res.json({
  ...brandData,
  contentSop,
  researchSop,
  performanceData,
}));
app.get('/api/status', requireAuth, (req, res) => res.json({ geminiAvailable }));
app.get('/api/products', requireAuth, (req, res) => {
  res.json([
    { id: 'lento', name: 'Lento â€” Sofa GÃ³c L', price: '85.000.000 VNÄ', category: 'Gháº¿' },
    { id: 'cleo', name: 'Cleo â€” Gháº¿ ÄÆ¡n', price: '42.000.000 VNÄ', category: 'Gháº¿' },
    { id: 'noir', name: 'Noir â€” BÃ n Ä‚n', price: '48.000.000 VNÄ', category: 'BÃ n' },
    { id: 'arc', name: 'Arc â€” BÃ n Oval', price: '32.000.000 VNÄ', category: 'BÃ n' },
  ]);
});

// ============================================
// PIPELINE SSE â€” 6 bÆ°á»›c
// ============================================
app.get('/api/pipeline/stream', requireAuth, async (req, res) => {
  const keyword = req.query.keyword;
  if (!keyword) return res.status(400).json({ error: 'Thiáº¿u tá»« khÃ³a' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const send = (step, status, data) => {
    res.write(`data: ${JSON.stringify({ step, status, data })}\n\n`);
  };

  const brandContext = [
    '=== CONTEXT: BRAND ===', brandData.brandGuideline,
    '=== CONTEXT: CUSTOMER ===', brandData.customerPersona,
    '=== CONTEXT: PRODUCTS ===', brandData.productCatalog,
    '=== CONTEXT: CHANNELS ===', brandData.marketingChannels,
    '=== SOP: CONTENT ===', contentSop,
    '=== DATA: PERFORMANCE ===', performanceData,
  ].join('\n\n');

  try {
    // â”€â”€ STEP 1: RESEARCH â”€â”€
    send('research', 'running', null);
    const research = await callGemini(
      loadAgentPrompt('researcher') || `Báº¡n lÃ  Research Analyst chuyÃªn phÃ¢n tÃ­ch ná»™i dung tiáº¿ng Viá»‡t.
Nhiá»‡m vá»¥: phÃ¢n tÃ­ch tá»« khÃ³a, xÃ¡c Ä‘á»‹nh search intent, Ä‘á»‘i tÆ°á»£ng má»¥c tiÃªu, keyword phá»¥, cÃ¢u há»i cáº§n tráº£ lá»i, key points.
Output Báº®T BUá»˜C lÃ  JSON há»£p lá»‡.`,
      `${brandContext}\n\n---\nTá»« khÃ³a: "${keyword}"\n\nPhÃ¢n tÃ­ch vÃ  tráº£ vá» JSON vá»›i format:
{
  "agent": "research",
  "status": "success",
  "keyword": "${keyword}",
  "search_intent": "informational | navigational | transactional | commercial",
  "target_audience": "mÃ´ táº£ Ä‘á»‘i tÆ°á»£ng Ä‘á»c bÃ i",
  "secondary_keywords": ["keyword phá»¥ 1", "keyword phá»¥ 2", ...],
  "questions_to_answer": ["cÃ¢u há»i 1", "cÃ¢u há»i 2", ...],
  "key_points": ["Ä‘iá»ƒm chÃ­nh 1", "Ä‘iá»ƒm chÃ­nh 2", ...],
  "recommended_word_count": 2000,
  "content_gaps": ["gap 1", "gap 2"]
}`,
      () => mockResearch(keyword)
    );
    send('research', 'done', research);

    // â”€â”€ STEP 2: OUTLINE â”€â”€
    send('outline', 'running', null);
    const outline = await callGemini(
      loadAgentPrompt('architect') || `Báº¡n lÃ  Content Strategist chuyÃªn xÃ¢y cáº¥u trÃºc bÃ i viáº¿t SEO tiáº¿ng Viá»‡t.
Nháº­n research data â†’ táº¡o outline chi tiáº¿t vá»›i heading H2/H3, key points tá»«ng pháº§n, meta description.
Output Báº®T BUá»˜C lÃ  JSON há»£p lá»‡.`,
      `${brandContext}\n\n---\nResearch data:\n${JSON.stringify(research, null, 2)}\n\nTáº¡o outline JSON:
{
  "agent": "outline",
  "status": "success",
  "title": "tiÃªu Ä‘á» bÃ i viáº¿t Ä‘á» xuáº¥t",
  "meta_description": "meta description cho SEO (150-160 kÃ½ tá»±)",
  "slug": "url-slug",
  "estimated_total_words": 2000,
  "seo_keywords": ["keyword cáº§n tÃ­ch há»£p"],
  "sections": [
    {
      "h2": "Heading H2",
      "h3s": ["H3 con náº¿u cÃ³"],
      "key_points": ["Ä‘iá»ƒm chÃ­nh section nÃ y"],
      "estimated_words": 300
    }
  ]
}`,
      () => mockOutline(keyword, research)
    );
    send('outline', 'done', outline);

    // â”€â”€ STEP 3: CONTENT â”€â”€
    send('content', 'running', null);
    const content = await callGemini(
      loadAgentPrompt('writer') || `Báº¡n lÃ  Content Writer ngÆ°á»i Viá»‡t 8 nÄƒm kinh nghiá»‡m.
Viáº¿t bÃ i HTML hoÃ n chá»‰nh theo outline. Viáº¿t nhÆ° ngÆ°á»i tháº­t, khÃ´ng nhÆ° robot.
TÃ­ch há»£p keyword tá»± nhiÃªn. Output HTML trong JSON.
KHÃ”NG dÃ¹ng: "quan trá»ng", "hiá»‡u quáº£", "bÃªn cáº¡nh Ä‘Ã³", "trong tháº¿ giá»›i hiá»‡n Ä‘áº¡i", "hy vá»ng bÃ i viáº¿t".
CÃ¢u ngáº¯n xen cÃ¢u dÃ i. Äoáº¡n vÄƒn tá»‘i Ä‘a 80 tá»«.`,
      `${brandContext}\n\n---\nOutline:\n${JSON.stringify(outline, null, 2)}\n\nResearch:\n${JSON.stringify(research, null, 2)}\n\nViáº¿t bÃ i HTML vÃ  tráº£ vá» JSON:
{
  "agent": "content",
  "status": "success",
  "word_count": 0,
  "html_content": "<article>...</article>",
  "seo_keywords_used": ["keyword Ä‘Ã£ dÃ¹ng"]
}`,
      () => mockContent(keyword, outline)
    );
    send('content', 'done', content);

    // â”€â”€ STEP 4: SEO OPTIMIZE â”€â”€
    send('seo', 'running', null);
    const seo = await callGemini(
      loadAgentPrompt('seo-specialist') || `Báº¡n lÃ  SEO Specialist 10 nÄƒm kinh nghiá»‡m thá»‹ trÆ°á»ng Viá»‡t Nam.
Nhiá»‡m vá»¥: tá»‘i Æ°u ká»¹ thuáº­t SEO cho bÃ i viáº¿t â€” KHÃ”NG viáº¿t láº¡i ná»™i dung, KHÃ”NG thay Ä‘á»•i giá»ng vÄƒn.
Keyword density má»¥c tiÃªu: 1.0â€“1.5%. Náº¿u chÃ¨n keyword lÃ m cÃ¢u gÆ°á»£ng â†’ Bá»Ž QUA.
Output Báº®T BUá»˜C lÃ  JSON.`,
      `${brandContext}\n\n---\nBÃ i viáº¿t HTML:\n${content?.html_content || ''}\n\nKeyword data:\n${JSON.stringify({
        primary_keyword: keyword,
        secondary_keywords: research?.secondary_keywords || [],
        seo_keywords: outline?.seo_keywords || [],
      }, null, 2)}\n\nOutline:\n${JSON.stringify(outline, null, 2)}\n\nTá»‘i Æ°u SEO vÃ  tráº£ vá» JSON:
{
  "agent": "seo",
  "status": "success",
  "seo_score": 0,
  "title_tag": "title tag tá»‘i Æ°u (50-60 kÃ½ tá»±)",
  "meta_description": "meta description (150-160 kÃ½ tá»±)",
  "slug": "url-slug",
  "keyword_density": "x.x%",
  "keyword_in_first_100_words": true,
  "issues_fixed": [{"issue": "", "action": ""}],
  "issues_remaining": [{"level": "critical|warning", "issue": ""}],
  "optimized_html": "<article>bÃ i Ä‘Ã£ tá»‘i Æ°u</article>"
}`,
      () => mockSEO(keyword, content)
    );
    send('seo', 'done', seo);

    // â”€â”€ STEP 5: QC / HUMANIZE â”€â”€
    send('qc', 'running', null);
    const qc = await callGemini(
      loadAgentPrompt('editor-qc') || `Báº¡n lÃ  BiÃªn táº­p viÃªn Senior 12 nÄƒm kinh nghiá»‡m táº¡i cÃ¡c tÃ²a soáº¡n lá»›n Viá»‡t Nam.
Nhiá»‡m vá»¥: biÃªn táº­p Ä‘á»ƒ bÃ i Ä‘á»c nhÆ° ngÆ°á»i tháº­t viáº¿t. XÃ³a dáº¥u váº¿t AI.
Tá»« cáº¥m pháº£i xÃ³a: "quan trá»ng", "hiá»‡u quáº£", "tuy nhiÃªn", "bÃªn cáº¡nh Ä‘Ã³", "Ä‘Ã¡ng ká»ƒ", "trong tháº¿ giá»›i hiá»‡n Ä‘áº¡i", "khÃ´ng thá»ƒ phá»§ nháº­n", "toÃ n diá»‡n", "hy vá»ng bÃ i viáº¿t", "thÃ´ng tin há»¯u Ã­ch".
Cháº¥m Humanness Score /100. Decision: PUBLISH (â‰¥76) | REVIEW (60-75) | REWRITE (<60).
Output Báº®T BUá»˜C lÃ  JSON.`,
      `${brandContext}\n\n---\nBÃ i viáº¿t Ä‘Ã£ tá»‘i Æ°u SEO:\n${seo?.optimized_html || content?.html_content || ''}\n\nBiÃªn táº­p, humanize, cháº¥m Ä‘iá»ƒm. Tráº£ vá» JSON:
{
  "agent": "qc",
  "status": "success",
  "humanness_score": 0,
  "score_breakdown": {"language_natural": 0, "structure": 0, "eeat_signals": 0, "engagement": 0},
  "decision": "PUBLISH | REVIEW | REWRITE",
  "banned_words_found": ["tá»« cáº¥m tÃ¬m tháº¥y"],
  "changes_made": ["thay Ä‘á»•i 1", "thay Ä‘á»•i 2"],
  "final_html": "<article>bÃ i Ä‘Ã£ humanize</article>"
}`,
      () => mockQC(keyword)
    );
    send('qc', 'done', qc);

    // â”€â”€ STEP 6 + 7: THUMBNAIL + SECTION IMAGES (song song) â”€â”€
    send('thumbnail', 'running', null);
    send('sectionImages', 'running', null);

    const [thumbnail, sectionImages] = await Promise.all([
      // Thumbnail
      (async () => {
        const result = {
          agent: 'thumbnail', status: 'success', _source: 'mock',
          image: {
            url: `https://placehold.co/1200x630/F5F0E8/3D2B1F?text=${encodeURIComponent(keyword)}`,
            alt_text: `${keyword} - Forme`,
            width: 1200, height: 630,
            prompt: `Premium minimalist ${keyword}, warm-toned living room, natural light, editorial photography, Forme brand style`,
          },
          notes: 'Mock â€” cáº§n tÃ­ch há»£p Gemini Imagen / DALL-E / OpenRouter',
        };
        await sleep(500);
        return result;
      })(),
      // Section Images
      (async () => {
        const sections = outline?.sections || [];
        const maxImages = Math.min(sections.length, 3);
        const result = {
          agent: 'section-images', status: 'success', _source: 'mock',
          images: sections.slice(0, maxImages).map((s, i) => ({
            section_h2: s.h2,
            url: `https://placehold.co/800x450/EDE0CC/3D2B1F?text=Section+${i + 1}`,
            alt_text: s.h2,
            width: 800, height: 450,
            prompt: `Evocative cinematic photo for "${s.h2}", warm atmospheric lighting, no text overlay`,
            style: 'evocative/cinematic',
          })),
          notes: 'Mock â€” áº£nh evocative/cinematic',
        };
        await sleep(500);
        return result;
      })(),
    ]);

    send('thumbnail', 'done', thumbnail);
    send('sectionImages', 'done', sectionImages);

    // â”€â”€ STEP 8: PUBLISH â”€â”€
    send('publish', 'running', null);
    const slug = keyword.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const publish = {
      agent: 'publisher', status: 'pending_approval',
      post_url: `https://forme.vn/${slug}`,
      report: {
        title: seo?.title_tag || outline?.title || keyword,
        slug: seo?.slug || slug,
        meta_description: seo?.meta_description || outline?.meta_description || '',
        word_count: content?.word_count || 0,
        seo_score: seo?.seo_score || 0,
        humanness_score: qc?.humanness_score || 0,
        decision: qc?.decision || 'REVIEW',
        images_count: 1 + sectionImages.images.length,
        seo_keywords: outline?.seo_keywords || [],
      },
    };
    await sleep(300);
    send('publish', 'done', publish);

    send('complete', 'done', { message: 'Pipeline hoÃ n thÃ nh' });
  } catch (err) {
    console.error('Pipeline error:', err);
    send('error', 'failed', { message: err.message });
  }
  res.end();
});

// ============================================
// GEMINI CALLER
// ============================================
async function callGemini(systemPrompt, userMessage, mockFn) {
  if (!geminiAvailable) {
    console.log(`[mock] Gemini unavailable`);
    await sleep(600 + Math.random() * 800);
    return mockFn();
  }
  try {
    // Inject CLAUDE.md (hiáº¿n phÃ¡p) + agent prompt
    const fullPrompt = [
      claudeMd ? `=== HIáº¾N PHÃP Dá»° ÃN (CLAUDE.md) ===\n${claudeMd}\n=== Háº¾T HIáº¾N PHÃP ===` : '',
      systemPrompt,
    ].filter(Boolean).join('\n\n');

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-2.0-flash'}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const { data } = await axios.post(apiUrl, {
      contents: [{ role: 'user', parts: [{ text: `${fullPrompt}\n\n---\n\n${userMessage}` }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 8192, responseMimeType: 'application/json' },
    }, { timeout: 60000 });

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);
    parsed._source = 'gemini';
    console.log(`âœ… Gemini OK`);
    return parsed;
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.warn(`âš ï¸ Gemini failed: ${msg} â†’ mock`);
    return mockFn();
  }
}

// ============================================
// MOCK DATA
// ============================================

function mockResearch(keyword) {
  return {
    agent: 'research', status: 'success', _source: 'mock',
    keyword,
    search_intent: 'commercial',
    target_audience: 'Doanh nhÃ¢n, chuyÃªn gia cao cáº¥p 40-55 tuá»•i táº¡i TP.HCM vÃ  HÃ  Ná»™i, Ä‘ang tÃ¬m ná»™i tháº¥t premium cho khÃ´ng gian sá»‘ng',
    secondary_keywords: [`${keyword} cao cáº¥p`, `mua ${keyword}`, `${keyword} Ä‘áº¹p`, `${keyword} giÃ¡ tá»‘t`],
    questions_to_answer: [`${keyword} giÃ¡ bao nhiÃªu?`, `NÃªn mua ${keyword} á»Ÿ Ä‘Ã¢u?`, `${keyword} nÃ o tá»‘t nháº¥t?`, `Cháº¥t liá»‡u nÃ o bá»n nháº¥t?`],
    key_points: ['So sÃ¡nh cháº¥t liá»‡u', 'KÃ­ch thÆ°á»›c theo diá»‡n tÃ­ch', 'Má»©c giÃ¡ thá»‹ trÆ°á»ng VN', 'Kinh nghiá»‡m chá»n mua'],
    recommended_word_count: 2200,
    content_gaps: ['ChÆ°a ai viáº¿t vá» tráº£i nghiá»‡m thá»±c táº¿ táº¡i showroom', 'Thiáº¿u so sÃ¡nh cháº¥t liá»‡u chi tiáº¿t'],
  };
}

function mockOutline(keyword, research) {
  return {
    agent: 'outline', status: 'success', _source: 'mock',
    title: `${keyword}: HÆ°á»›ng Dáº«n Chá»n ÄÃºng Tá»« ChuyÃªn Gia Ná»™i Tháº¥t`,
    meta_description: `TÃ¬m hiá»ƒu cÃ¡ch chá»n ${keyword} phÃ¹ há»£p khÃ´ng gian sá»‘ng. So sÃ¡nh cháº¥t liá»‡u, giÃ¡ thá»±c táº¿, lá»i khuyÃªn tá»« interior designer.`,
    slug: keyword.toLowerCase().replace(/\s+/g, '-'),
    estimated_total_words: 2200,
    seo_keywords: [keyword, ...(research?.secondary_keywords || []).slice(0, 3)],
    sections: [
      { h2: `Táº¡i sao chá»n ${keyword} khÃ´ng Ä‘Æ¡n giáº£n`, h3s: [], key_points: ['QuÃ¡ nhiá»u lá»±a chá»n', 'áº¢nh Ä‘áº¹p â‰  cháº¥t lÆ°á»£ng tá»‘t'], estimated_words: 300 },
      { h2: 'So sÃ¡nh cháº¥t liá»‡u: Da tháº­t vs Váº£i vs Da tá»•ng há»£p', h3s: ['Da bÃ² full-grain', 'Váº£i linen cao cáº¥p', 'Da tá»•ng há»£p PU'], key_points: ['Báº£ng so sÃ¡nh', 'Æ¯u nhÆ°á»£c Ä‘iá»ƒm', 'GiÃ¡'], estimated_words: 500 },
      { h2: 'KÃ­ch thÆ°á»›c phÃ¹ há»£p theo diá»‡n tÃ­ch phÃ²ng', h3s: [], key_points: ['Quy táº¯c 40%', 'Äo phÃ²ng trÆ°á»›c'], estimated_words: 400 },
      { h2: 'Má»©c giÃ¡ thá»±c táº¿ táº¡i Viá»‡t Nam 2024', h3s: [], key_points: ['4 phÃ¢n khÃºc giÃ¡', 'Tá»· lá»‡ cháº¥t lÆ°á»£ng/giÃ¡'], estimated_words: 400 },
      { h2: 'Lá»i khuyÃªn tá»« interior designer', h3s: [], key_points: ['Ngá»“i thá»­ 15 phÃºt', 'Mang gá»‘i tá»±a lÆ°ng'], estimated_words: 300 },
    ],
  };
}

function mockContent(keyword, outline) {
  return {
    agent: 'content', status: 'success', _source: 'mock',
    word_count: 2180,
    html_content: `<article>
<h1>${outline?.title || keyword}</h1>
<p>7 giá» tá»‘i. Báº¡n ngá»“i xuá»‘ng chiáº¿c gháº¿ cÅ© sau má»™t ngÃ y dÃ i. LÆ°ng Ä‘au. Äá»‡m lÃºn. VÃ  báº¡n tá»± há»i: Ä‘Ã£ Ä‘áº¿n lÃºc thay chÆ°a?</p>
<p>CÃ¢u tráº£ lá»i ngáº¯n: rá»“i. CÃ¢u tráº£ lá»i dÃ i hÆ¡n náº±m trong bÃ i viáº¿t nÃ y â€” khÃ´ng pháº£i Ä‘á»ƒ bÃ¡n hÃ ng, mÃ  Ä‘á»ƒ báº¡n khÃ´ng máº¥t 50 triá»‡u vÃ o thá»© sai.</p>

<h2>Táº¡i sao chá»n ${keyword} khÃ´ng Ä‘Æ¡n giáº£n</h2>
<p>Thá»‹ trÆ°á»ng ná»™i tháº¥t Viá»‡t Nam cÃ³ hÃ ng trÄƒm thÆ°Æ¡ng hiá»‡u. GiÃ¡ tá»« 5 triá»‡u Ä‘áº¿n 500 triá»‡u. NhÃ¬n áº£nh thÃ¬ chiáº¿c nÃ o cÅ©ng Ä‘áº¹p. NhÆ°ng ngá»“i thá»­ 30 phÃºt â€” khÃ¡c biá»‡t lá»™ rÃµ.</p>
<p>Váº¥n Ä‘á» khÃ´ng pháº£i "chiáº¿c nÃ o Ä‘áº¹p nháº¥t" mÃ  lÃ  "chiáº¿c nÃ o phÃ¹ há»£p khÃ´ng gian cá»§a báº¡n nháº¥t".</p>

<h2>So sÃ¡nh cháº¥t liá»‡u: Da tháº­t vs Váº£i vs Da tá»•ng há»£p</h2>
<table>
<thead><tr><th>Cháº¥t liá»‡u</th><th>Æ¯u Ä‘iá»ƒm</th><th>NhÆ°á»£c Ä‘iá»ƒm</th><th>GiÃ¡ TB</th></tr></thead>
<tbody>
<tr><td>Da bÃ² full-grain</td><td>Bá»n 15-20 nÄƒm, Ä‘áº¹p theo thá»i gian</td><td>GiÃ¡ cao, cáº§n báº£o dÆ°á»¡ng</td><td>60-120 triá»‡u</td></tr>
<tr><td>Váº£i linen cao cáº¥p</td><td>ThoÃ¡ng mÃ¡t, nhiá»u mÃ u, dá»… thay vá»</td><td>Dá»… bÃ¡m báº©n hÆ¡n da</td><td>40-80 triá»‡u</td></tr>
<tr><td>Da tá»•ng há»£p PU</td><td>GiÃ¡ ráº», dá»… vá»‡ sinh</td><td>Bong trÃ³c sau 3-5 nÄƒm</td><td>15-35 triá»‡u</td></tr>
</tbody>
</table>

<h2>KÃ­ch thÆ°á»›c phÃ¹ há»£p theo diá»‡n tÃ­ch phÃ²ng</h2>
<p>PhÃ²ng 20mÂ²: sofa 2 chá»—. PhÃ²ng 30mÂ²: sofa 3 chá»— hoáº·c L nhá». PhÃ²ng 40mÂ²+: sofa gÃ³c L lá»›n.</p>
<p>Quy táº¯c vÃ ng: sofa khÃ´ng chiáº¿m quÃ¡ 40% diá»‡n tÃ­ch sÃ n phÃ²ng khÃ¡ch.</p>

<h2>Má»©c giÃ¡ thá»±c táº¿ táº¡i Viá»‡t Nam 2024</h2>
<table>
<thead><tr><th>PhÃ¢n khÃºc</th><th>Khoáº£ng giÃ¡</th><th>Äáº·c Ä‘iá»ƒm</th></tr></thead>
<tbody>
<tr><td>Phá»• thÃ´ng</td><td>5-15 triá»‡u</td><td>Khung gá»— Ã©p, Ä‘á»‡m má»ng</td></tr>
<tr><td>Trung cáº¥p</td><td>15-40 triá»‡u</td><td>Khung gá»— tá»± nhiÃªn, Ä‘á»‡m tá»‘t</td></tr>
<tr><td>Cao cáº¥p</td><td>40-100 triá»‡u</td><td>Cháº¥t liá»‡u nháº­p, thiáº¿t káº¿ riÃªng</td></tr>
<tr><td>Luxury</td><td>100 triá»‡u+</td><td>ThÆ°Æ¡ng hiá»‡u, handmade</td></tr>
</tbody>
</table>

<h2>Lá»i khuyÃªn tá»« interior designer</h2>
<p>"Äá»«ng chá»n sofa vÃ¬ nÃ³ Ä‘áº¹p trÃªn Instagram. HÃ£y ngá»“i thá»­ Ã­t nháº¥t 15 phÃºt. Náº¿u sau 15 phÃºt báº¡n khÃ´ng muá»‘n Ä‘á»©ng dáº­y â€” Ä‘Ã³ lÃ  chiáº¿c sofa Ä‘Ãºng."</p>
<p>Thá»­ Ã¡p dá»¥ng quy táº¯c 15 phÃºt trong tuáº§n nÃ y. GhÃ© má»™t showroom, ngá»“i thá»­, vÃ  báº¡n sáº½ biáº¿t ngay.</p>
</article>`,
    seo_keywords_used: [keyword, `${keyword} cao cáº¥p`, 'cháº¥t liá»‡u', 'ná»™i tháº¥t'],
  };
}

function mockSEO(keyword, content) {
  return {
    agent: 'seo', status: 'success', _source: 'mock',
    seo_score: 87,
    title_tag: `${keyword}: HÆ°á»›ng Dáº«n Chá»n ÄÃºng Tá»« ChuyÃªn Gia | Forme`,
    meta_description: `TÃ¬m hiá»ƒu cÃ¡ch chá»n ${keyword} phÃ¹ há»£p khÃ´ng gian sá»‘ng. So sÃ¡nh cháº¥t liá»‡u, giÃ¡ thá»±c táº¿ 2024, lá»i khuyÃªn tá»« interior designer.`,
    slug: keyword.toLowerCase().replace(/\s+/g, '-'),
    keyword_density: '1.3%',
    keyword_in_first_100_words: true,
    issues_fixed: [
      { issue: 'Thiáº¿u keyword trong H2 Ä‘áº§u tiÃªn', action: 'ÄÃ£ thÃªm keyword tá»± nhiÃªn' },
      { issue: 'Alt text áº£nh trá»‘ng', action: 'ÄÃ£ thÃªm alt text cÃ³ keyword' },
      { issue: 'Meta description quÃ¡ ngáº¯n', action: 'ÄÃ£ viáº¿t láº¡i 155 kÃ½ tá»±' },
    ],
    issues_remaining: [],
    optimized_html: content?.html_content || '',
  };
}

function mockQC(keyword) {
  return {
    agent: 'qc', status: 'success', _source: 'mock',
    humanness_score: 82,
    score_breakdown: { language_natural: 21, structure: 22, eeat_signals: 19, engagement: 20 },
    decision: 'PUBLISH',
    banned_words_found: ['quan trá»ng (1 láº§n)', 'hiá»‡u quáº£ (1 láº§n)'],
    changes_made: [
      'Viáº¿t láº¡i má»Ÿ bÃ i â€” dÃ¹ng tÃ¬nh huá»‘ng cá»¥ thá»ƒ',
      'XÃ³a 2 tá»« cáº¥m: "quan trá»ng", "hiá»‡u quáº£"',
      'ThÃªm 4 cÃ¢u ngáº¯n 5-7 tá»« táº¡i Ä‘iá»ƒm nháº¥n',
      'PhÃ¡ 1 bullet list thÃ nh Ä‘oáº¡n vÄƒn',
      'Viáº¿t láº¡i káº¿t bÃ i â€” CTA cá»¥ thá»ƒ: quy táº¯c 15 phÃºt',
    ],
    final_html: '',
  };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

app.listen(PORT, () => {
  console.log(`\nðŸš€ Content Agent UI: http://localhost:${PORT}`);
  console.log(`ðŸ“¡ Gemini: ${geminiAvailable ? 'Sáºµn sÃ ng (' + (process.env.GEMINI_MODEL || 'gemini-2.0-flash') + ')' : 'âŒ Mock data'}\n`);
});

