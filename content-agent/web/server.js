/**
 * Content Agent — Web UI Server
 * Gemini API + Mock fallback
 */

import 'dotenv/config';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Gemini setup
let model = null;
let geminiAvailable = false;
try {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' });
  geminiAvailable = true;
} catch (e) {
  console.warn('⚠️ Gemini SDK init failed, sẽ dùng mock data');
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load example data
const exampleDir = path.join(__dirname, '..', 'exmple');
function loadExample(name) {
  const file = path.join(exampleDir, name);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : '';
}

const brandData = {
  brandGuideline: loadExample('brand-guideline.md'),
  customerPersona: loadExample('customer-persona.md'),
  marketingChannels: loadExample('marketing-channels.md'),
  productCatalog: loadExample('product-catalog.md'),
};

const agentsDir = path.join(__dirname, '..', '.claude', 'agents');
function loadAgentPrompt(name) {
  const file = path.join(agentsDir, `${name}.md`);
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf-8').replace(/^---[\s\S]*?---\n/, '');
}

// ============================================
// API
// ============================================

app.get('/api/brand', (req, res) => res.json(brandData));
app.get('/api/status', (req, res) => res.json({ geminiAvailable }));

app.get('/api/products', (req, res) => {
  res.json([
    { id: 'lento', name: 'Lento — Sofa Góc L', price: '85.000.000 VNĐ', category: 'Ghế' },
    { id: 'cleo', name: 'Cleo — Ghế Đơn', price: '42.000.000 VNĐ', category: 'Ghế' },
    { id: 'noir', name: 'Noir — Bàn Ăn', price: '48.000.000 VNĐ', category: 'Bàn' },
    { id: 'arc', name: 'Arc — Bàn Oval', price: '32.000.000 VNĐ', category: 'Bàn' },
  ]);
});

// ============================================
// PIPELINE SSE
// ============================================

app.get('/api/pipeline/stream', async (req, res) => {
  const keyword = req.query.keyword;
  const product = req.query.product || '';
  const contentType = req.query.contentType || 'blog';

  if (!keyword) return res.status(400).json({ error: 'Thiếu từ khóa' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const send = (step, status, data) => {
    res.write(`data: ${JSON.stringify({ step, status, data })}\n\n`);
  };

  const brandContext = [
    '--- BRAND GUIDELINE ---', brandData.brandGuideline,
    '--- CUSTOMER PERSONA ---', brandData.customerPersona,
    '--- PRODUCT CATALOG ---', brandData.productCatalog,
    '--- MARKETING CHANNELS ---', brandData.marketingChannels,
  ].join('\n\n');

  try {
    // STEP 1: RESEARCHER
    send('researcher', 'running', null);
    const researcherResult = await callAgent('researcher',
      `${brandContext}\n\n---\nInput:\n${JSON.stringify({ keyword, language: 'vi', market: 'VN' })}\n\nThực hiện nhiệm vụ và trả về JSON.`,
      () => mockResearcher(keyword)
    );
    send('researcher', 'done', researcherResult);

    // STEP 2: ARCHITECT
    send('architect', 'running', null);
    const architectResult = await callAgent('architect',
      `${brandContext}\n\n---\nResearch data:\n${JSON.stringify(researcherResult, null, 2)}\n\nThực hiện nhiệm vụ và trả về JSON.`,
      () => mockArchitect(keyword)
    );
    send('architect', 'done', architectResult);

    // STEP 3: WRITER
    send('writer', 'running', null);
    const writerResult = await callAgent('writer',
      `${brandContext}\n\n---\nOutline:\n${JSON.stringify(architectResult, null, 2)}\n\nResearch:\n${JSON.stringify(researcherResult, null, 2)}\n\nViết bài HTML hoàn chỉnh. Trả về JSON.`,
      () => mockWriter(keyword)
    );
    send('writer', 'done', writerResult);

    // STEP 4: IMAGE GEN (always mock)
    send('imageGen', 'running', null);
    const imageResult = mockImageGen(keyword, architectResult);
    await sleep(500);
    send('imageGen', 'done', imageResult);

    // STEP 5: SEO
    send('seo', 'running', null);
    const seoResult = await callAgent('seo-specialist',
      `${brandContext}\n\n---\nInput:\n${JSON.stringify({
        html_content: writerResult?.html_content || '',
        keyword_data: {
          primary_keyword: keyword,
          secondary_keywords: researcherResult?.secondary_keywords || [],
          lsi_keywords: researcherResult?.lsi_keywords || [],
        },
        architect_output: architectResult,
      }, null, 2)}\n\nTối ưu SEO và trả về JSON.`,
      () => mockSEO(keyword)
    );
    send('seo', 'done', seoResult);

    // STEP 6: EDITOR QC
    send('editorQc', 'running', null);
    const editorResult = await callAgent('editor-qc',
      `${brandContext}\n\n---\nInput từ SEO:\n${JSON.stringify(seoResult, null, 2)}\n\nBiên tập, humanize, chấm điểm. Trả về JSON.`,
      () => mockEditorQC(keyword)
    );
    send('editorQc', 'done', editorResult);

    // STEP 7: PUBLISHER
    send('publisher', 'running', null);
    const slug = keyword.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const publisherResult = {
      agent: 'publisher', status: 'pending_approval',
      post_url: `https://forme.vn/${slug}`,
      report: {
        title: seoResult?.title_tag || architectResult?.recommended_title || keyword,
        slug,
        word_count: editorResult?.word_count || writerResult?.word_count || 0,
        seo_score: seoResult?.seo_score || 0,
        humanness_score: editorResult?.humanness_score || 0,
        images_count: imageResult.images.length,
        processing_time_minutes: 0,
        estimated_api_cost_usd: 0,
      },
    };
    await sleep(300);
    send('publisher', 'done', publisherResult);

    send('complete', 'done', { message: 'Pipeline hoàn thành' });
  } catch (err) {
    console.error('Pipeline error:', err);
    send('error', 'failed', { message: err.message });
  }
  res.end();
});

// ============================================
// GEMINI CALLER with mock fallback
// ============================================

async function callAgent(agentName, userMessage, mockFn) {
  if (!geminiAvailable || !model) {
    console.log(`[${agentName}] Gemini unavailable → mock`);
    await sleep(600 + Math.random() * 800);
    return mockFn();
  }

  const systemPrompt = loadAgentPrompt(agentName);

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n---\n\n${userMessage}` }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    });

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);
    parsed._source = 'gemini';
    console.log(`✅ [${agentName}] Gemini OK`);
    return parsed;

  } catch (err) {
    console.warn(`⚠️ [${agentName}] Gemini failed: ${err.message} → fallback mock`);
    return mockFn();
  }
}

// ============================================
// MOCK DATA
// ============================================

function mockResearcher(keyword) {
  return {
    agent: 'researcher', status: 'success', _source: 'mock',
    keyword,
    search_intent: 'commercial',
    recommended_content_type: 'guide',
    recommended_word_count: 2200,
    primary_keyword: keyword,
    secondary_keywords: [`${keyword} cao cấp`, `mua ${keyword}`, `${keyword} đẹp`, `${keyword} giá tốt`],
    lsi_keywords: ['nội thất', 'thiết kế', 'không gian sống', 'tối giản', 'phòng khách'],
    people_also_ask: [
      `${keyword} giá bao nhiêu?`,
      `Nên mua ${keyword} ở đâu?`,
      `${keyword} nào tốt nhất 2024?`,
    ],
    top_competitors: [
      { url: 'https://example.com/1', title: `Top 10 ${keyword}`, word_count: 1800, strengths: ['SEO tốt', 'Ảnh đẹp'], weaknesses: ['Thiếu so sánh giá'] },
      { url: 'https://example.com/2', title: `Hướng dẫn chọn ${keyword}`, word_count: 2100, strengths: ['Chi tiết'], weaknesses: ['Giọng văn AI'] },
    ],
    content_gaps: ['Chưa ai viết về trải nghiệm thực tế tại showroom', 'Thiếu so sánh chất liệu chi tiết với hình ảnh'],
    unique_angles: ['Góc nhìn từ interior designer thực tế', 'So sánh giá thị trường VN vs nhập khẩu'],
  };
}

function mockArchitect(keyword) {
  return {
    agent: 'architect', status: 'success', _source: 'mock',
    title_options: [
      { title: `${keyword}: Hướng Dẫn Chọn Đúng Từ Chuyên Gia Nội Thất`, reason: 'Có authority, có keyword' },
      { title: `Đừng Mua ${keyword} Khi Chưa Đọc Bài Này`, reason: 'Curiosity gap, tạo urgency' },
    ],
    recommended_title: `${keyword}: Hướng Dẫn Chọn Đúng Từ Chuyên Gia Nội Thất`,
    h1: `${keyword} — Chọn Đúng Ngay Lần Đầu`,
    meta_description_draft: `Tìm hiểu cách chọn ${keyword} phù hợp không gian sống. Phân tích chất liệu, so sánh giá, và lời khuyên từ interior designer.`,
    slug: keyword.toLowerCase().replace(/\s+/g, '-'),
    estimated_total_words: 2200,
    intro_notes: 'Mở bài bằng tình huống cụ thể — ngồi sofa cũ, lưng đau. Không dùng "Trong bài viết này..."',
    sections: [
      { h2: `Tại sao chọn ${keyword} không đơn giản như bạn nghĩ`, keywords_to_include: [keyword], estimated_words: 300, content_notes: 'Nêu vấn đề: quá nhiều lựa chọn, ảnh đẹp nhưng chất lượng khác nhau', needs_image: true, image_prompt: `Showroom nội thất cao cấp, nhiều sofa`, needs_table: false, needs_list: false },
      { h2: 'So sánh chất liệu: Da thật vs Vải vs Da tổng hợp', keywords_to_include: ['chất liệu', keyword], estimated_words: 500, content_notes: 'Bảng so sánh 3 loại: ưu nhược điểm, giá, độ bền', needs_image: false, needs_table: true, table_columns: ['Chất liệu', 'Ưu điểm', 'Nhược điểm', 'Giá TB'], needs_list: false },
      { h2: 'Kích thước phù hợp theo diện tích phòng', keywords_to_include: ['kích thước', 'phòng khách'], estimated_words: 400, content_notes: 'Quy tắc 40% diện tích sàn', needs_image: true, image_prompt: 'Phòng khách tối giản với sofa vừa vặn', needs_table: false, needs_list: true },
      { h2: 'Mức giá thực tế tại thị trường Việt Nam 2024', keywords_to_include: ['giá', keyword], estimated_words: 400, content_notes: '4 phân khúc: phổ thông, trung cấp, cao cấp, luxury', needs_image: false, needs_table: true, table_columns: ['Phân khúc', 'Khoảng giá', 'Đặc điểm'], needs_list: false },
      { h2: 'Lời khuyên từ interior designer', keywords_to_include: [keyword, 'thiết kế'], estimated_words: 300, content_notes: 'Quote thật, lời khuyên thực tế: ngồi thử 15 phút', needs_image: false, needs_table: false, needs_list: false },
    ],
    faq: [
      { question: `${keyword} giá bao nhiêu?`, answer_notes: 'Phân khúc 30-100 triệu tùy chất liệu' },
      { question: `Nên mua ${keyword} ở đâu?`, answer_notes: 'Luôn đến showroom ngồi thử trước' },
    ],
    image_prompts: [
      { position: 'thumbnail', dimensions: '1200x630', prompt: `Premium minimalist ${keyword} in warm-toned living room, natural light, Forme style` },
      { position: 'after-section-1', dimensions: '800x450', prompt: `Luxury furniture showroom, warm lighting, multiple sofas` },
    ],
    cta_suggestion: 'Đặt lịch trải nghiệm tại showroom Forme — chỉ cần 30 phút để tìm đúng chiếc sofa của bạn.',
  };
}

function mockWriter(keyword) {
  return {
    agent: 'writer', status: 'success', _source: 'mock',
    word_count: 2180,
    html_content: `<article>
<h1>${keyword} — Chọn Đúng Ngay Lần Đầu</h1>

<p>7 giờ tối. Bạn ngồi xuống chiếc ghế cũ sau một ngày dài. Lưng đau. Đệm lún. Và bạn tự hỏi: đã đến lúc thay chưa?</p>

<p>Câu trả lời ngắn: rồi. Câu trả lời dài hơn nằm trong bài viết này — không phải để bán hàng, mà để bạn không mất 50 triệu vào thứ sai.</p>

<h2>Tại sao chọn ${keyword} không đơn giản như bạn nghĩ</h2>
<p>Thị trường nội thất Việt Nam có hàng trăm thương hiệu. Giá từ 5 triệu đến 500 triệu. Nhìn ảnh thì chiếc nào cũng đẹp. Nhưng ngồi thử 30 phút — khác biệt lộ rõ.</p>
<p>Vấn đề không phải "chiếc nào đẹp nhất" mà là "chiếc nào phù hợp không gian của bạn nhất". Một chiếc sofa 100 triệu đặt sai phòng vẫn xấu. Một chiếc 40 triệu đặt đúng chỗ — hoàn hảo.</p>

<h2>So sánh chất liệu: Da thật vs Vải vs Da tổng hợp</h2>
<table>
<thead><tr><th>Chất liệu</th><th>Ưu điểm</th><th>Nhược điểm</th><th>Giá TB</th></tr></thead>
<tbody>
<tr><td>Da bò full-grain</td><td>Bền 15-20 năm, đẹp theo thời gian</td><td>Giá cao, cần bảo dưỡng 6 tháng/lần</td><td>60-120 triệu</td></tr>
<tr><td>Vải linen cao cấp</td><td>Thoáng mát, nhiều màu, dễ thay vỏ</td><td>Dễ bám bẩn hơn da</td><td>40-80 triệu</td></tr>
<tr><td>Da tổng hợp (PU/PVC)</td><td>Giá rẻ, dễ vệ sinh</td><td>Bong tróc sau 3-5 năm, nóng mùa hè</td><td>15-35 triệu</td></tr>
</tbody>
</table>
<p>Da bò full-grain là lựa chọn tốt nhất nếu bạn muốn dùng lâu dài. Vải linen phù hợp ai thích thay đổi phong cách. Da tổng hợp? Tiết kiệm ngắn hạn, tốn kém dài hạn.</p>

<h2>Kích thước phù hợp theo diện tích phòng</h2>
<p>Phòng 20m²: sofa 2 chỗ (160-180cm). Phòng 30m²: sofa 3 chỗ hoặc L nhỏ. Phòng 40m² trở lên: thoải mái chọn sofa góc L lớn như Lento.</p>
<p>Quy tắc vàng: sofa không chiếm quá 40% diện tích sàn phòng khách. Nhiều hơn — phòng chật. Ít hơn — phòng trống.</p>
<p>Đo phòng trước. Đo lối đi. Đo cửa ra vào. Ba con số này quyết định bạn mua được sofa nào.</p>

<h2>Mức giá thực tế tại thị trường Việt Nam 2024</h2>
<table>
<thead><tr><th>Phân khúc</th><th>Khoảng giá</th><th>Đặc điểm</th></tr></thead>
<tbody>
<tr><td>Phổ thông</td><td>5-15 triệu</td><td>Khung gỗ ép, đệm mỏng, bọc PU</td></tr>
<tr><td>Trung cấp</td><td>15-40 triệu</td><td>Khung gỗ tự nhiên, đệm foam tốt</td></tr>
<tr><td>Cao cấp</td><td>40-100 triệu</td><td>Chất liệu nhập, thiết kế riêng, bảo hành dài</td></tr>
<tr><td>Luxury</td><td>100 triệu+</td><td>Thương hiệu, handmade, vật liệu tối ưu</td></tr>
</tbody>
</table>
<p>Phân khúc 40-80 triệu cho tỷ lệ chất lượng/giá tốt nhất. Dưới 15 triệu — bạn đang mua đồ dùng tạm. Trên 100 triệu — bạn đang mua trải nghiệm.</p>

<h2>Lời khuyên từ interior designer</h2>
<p>"Đừng chọn sofa vì nó đẹp trên Instagram. Hãy ngồi thử ít nhất 15 phút. Nếu sau 15 phút bạn không muốn đứng dậy — đó là chiếc sofa đúng."</p>
<p>Một lời khuyên nữa: mang theo gối tựa lưng bạn hay dùng khi đi thử sofa. Cảm giác ngồi sẽ khác hoàn toàn so với ngồi tay không.</p>

<h2>FAQ</h2>
<h3>${keyword} giá bao nhiêu?</h3>
<p>Tùy chất liệu và thương hiệu, giá dao động từ 15 triệu (trung cấp) đến trên 100 triệu (luxury). Phân khúc 40-80 triệu cho chất lượng tốt nhất so với giá.</p>

<h3>Nên mua ${keyword} ở đâu?</h3>
<p>Luôn đến showroom ngồi thử trước khi mua. Mua online chỉ phù hợp khi bạn đã biết chính xác model và đã trải nghiệm thực tế rồi.</p>

<p><strong>Thử áp dụng quy tắc 15 phút trong tuần này.</strong> Ghé một showroom, ngồi thử, và bạn sẽ biết ngay chiếc sofa nào là của mình.</p>
</article>`,
    image_placeholders: [
      { placeholder: '[IMAGE: thumbnail]', prompt: `Premium ${keyword} in minimalist living room` }
    ],
  };
}

function mockImageGen(keyword, architectResult) {
  const prompts = architectResult?.image_prompts || [{ position: 'thumbnail', dimensions: '1200x630' }];
  return {
    agent: 'image-gen', status: 'success', _source: 'mock',
    images: prompts.map(p => ({
      position: p.position || 'thumbnail',
      url: `https://placehold.co/${(p.dimensions || '1200x630')}/F5F0E8/3D2B1F?text=Forme+${encodeURIComponent(p.position || 'img')}`,
      alt_text: p.prompt || `${keyword} - Forme`,
      width: parseInt((p.dimensions || '1200x630').split('x')[0]),
      height: parseInt((p.dimensions || '1200x630').split('x')[1]),
      file_size_kb: 145,
    })),
    failed: [],
    notes: 'Mock images — tích hợp Flux/DALL-E để tạo ảnh thật',
  };
}

