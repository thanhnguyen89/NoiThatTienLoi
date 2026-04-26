// ============================================
// AUTH GUARD & HELPERS
// ============================================

let currentUser = null;
let authToken = null;

async function checkAuth() {
  authToken = localStorage.getItem('ca_token');
  if (!authToken) {
    window.location.href = '/login.html';
    return false;
  }

  try {
    const res = await authFetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!res.ok) {
      localStorage.removeItem('ca_token');
      localStorage.removeItem('ca_user');
      window.location.href = '/login.html';
      return false;
    }

    const data = await res.json();
    currentUser = data.data;
    updateUserInfo();
    return true;
  } catch (error) {
    console.error('Auth check failed:', error);
    window.location.href = '/login.html';
    return false;
  }
}

function updateUserInfo() {
  if (!currentUser) return;
  document.getElementById('user-name').textContent = currentUser.displayName || currentUser.username;
  document.getElementById('user-role').textContent = currentUser.role || '';
}

async function logout() {
  try {
    await authFetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
  } catch (e) {
    // Ignore
  }
  localStorage.removeItem('ca_token');
  localStorage.removeItem('ca_user');
  window.location.href = '/login.html';
}

function authFetch(url, options = {}) {
  if (!authToken) {
    window.location.href = '/login.html';
    return Promise.reject(new Error('No auth token'));
  }

  options.headers = options.headers || {};
  options.headers['Authorization'] = `Bearer ${authToken}`;

  return fetch(url, options).then(res => {
    if (res.status === 401) {
      localStorage.removeItem('ca_token');
      localStorage.removeItem('ca_user');
      window.location.href = '/login.html';
      throw new Error('Unauthorized');
    }
    return res;
  });
}

// ============================================
// Content Agent â€” Frontend (8-step pipeline SSE)
// ============================================

let brandData = {};
let pipelineResults = {};

document.addEventListener('DOMContentLoaded', async () => {
  // Check auth first
  const authed = await checkAuth();
  if (!authed) return;

  // Setup logout button
  document.getElementById('btn-logout')?.addEventListener('click', logout);

  await loadProducts();
  await loadBrandData();
  setupNavigation();
  setupBrandTabs();
  document.getElementById('keyword').addEventListener('keydown', e => {
    if (e.key === 'Enter') runPipeline();
  });
});

