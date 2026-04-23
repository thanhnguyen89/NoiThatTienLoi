/**
 * Content Marketing Agent — Entry Point
 * Nhận từ khóa từ CLI → chạy pipeline
 *
 * Usage:
 *   node src/index.js "cà phê giảm cân"
 *   node src/index.js "cà phê giảm cân" --category=suc-khoe
 *   node src/index.js --bulk keywords.csv
 */

import { runPipeline } from './orchestrator/pipeline.js';
import { logger } from './utils/logger.js';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 Content Marketing Agent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Usage:
  npm run pipeline "từ khóa của bạn"
  npm run pipeline "cà phê giảm cân" --category=suc-khoe

Hoặc dùng trực tiếp trong Claude Code:
  /run cà phê giảm cân
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
  process.exit(0);
}

// Parse arguments
const keyword = args[0];
const category = args.find(a => a.startsWith('--category='))?.split('=')[1];
const schedule = args.find(a => a.startsWith('--schedule='))?.split('=')[1];
const dryRun = args.includes('--dry-run');

if (dryRun) {
  logger.warn('🔍 DRY RUN mode — sẽ không publish thật');
}

// Chạy pipeline
runPipeline({ keyword, category, schedule, dryRun })
  .then(result => {
    logger.info(`✅ Hoàn thành: ${result.steps?.publisher?.post_url || 'Dry run'}`);
    process.exit(0);
  })
  .catch(error => {
    logger.error(`Pipeline thất bại: ${error.message}`);
    process.exit(1);
  });
