/**
 * Logger utility
 * Ghi log ra console và file /logs/YYYY-MM-DD/pipeline.log
 */

import fs from 'fs';
import path from 'path';

function getLogDir() {
  const date = new Date().toISOString().split('T')[0];
  const dir = path.join(process.cwd(), 'logs', date);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeToFile(level, message) {
  const logDir = getLogDir();
  const logFile = path.join(logDir, 'pipeline.log');
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
  fs.appendFileSync(logFile, line);
}

const COLORS = {
  info:  '\x1b[36m',  // Cyan
  warn:  '\x1b[33m',  // Yellow
  error: '\x1b[31m',  // Red
  reset: '\x1b[0m'
};

export const logger = {
  info(message) {
    const log = `ℹ️  ${message}`;
    console.log(`${COLORS.info}${log}${COLORS.reset}`);
    writeToFile('info', message);
  },
  warn(message) {
    const log = `⚠️  ${message}`;
    console.warn(`${COLORS.warn}${log}${COLORS.reset}`);
    writeToFile('warn', message);
  },
  error(message) {
    const log = `❌ ${message}`;
    console.error(`${COLORS.error}${log}${COLORS.reset}`);
    writeToFile('error', message);
  }
};
