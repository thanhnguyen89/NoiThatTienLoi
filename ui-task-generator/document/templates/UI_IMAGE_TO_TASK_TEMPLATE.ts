/**
 * ============================================================
 * UI IMAGE → TASK TEMPLATE (AUTO OUTPUT)
 * ============================================================
 * Dùng để Claude convert ảnh UI thành file task .ts chuẩn
 */

export const UI_TASK_METADATA = {
  name: '',
  module: '',
  type: 'feature',
  source: 'ui-image',
};

export const UI_SUMMARY = `
Mô tả UI từ ảnh
`;

export const ASSUMPTIONS = [];

export const MODULE_ANALYSIS = {
  module: '',
  referenceModule: 'category | product',
  affectedLayers: ['ui', 'service', 'repository', 'api'],
};

export const TASK_GOAL = `
Mục tiêu từ UI
`;

export const REQUIREMENTS = [];

export const BUSINESS_RULES = [];

export const RELATED_FILES = {
  filesToRead: [],
  filesToModify: [],
};

export const EXPECTED_FLOW = `
User → UI → API → Service → Repository → DB → UI
`;

export const ACCEPTANCE_CRITERIA = [];

export const RISKS = [];

export const TASK_CONTROL = {
  riskLevel: 'low',
  rollbackPlan: '',
  regressionTargets: [],
  manualQaChecklist: [],
};

export const TEST_SUGGESTION = [];

/**
 * Prompt:
 * "Phân tích ảnh UI và output đúng format file này (.ts). Không giải thích."
 */
