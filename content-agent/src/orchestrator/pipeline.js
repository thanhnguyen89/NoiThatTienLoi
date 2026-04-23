/**
 * Pipeline Orchestrator
 * Điều phối toàn bộ 7 agent theo thứ tự
 * Xử lý retry, state management, error handling
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';
import { saveState, loadState } from '../utils/state.js';
import { readAgentPrompt } from '../utils/prompts.js';

const client = new Anthropic();

// ============================================
// PIPELINE ENTRY POINT
// ============================================

export async function runPipeline(input) {
  const { keyword, category = 'Uncategorized', schedule = null } = input;
  const slug = keyword.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const runId = `${slug}-${Date.now()}`;

  logger.info(`🚀 Pipeline bắt đầu: "${keyword}" [${runId}]`);

  const state = {
    runId,
    keyword,
    category,
    schedule,
    startedAt: new Date().toISOString(),
    steps: {}
  };

  try {
    // STEP 1 — RESEARCHER
    state.steps.researcher = await runAgent('researcher', {
      keyword,
      language: 'vi',
      market: 'VN'
    }, runId);

    // STEP 2 — ARCHITECT
    state.steps.architect = await runAgent('architect',
      state.steps.researcher,
      runId
    );

    // Checkpoint: Hiển thị outline, hỏi xác nhận
    await checkpoint('outline', state.steps.architect, runId);

    // STEP 3a & 3b — WRITER + IMAGE-GEN (có thể song song)
    const [writerOutput, imageOutput] = await Promise.all([
      runAgent('writer', {
        outline: state.steps.architect,
        research: state.steps.researcher
      }, runId),
      runAgent('image-gen', {
        image_prompts: state.steps.architect.image_prompts,
        style_guidelines: {
          style: 'photorealistic',
          color_palette: 'warm',
          avoid: ['text overlay', 'watermark']
        }
      }, runId)
    ]);

    state.steps.writer = writerOutput;
    state.steps.imageGen = imageOutput;

    // STEP 4 — Merge ảnh vào bài
    state.steps.merged = mergeImages(
      state.steps.writer.html_content,
      state.steps.imageGen.images
    );

    // STEP 5 — SEO SPECIALIST
    state.steps.seo = await runAgent('seo-specialist', {
      html_content: state.steps.merged,
      keyword_data: {
        primary_keyword: keyword,
        secondary_keywords: state.steps.researcher.secondary_keywords,
        lsi_keywords: state.steps.researcher.lsi_keywords
      },
      architect_output: state.steps.architect
    }, runId);

    // STEP 6 — EDITOR / QC
    state.steps.editor = await runAgent('editor-qc',
      state.steps.seo,
      runId
    );

    // Kiểm tra decision
    const decision = state.steps.editor.decision;
    const score = state.steps.editor.humanness_score;

    logger.info(`📊 Humanness Score: ${score}/100 → ${decision}`);

    if (decision === 'REWRITE') {
      logger.warn('🔄 Score thấp — gửi về Writer để viết lại');
      // TODO: implement rewrite loop (tối đa 2 lần)
      throw new Error(`Humanness Score quá thấp (${score}/100). Cần viết lại.`);
    }

    if (decision === 'REVIEW') {
      logger.warn(`⚠️ Score ${score}/100 — cần người quản lý xem lại`);
      await checkpoint('review', state.steps.editor, runId);
    }

    // STEP 7 — PUBLISHER (sau khi xác nhận)
    state.steps.publisher = await runAgent('publisher',
      state.steps.editor,
      runId
    );

    state.completedAt = new Date().toISOString();
    state.status = 'success';

    await saveState(runId, state);
    logger.info(`✅ Pipeline hoàn thành: ${state.steps.publisher.post_url}`);

    return state;

  } catch (error) {
    state.status = 'failed';
    state.error = error.message;
    await saveState(runId, state);
    logger.error(`❌ Pipeline thất bại: ${error.message}`);
    throw error;
  }
}

// ============================================
// AGENT RUNNER — Gọi từng agent qua Claude API
// ============================================

async function runAgent(agentName, input, runId, retries = 3) {
  logger.info(`⏳ [${agentName}] Đang chạy...`);

  const systemPrompt = await readAgentPrompt(agentName);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
        max_tokens: 8192,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Input data:\n\`\`\`json\n${JSON.stringify(input, null, 2)}\n\`\`\`\n\nThực hiện nhiệm vụ và trả về JSON.`
          }
        ]
      });

      const rawText = response.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('');

      // Parse JSON từ response
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Không tìm thấy JSON trong response');

      const output = JSON.parse(jsonMatch[0]);

      if (output.status !== 'success') {
        throw new Error(`Agent ${agentName} báo lỗi: ${output.notes}`);
      }

      logger.info(`✅ [${agentName}] Hoàn thành`);
      return output;

    } catch (error) {
      logger.warn(`⚠️ [${agentName}] Attempt ${attempt}/${retries} thất bại: ${error.message}`);
      if (attempt === retries) throw error;
      await sleep(2000 * attempt); // Exponential backoff
    }
  }
}

// ============================================
// CHECKPOINT — Dừng chờ xác nhận người dùng
// ============================================

async function checkpoint(type, data, runId) {
  // Trong Claude Code, checkpoint được xử lý tự động
  // bằng cách Claude dừng lại và hiển thị cho người dùng
  logger.info(`🛑 CHECKPOINT [${type}] — Chờ xác nhận người quản lý`);

  if (type === 'outline') {
    console.log('\n' + '━'.repeat(50));
    console.log('📐 OUTLINE ĐÃ TẠO — Xem lại trước khi viết bài');
    console.log('━'.repeat(50));
    console.log(`Title: ${data.recommended_title}`);
    console.log(`Sections: ${data.sections?.length} phần`);
    console.log(`Ước lượng: ${data.estimated_total_words} từ`);
    console.log('━'.repeat(50));
    console.log('Tiếp tục pipeline? (Trả lời trong Claude Code)\n');
  }

  if (type === 'review') {
    console.log('\n' + '━'.repeat(50));
    console.log(`⚠️ HUMANNESS SCORE: ${data.humanness_score}/100`);
    console.log('Bài đạt ngưỡng tối thiểu nhưng cần xem lại.');
    console.log('━'.repeat(50));
    console.log('Publish hay chỉnh sửa thêm?\n');
  }
}

// ============================================
// HELPERS
// ============================================

function mergeImages(htmlContent, images) {
  let merged = htmlContent;
  for (const img of images) {
    const placeholder = `[IMAGE: ${img.position}]`;
    const imgTag = `<img src="${img.url}" alt="${img.alt_text}" width="${img.width}" height="${img.height}" loading="lazy">`;
    merged = merged.replace(placeholder, imgTag);
  }
  return merged;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