function mockSEO(keyword) {
  return {
    agent: 'seo-specialist', status: 'success', _source: 'mock',
    seo_score: 87,
    title_tag: `${keyword}: Hướng Dẫn Chọn Đúng Từ Chuyên Gia | Forme`,
    meta_description: `Tìm hiểu cách chọn ${keyword} phù hợp không gian sống. So sánh chất liệu, giá thực tế 2024, lời khuyên từ interior designer.`,
    slug: keyword.toLowerCase().replace(/\s+/g, '-'),
    keyword_density: '1.3%',
    keyword_in_first_100_words: true,
    issues_fixed: [
      { issue: 'Thiếu keyword trong H2 đầu tiên', action: 'Đã thêm keyword tự nhiên' },
      { issue: 'Alt text ảnh trống', action: 'Đã thêm alt text có keyword' },
      { issue: 'Meta description quá ngắn', action: 'Đã viết lại 155 ký tự' },
    ],
    issues_remaining: [],
  };
}

function mockEditorQC(keyword) {
  return {
    agent: 'editor-qc', status: 'success', _source: 'mock',
    humanness_score: 82,
    score_breakdown: { language_natural: 21, structure: 22, eeat_signals: 19, engagement: 20 },
    decision: 'PUBLISH',
    changes_made: [
      'Viết lại mở bài — dùng tình huống cụ thể (7 giờ tối, lưng đau)',
      'Xóa 3 từ cấm: "quan trọng", "hiệu quả", "bên cạnh đó"',
      'Thêm 4 câu ngắn 5-7 từ tại điểm nhấn',
      'Phá 1 bullet list thành đoạn văn',
      'Viết lại kết bài — CTA cụ thể: quy tắc 15 phút',
    ],
    fact_check_flags: [],
    feedback_for_writer: '',
  };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

app.listen(PORT, () => {
  console.log(`\n🚀 Content Agent UI: http://localhost:${PORT}`);
  console.log(`📡 Gemini: ${geminiAvailable ? 'Sẵn sàng (' + (process.env.GEMINI_MODEL || 'gemini-2.0-flash') + ')' : '❌ Không khả dụng → dùng mock data'}\n`);
});
