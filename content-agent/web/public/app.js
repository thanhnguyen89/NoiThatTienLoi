// ============================================
// Content Agent — Frontend App (SSE streaming)
// ============================================

let brandData = {};
const STEP_ORDER = ['researcher', 'architect', 'writer', 'imageGen', 'seo', 'editorQc', 'publisher'];

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  await loadBrandData();
  setupNavigation();
  setupBrandTabs();

  document.getElementById('keyword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runPipeline();
  });
});

async function loadProducts() {
  const res = await fetch('/api/products');
  const products = await res.json();
  const select = document.getElementById('product');
  products.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} — ${p.price}`;
    select.appendChild(opt);
  });
}

async function loadBrandData() {
  const res = await fetch('/api/brand');
  brandData = await res.json();
  document.getElementById('brand-text').textContent = brandData.brandGuideline || 'Chưa có dữ liệu';
}

// ============================================
// NAVIGATION
// ============================================

function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById(`view-${view}`).classList.add('active');
    });
  });
}

function setupBrandTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const key = tab.dataset.tab;
      document.getElementById('brand-text').textContent = brandData[key] || 'Chưa có dữ liệu';
    });
  });
}

// ============================================
// PIPELINE — SSE streaming
// ============================================

let pipelineResults = {};

async function runPipeline() {
  const keyword = document.getElementById('keyword').value.trim();
  if (!keyword) {
    document.getElementById('keyword').focus();
    return;
  }

  const product = document.getElementById('product').value;
  const contentType = document.getElementById('contentType').value;
  const btn = document.getElementById('btn-run');

  btn.disabled = true;
  btn.textContent = '⏳ Đang chạy pipeline...';
  pipelineResults = {};

  // Reset UI
  const stepsEl = document.getElementById('pipeline-steps');
  stepsEl.classList.remove('hidden');
  document.getElementById('final-report').classList.add('hidden');
  document.getElementById('article-preview').classList.add('hidden');

  document.querySelectorAll('.step').forEach(s => {
    s.classList.remove('done', 'running', 'error');
    s.querySelector('.step-status').textContent = 'Chờ';
    s.querySelector('.step-body').classList.add('hidden');
    s.querySelector('.step-body').innerHTML = '';
  });

  // Start timer
  const startTime = Date.now();
  const timerEl = document.getElementById('timer');
  if (timerEl) timerEl.remove();
  const timer = document.createElement('div');
  timer.id = 'timer';
  timer.style.cssText = 'text-align:center;color:#7a6a5e;font-size:13px;margin-bottom:12px';
  stepsEl.before(timer);
  const timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    timer.textContent = `⏱️ ${elapsed}s`;
  }, 1000);

  // SSE connection
  const params = new URLSearchParams({ keyword, product, contentType });
  const eventSource = new EventSource(`/api/pipeline/stream?${params}`);

  eventSource.onmessage = (event) => {
    const { step, status, data } = JSON.parse(event.data);

    if (step === 'complete') {
      eventSource.close();
      clearInterval(timerInterval);
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      timer.textContent = `✅ Hoàn thành trong ${elapsed}s`;

      // Update processing time in publisher report
      if (pipelineResults.publisher?.report) {
        pipelineResults.publisher.report.processing_time_minutes = Math.round(elapsed / 60 * 10) / 10;
      }
      showFinalReport(pipelineResults);
      showArticlePreview(pipelineResults);

      btn.disabled = false;
      btn.textContent = '🚀 Chạy Pipeline';
      return;
    }

    if (step === 'error') {
      eventSource.close();
      clearInterval(timerInterval);
      timer.textContent = `❌ Lỗi: ${data?.message || 'Unknown'}`;
      btn.disabled = false;
      btn.textContent = '🚀 Chạy Pipeline';
      return;
    }

    const stepEl = document.querySelector(`.step[data-step="${step}"]`);
    if (!stepEl) return;

    if (status === 'running') {
      stepEl.classList.add('running');
      stepEl.querySelector('.step-status').textContent = 'Đang chạy...';
      stepEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    if (status === 'done') {
      stepEl.classList.remove('running');
      stepEl.classList.add('done');
      stepEl.querySelector('.step-status').textContent = '✅ Xong';

      pipelineResults[step] = data;

      const body = stepEl.querySelector('.step-body');
      body.innerHTML = renderStepBody(step, data);
      body.classList.remove('hidden');

      stepEl.querySelector('.step-header').onclick = () => {
        body.classList.toggle('hidden');
      };
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
    clearInterval(timerInterval);
    btn.disabled = false;
    btn.textContent = '🚀 Chạy Pipeline';
  };
}

// ============================================
// RENDER STEP BODIES
// ============================================

function renderStepBody(stepKey, data) {
  if (!data) return '<p>Không có dữ liệu</p>';

  switch (stepKey) {
    case 'researcher':
      return `
        <div class="metric">Intent: <strong>${data.search_intent || '—'}</strong></div>
        <div class="metric">Loại: <strong>${data.recommended_content_type || '—'}</strong></div>
        <div class="metric">Độ dài đề xuất: <strong>${data.recommended_word_count || '—'} từ</strong></div>
        ${renderTags('Từ khóa phụ', data.secondary_keywords)}
        ${renderTags('LSI Keywords', data.lsi_keywords)}
        ${renderTags('People Also Ask', data.people_also_ask)}
        ${renderTags('Content gaps', data.content_gaps, '💡')}
        ${renderTags('Unique angles', data.unique_angles, '🎯')}
      `;

    case 'architect':
      return `
        <div class="metric">Title: <strong>${data.recommended_title || data.h1 || '—'}</strong></div>
        <div class="metric">Slug: <strong>/${data.slug || '—'}</strong></div>
        <div class="metric">Ước lượng: <strong>${data.estimated_total_words || '—'} từ</strong></div>
        ${data.sections ? `
          <p style="margin-top:8px">Cấu trúc bài:</p>
          ${data.sections.map((s, i) => `
            <div class="metric" style="display:flex;width:100%">
              <span>H2.${i + 1}: ${s.h2}</span>
              <span style="margin-left:auto;opacity:0.6">~${s.estimated_words || '?'} từ</span>
            </div>
          `).join('')}
        ` : ''}
        ${data.faq?.length ? `<p style="margin-top:8px">FAQ: ${data.faq.length} câu hỏi</p>` : ''}
      `;

    case 'writer':
      return `
        <div class="metric">Số từ: <strong>${data.word_count || '—'}</strong></div>
        <p style="margin-top:8px;opacity:0.7">Xem preview bài viết bên dưới ↓</p>
      `;

    case 'imageGen':
      return `
        <div class="metric">Ảnh tạo: <strong>${data.images?.length || 0}</strong></div>
        <div class="metric">Lỗi: <strong>${data.failed?.length || 0}</strong></div>
        ${data.notes ? `<p style="margin-top:4px;font-size:11px;opacity:0.6">${data.notes}</p>` : ''}
        ${(data.images || []).map(img => `
          <div style="margin-top:8px">
            <img src="${img.url}" alt="${img.alt_text}" style="max-width:100%;border-radius:8px;margin-bottom:4px">
            <div style="font-size:11px;opacity:0.6">${img.alt_text}</div>
          </div>
        `).join('')}
      `;

    case 'seo':
      return `
        <div class="metric">SEO Score: <strong style="color:${(data.seo_score || 0) >= 80 ? 'var(--success)' : 'var(--warning)'}">${data.seo_score || '—'}/100</strong></div>
        <div class="metric">Keyword density: <strong>${data.keyword_density || '—'}</strong></div>
        <div class="metric">Keyword trong 100 từ đầu: <strong>${data.keyword_in_first_100_words ? '✅' : '❌'}</strong></div>
        ${data.title_tag ? `<p style="margin-top:8px">Title tag:</p><pre>${data.title_tag}</pre>` : ''}
        ${data.meta_description ? `<p>Meta description:</p><pre>${data.meta_description}</pre>` : ''}
        ${data.issues_fixed?.length ? `
          <p style="margin-top:8px">Đã sửa:</p>
          ${data.issues_fixed.map(i => `<div class="metric">✅ ${i.issue} → ${i.action}</div>`).join('')}
        ` : ''}
      `;

    case 'editorQc':
      const s = data.score_breakdown || {};
      return `
        <div class="metric">Humanness Score: <strong style="color:${(data.humanness_score || 0) >= 76 ? 'var(--success)' : 'var(--warning)'}">${data.humanness_score || '—'}/100</strong></div>
        <div class="metric">Decision: <strong>${data.decision || '—'}</strong></div>
        <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
          <div class="metric">Ngôn ngữ: <strong>${s.language_natural || '?'}/25</strong></div>
          <div class="metric">Cấu trúc: <strong>${s.structure || '?'}/25</strong></div>
          <div class="metric">E-E-A-T: <strong>${s.eeat_signals || '?'}/25</strong></div>
          <div class="metric">Engagement: <strong>${s.engagement || '?'}/25</strong></div>
        </div>
        ${data.changes_made?.length ? `
          <p style="margin-top:8px">Thay đổi:</p>
          ${data.changes_made.map(c => `<div class="metric">✏️ ${c}</div>`).join('')}
        ` : ''}
      `;

    case 'publisher':
      return `
        <div class="metric">Status: <strong>${data.status === 'pending_approval' ? '⏳ Chờ xác nhận' : '✅ Đã publish'}</strong></div>
        <div class="metric">URL: <strong>${data.post_url || '—'}</strong></div>
      `;

    default:
      return `<pre>${JSON.stringify(data, null, 2)}</pre>`;
  }
}

function renderTags(label, items, prefix = '') {
  if (!items?.length) return '';
  return `
    <p style="margin-top:8px">${label}:</p>
    <div class="tags">${items.map(k => `<span class="tag">${prefix ? prefix + ' ' : ''}${k}</span>`).join('')}</div>
  `;
}

// ============================================
// FINAL REPORT
// ============================================

function showFinalReport(steps) {
  const report = steps.publisher?.report;
  if (!report) return;

  const el = document.getElementById('final-report');
  el.innerHTML = `
    <h3>📊 Báo Cáo Pipeline</h3>
    <div class="report-grid">
      <div class="report-item">
        <div class="label">Số từ</div>
        <div class="value">${(report.word_count || 0).toLocaleString()}</div>
      </div>
      <div class="report-item">
        <div class="label">SEO Score</div>
        <div class="value green">${report.seo_score || 0}/100</div>
      </div>
      <div class="report-item">
        <div class="label">Humanness</div>
        <div class="value green">${report.humanness_score || 0}/100</div>
      </div>
      <div class="report-item">
        <div class="label">Ảnh</div>
        <div class="value">${report.images_count || 0}</div>
      </div>
      <div class="report-item">
        <div class="label">Thời gian</div>
        <div class="value">${report.processing_time_minutes || 0} phút</div>
      </div>
    </div>
  `;
  el.classList.remove('hidden');
}

function showArticlePreview(steps) {
  // Ưu tiên bài đã humanize từ editor, fallback về writer
  const html = steps.editorQc?.final_html
    || steps.editorQc?.optimized_html
    || steps.seo?.optimized_html
    || steps.writer?.html_content
    || '';

  if (!html) return;

  const previewEl = document.getElementById('article-preview');
  document.getElementById('article-content').innerHTML = html;
  previewEl.classList.remove('hidden');
}