async function loadProducts() {
  const res = await authFetch('/api/products');
  const products = await res.json();
  const select = document.getElementById('product');
  products.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} â€” ${p.price}`;
    select.appendChild(opt);
  });
}

async function loadBrandData() {
  const res = await authFetch('/api/brand');
  brandData = await res.json();
  document.getElementById('brand-text').textContent = brandData.brandGuideline || 'ChÆ°a cÃ³ dá»¯ liá»‡u';
}

function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById(`view-${item.dataset.view}`).classList.add('active');
    });
  });
}

function setupBrandTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('brand-text').textContent = brandData[tab.dataset.tab] || 'ChÆ°a cÃ³ dá»¯ liá»‡u';
    });
  });
}

// ============================================
// PIPELINE
// ============================================

async function runPipeline() {
  const keyword = document.getElementById('keyword').value.trim();
  if (!keyword) return document.getElementById('keyword').focus();

  const product = document.getElementById('product').value;
  const contentType = document.getElementById('contentType').value;
  const btn = document.getElementById('btn-run');

  btn.disabled = true;
  btn.textContent = 'â³ Äang cháº¡y pipeline...';
  pipelineResults = {};

  // Reset
  document.getElementById('pipeline-steps').classList.remove('hidden');
  document.getElementById('final-report').classList.add('hidden');
  document.getElementById('article-preview').classList.add('hidden');
  document.querySelectorAll('.step').forEach(s => {
    s.classList.remove('done', 'running');
    s.querySelector('.step-status').textContent = 'Chá»';
    const body = s.querySelector('.step-body');
    body.classList.add('hidden');
    body.innerHTML = '';
  });

  // Timer
  const startTime = Date.now();
  let timerEl = document.getElementById('timer');
  if (timerEl) timerEl.remove();
  timerEl = document.createElement('div');
  timerEl.id = 'timer';
  timerEl.style.cssText = 'text-align:center;color:#7a6a5e;font-size:13px;margin-bottom:12px';
  document.getElementById('pipeline-steps').before(timerEl);
  const timerInterval = setInterval(() => {
    timerEl.textContent = `â±ï¸ ${Math.floor((Date.now() - startTime) / 1000)}s`;
  }, 1000);

  // SSE
  const params = new URLSearchParams({ keyword, product, contentType });
  const es = new EventSource(`/api/pipeline/stream?${params}`);

  es.onmessage = event => {
    const { step, status, data } = JSON.parse(event.data);

    if (step === 'complete') {
      es.close();
      clearInterval(timerInterval);
      const sec = Math.floor((Date.now() - startTime) / 1000);
      timerEl.textContent = `âœ… HoÃ n thÃ nh trong ${sec}s`;
      if (pipelineResults.publish?.report) {
        pipelineResults.publish.report.processing_time_seconds = sec;
      }
      showFinalReport(pipelineResults);
      showArticlePreview(pipelineResults);
      btn.disabled = false;
      btn.textContent = 'ðŸš€ Cháº¡y Pipeline';
      return;
    }

    if (step === 'error') {
      es.close();
      clearInterval(timerInterval);
      timerEl.textContent = `âŒ Lá»—i: ${data?.message}`;
      btn.disabled = false;
      btn.textContent = 'ðŸš€ Cháº¡y Pipeline';
      return;
    }

    const stepEl = document.querySelector(`.step[data-step="${step}"]`);
    if (!stepEl) return;

    if (status === 'running') {
      stepEl.classList.add('running');
      stepEl.querySelector('.step-status').textContent = 'Äang cháº¡y...';
      stepEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    if (status === 'done') {
      stepEl.classList.remove('running');
      stepEl.classList.add('done');
      stepEl.querySelector('.step-status').textContent = 'âœ… Xong';
      pipelineResults[step] = data;

      const body = stepEl.querySelector('.step-body');
      body.innerHTML = renderStep(step, data);
      body.classList.remove('hidden');
      stepEl.querySelector('.step-header').onclick = () => body.classList.toggle('hidden');
    }
  };

  es.onerror = () => {
    es.close();
    clearInterval(timerInterval);
    btn.disabled = false;
    btn.textContent = 'ðŸš€ Cháº¡y Pipeline';
  };
}

// ============================================
// RENDER
// ============================================

function renderStep(step, d) {
  if (!d) return '<p>KhÃ´ng cÃ³ dá»¯ liá»‡u</p>';
  const src = d._source === 'gemini' ? '<span style="font-size:10px;background:#e8f5e9;padding:2px 6px;border-radius:4px;margin-left:8px">ðŸ¤– Gemini</span>' : '<span style="font-size:10px;background:#fff3e0;padding:2px 6px;border-radius:4px;margin-left:8px">ðŸ“¦ Mock</span>';

  switch (step) {
    case 'research': return `
      ${src}
      <div class="metric">Intent: <strong>${d.search_intent || 'â€”'}</strong></div>
      <div class="metric">Äá»‘i tÆ°á»£ng: <strong>${d.target_audience || 'â€”'}</strong></div>
      <div class="metric">Äá»™ dÃ i Ä‘á» xuáº¥t: <strong>${d.recommended_word_count || 'â€”'} tá»«</strong></div>
      ${tags('Keyword phá»¥', d.secondary_keywords)}
      ${tags('CÃ¢u há»i cáº§n tráº£ lá»i', d.questions_to_answer, 'â“')}
      ${tags('Key points', d.key_points, 'ðŸ“Œ')}
      ${tags('Content gaps', d.content_gaps, 'ðŸ’¡')}`;

    case 'outline': return `
      ${src}
      <div class="metric">Title: <strong>${d.title || 'â€”'}</strong></div>
      <div class="metric">Slug: <strong>/${d.slug || 'â€”'}</strong></div>
      <div class="metric">Æ¯á»›c lÆ°á»£ng: <strong>${d.estimated_total_words || 'â€”'} tá»«</strong></div>
      <p style="margin-top:6px;font-size:12px;opacity:0.7">Meta: ${d.meta_description || ''}</p>
      ${d.sections ? `<p style="margin-top:8px">Cáº¥u trÃºc:</p>
        ${d.sections.map((s, i) => `
          <div class="metric" style="display:flex;width:100%">
            <span>H2.${i + 1}: ${s.h2}${s.h3s?.length ? ` <span style="opacity:0.5">(${s.h3s.length} H3)</span>` : ''}</span>
            <span style="margin-left:auto;opacity:0.6">~${s.estimated_words} tá»«</span>
          </div>`).join('')}` : ''}
      ${tags('SEO keywords', d.seo_keywords)}`;

    case 'content': return `
      ${src}
      <div class="metric">Sá»‘ tá»«: <strong>${d.word_count || 'â€”'}</strong></div>
      ${tags('Keywords Ä‘Ã£ dÃ¹ng', d.seo_keywords_used)}
      <p style="margin-top:8px;opacity:0.7">Xem preview bÃ i viáº¿t bÃªn dÆ°á»›i â†“</p>`;

    case 'seo': return `
      ${src}
      <div class="metric">SEO Score: <strong style="color:${(d.seo_score||0) >= 80 ? 'var(--success)' : 'var(--warning)'}">${d.seo_score || 'â€”'}/100</strong></div>
      <div class="metric">Keyword density: <strong>${d.keyword_density || 'â€”'}</strong></div>
      <div class="metric">Keyword trong 100 tá»« Ä‘áº§u: <strong>${d.keyword_in_first_100_words ? 'âœ…' : 'âŒ'}</strong></div>
      ${d.title_tag ? `<p style="margin-top:8px">Title tag:</p><pre>${d.title_tag}</pre>` : ''}
      ${d.meta_description ? `<p>Meta description:</p><pre>${d.meta_description}</pre>` : ''}
      ${d.issues_fixed?.length ? `<p style="margin-top:8px">ÄÃ£ sá»­a:</p>${d.issues_fixed.map(i => `<div class="metric">âœ… ${i.issue} â†’ ${i.action}</div>`).join('')}` : ''}
      ${d.issues_remaining?.length ? `<p style="margin-top:8px">CÃ²n láº¡i:</p>${d.issues_remaining.map(i => `<div class="metric">âš ï¸ [${i.level}] ${i.issue}</div>`).join('')}` : ''}`;

    case 'qc':
      const sb = d.score_breakdown || {};
      const decColor = d.decision === 'PUBLISH' ? 'var(--success)' : d.decision === 'REVIEW' ? 'var(--warning)' : 'var(--error)';
      return `
      ${src}
      <div class="metric">Humanness Score: <strong style="color:${(d.humanness_score||0) >= 76 ? 'var(--success)' : 'var(--warning)'}">${d.humanness_score || 'â€”'}/100</strong></div>
      <div class="metric">Decision: <strong style="color:${decColor}">${d.decision || 'â€”'}</strong></div>
      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
        <div class="metric">NgÃ´n ngá»¯: <strong>${sb.language_natural||'?'}/25</strong></div>
        <div class="metric">Cáº¥u trÃºc: <strong>${sb.structure||'?'}/25</strong></div>
        <div class="metric">E-E-A-T: <strong>${sb.eeat_signals||'?'}/25</strong></div>
        <div class="metric">Engagement: <strong>${sb.engagement||'?'}/25</strong></div>
      </div>
      ${d.banned_words_found?.length ? `${tags('Tá»« cáº¥m tÃ¬m tháº¥y', d.banned_words_found, 'ðŸš«')}` : ''}
      ${d.changes_made?.length ? `<p style="margin-top:8px">Thay Ä‘á»•i:</p>${d.changes_made.map(c => `<div class="metric">âœï¸ ${c}</div>`).join('')}` : ''}`;

    case 'thumbnail': return `
      ${src}
      ${d.image ? `<div style="margin-top:8px">
        <img src="${d.image.url}" alt="${d.image.alt_text}" style="max-width:100%;border-radius:8px">
        <div style="font-size:11px;opacity:0.6;margin-top:4px">${d.image.width}x${d.image.height} â€” ${d.image.alt_text}</div>
      </div>` : ''}
      ${d.notes ? `<p style="font-size:11px;opacity:0.5;margin-top:4px">${d.notes}</p>` : ''}`;

    case 'sectionImages': return `
      ${src}
      <div class="metric">áº¢nh táº¡o: <strong>${d.images?.length || 0}</strong></div>
      ${(d.images||[]).map(img => `<div style="margin-top:8px">
        <img src="${img.url}" alt="${img.alt_text}" style="max-width:100%;border-radius:8px">
        <div style="font-size:11px;opacity:0.6;margin-top:2px">${img.section_h2} â€” ${img.style || ''}</div>
      </div>`).join('')}
      ${d.notes ? `<p style="font-size:11px;opacity:0.5;margin-top:4px">${d.notes}</p>` : ''}`;

    case 'publish':
      const r = d.report || {};
      return `
      <div class="metric">Status: <strong>${d.status === 'pending_approval' ? 'â³ Chá» xÃ¡c nháº­n' : 'âœ… ÄÃ£ publish'}</strong></div>
      <div class="metric">URL: <strong>${d.post_url || 'â€”'}</strong></div>
      <div class="metric">Decision: <strong style="color:${r.decision === 'PUBLISH' ? 'var(--success)' : 'var(--warning)'}">${r.decision || 'â€”'}</strong></div>`;

    default: return `<pre>${JSON.stringify(d, null, 2)}</pre>`;
  }
}

function tags(label, items, prefix = '') {
  if (!items?.length) return '';
  return `<p style="margin-top:8px">${label}:</p>
    <div class="tags">${items.map(k => `<span class="tag">${prefix ? prefix + ' ' : ''}${k}</span>`).join('')}</div>`;
}

// ============================================
// REPORT + PREVIEW
// ============================================

function showFinalReport(steps) {
  const r = steps.publish?.report;
  if (!r) return;
  const el = document.getElementById('final-report');
  el.innerHTML = `
    <h3>ðŸ“Š BÃ¡o CÃ¡o Pipeline</h3>
    <div class="report-grid">
      <div class="report-item"><div class="label">Sá»‘ tá»«</div><div class="value">${(r.word_count||0).toLocaleString()}</div></div>
      <div class="report-item"><div class="label">SEO Score</div><div class="value green">${r.seo_score||0}/100</div></div>
      <div class="report-item"><div class="label">Humanness</div><div class="value ${(r.humanness_score||0)>=76?'green':''}">${r.humanness_score||0}/100</div></div>
      <div class="report-item"><div class="label">Decision</div><div class="value ${r.decision==='PUBLISH'?'green':''}">${r.decision||'â€”'}</div></div>
      <div class="report-item"><div class="label">áº¢nh</div><div class="value">${r.images_count||0}</div></div>
      <div class="report-item"><div class="label">Thá»i gian</div><div class="value">${r.processing_time_seconds||0}s</div></div>
    </div>`;
  el.classList.remove('hidden');
}

function showArticlePreview(steps) {
  const html = steps.qc?.final_html || steps.seo?.optimized_html || steps.content?.html_content || '';
  if (!html) return;
  document.getElementById('article-content').innerHTML = html;
  document.getElementById('article-preview').classList.remove('hidden');
}

