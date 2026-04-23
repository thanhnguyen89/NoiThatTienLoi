/**
 * Artifact Builders — 1 JSON → 5 file theo vai trò
 * Dùng string concat thay vì nested template literals để tránh syntax error
 */

var FILE_DEFS = [
  { key: 'db',        filename: 'db_task.ts',              label: '🗄️ DB Architect',       role: 'Database Architect' },
  { key: 'backend',   filename: 'backend_task.ts',         label: '⚙️ Backend Dev',        role: 'Backend Developer' },
  { key: 'senior_be', filename: 'backend_senior_task.ts',  label: '🔥 Senior Backend',     role: 'Senior Backend Dev' },
  { key: 'frontend',  filename: 'frontend_task.ts',        label: '🖥️ Frontend Dev',       role: 'Frontend Developer' },
  { key: 'senior_fe', filename: 'frontend_senior_task.ts', label: '💎 Senior Frontend',    role: 'Senior Frontend Dev' },
  { key: 'qa',        filename: 'qa_task.ts',              label: '✅ QA Engineer',         role: 'QA Engineer' },
  { key: 'lead',      filename: 'lead_task.ts',            label: '📋 Tech Lead / PM',     role: 'Tech Lead / PM' },
];

function _arr(a) { return JSON.stringify(a || [], null, 2); }
function _str(s) { return JSON.stringify(s || ''); }
function _lines(arr, prefix) {
  return (arr || []).map(function(item) {
    if (typeof item === 'string') return prefix + item;
    return prefix + JSON.stringify(item);
  }).join('\n');
}

function buildAllArtifacts(j) {
  return {
    db:        buildDbTask(j),
    backend:   buildBackendTask(j),
    senior_be: buildSeniorBackendTask(j),
    frontend:  buildFrontendTask(j),
    senior_fe: buildSeniorFrontendTask(j),
    qa:        buildQaTask(j),
    lead:      buildLeadTask(j),
  };
}

// ═══════════════════════════════════════
// 1. db_task.ts
// ═══════════════════════════════════════
function buildDbTask(j) {
  var db = j.db || {};
  var m = j.meta || {};
  var a = j.analysis || {};

  var fieldLines = (db.fields || []).map(function(f) {
    return '- ' + f.field + ': ' + f.type + (f.nullable ? '?' : '') + ' — ' + f.reason;
  }).join('\n');

  var L = [];
  L.push('/**');
  L.push(' * DB Task: ' + (m.name || ''));
  L.push(' * Module: ' + (m.module || '') + ' | Role: Database Architect');
  L.push(' */');
  L.push('');
  L.push('export const DB_FIELDS = ' + _arr(db.fields) + ';');
  L.push('');
  L.push('export const DB_RELATIONS = ' + _arr(db.relations) + ';');
  L.push('');
  L.push('export const DB_INDEXES = ' + _arr(db.indexes) + ';');
  L.push('');
  L.push('export const DB_EDGE_CASES = ' + _arr(db.edgeCases) + ';');
  L.push('');
  L.push('export const DB_PROMPT = `');
  L.push('Bạn là senior database architect.');
  L.push('Tech: PostgreSQL + Prisma ORM.');
  L.push('');
  L.push('Màn hình: ' + (a.screenTitle || ''));
  L.push('Module: ' + (m.module || ''));
  L.push('');
  L.push('Fields:');
  L.push(fieldLines);
  L.push('');
  L.push('Relations:');
  L.push(_lines(db.relations, '- '));
  L.push('');
  L.push('Indexes:');
  L.push(_lines(db.indexes, '- '));
  L.push('');
  L.push('Edge cases:');
  L.push(_lines(db.edgeCases, '- '));
  L.push('`;');
  return L.join('\n');
}

// ═══════════════════════════════════════
// 2. backend_task.ts
// ═══════════════════════════════════════
function buildBackendTask(j) {
  var be = j.backend || {};
  var m = j.meta || {};
  var del = j.delivery || {};
  var a = j.analysis || {};

  var epLines = (be.endpoints || []).map(function(e) {
    return e.method + ' ' + e.path + ' — ' + e.description;
  }).join('\n');
  var errLines = (be.errorCases || []).map(function(e) {
    return '- ' + e.case + ' → ' + e.error + ': ' + e.message;
  }).join('\n');

  var L = [];
  L.push('/**');
  L.push(' * Backend Task: ' + (m.name || ''));
  L.push(' * Module: ' + (m.module || '') + ' | Role: Backend Developer');
  L.push(' */');
  L.push('');
  L.push('export const API_ENDPOINTS = ' + _arr(be.endpoints) + ';');
  L.push('');
  L.push('export const VALIDATOR_RULES = ' + _arr(be.validatorRules) + ';');
  L.push('');
  L.push('export const REPOSITORY_METHODS = ' + _arr(be.repositoryMethods) + ';');
  L.push('');
  L.push('export const SERVICE_LOGIC = ' + _arr(be.serviceLogic) + ';');
  L.push('');
  L.push('export const BUSINESS_RULES = ' + _arr(be.businessRules) + ';');
  L.push('');
  L.push('export const ERROR_CASES = ' + _arr(be.errorCases) + ';');
  L.push('');
  L.push('export const FILES_TO_MODIFY = ' + _arr((del.relatedFiles || {}).filesToModify) + ';');
  L.push('');
  L.push('export const BACKEND_PROMPT = `');
  L.push('Bạn là senior backend developer.');
  L.push('Tech: Next.js 15 + TypeScript + Prisma + Zod.');
  L.push('Module: ' + (m.module || '') + ' | Màn hình: ' + (a.screenTitle || ''));
  L.push('');
  L.push('API Endpoints:');
  L.push(epLines);
  L.push('');
  L.push('Validator (Zod):');
  L.push(_lines(be.validatorRules, '- '));
  L.push('');
  L.push('Repository:');
  L.push(_lines(be.repositoryMethods, '- '));
  L.push('');
  L.push('Service logic:');
  L.push(_lines(be.serviceLogic, '- '));
  L.push('');
  L.push('Business rules:');
  L.push(_lines(be.businessRules, '- '));
  L.push('');
  L.push('Error cases:');
  L.push(errLines);
  L.push('`;');
  return L.join('\n');
}

// ═══════════════════════════════════════
// 3. frontend_task.ts
// ═══════════════════════════════════════
function buildFrontendTask(j) {
  var fe = j.frontend || {};
  var m = j.meta || {};
  var a = j.analysis || {};
  var ux = fe.ux || {};

  var colLines = (fe.tableColumns || []).map(function(c) {
    return '- ' + c.header + ' (' + c.field + ') — ' + c.render + (c.notes ? ' — ' + c.notes : '');
  }).join('\n');
  var filterLines = (fe.filterFields || []).map(function(f) {
    return '- ' + f.label + ' (' + f.inputType + ') → ' + f.paramName;
  }).join('\n');
  var actionLines = (fe.actionButtons || []).map(function(b) {
    return '- ' + (b.icon || '') + ' ' + b.label + ' [' + b.color + '] → ' + b.action;
  }).join('\n');
  var compLines = (fe.components || []).map(function(c) {
    return '- ' + c.name + ' (' + c.type + ') — ' + c.file;
  }).join('\n');

  var L = [];
  L.push('/**');
  L.push(' * Frontend Task: ' + (m.name || ''));
  L.push(' * Module: ' + (m.module || '') + ' | Role: Frontend Developer');
  L.push(' */');
  L.push('');
  L.push('export const LAYOUT = ' + _str(fe.layoutDescription) + ';');
  L.push('');
  L.push('export const TABLE_COLUMNS = ' + _arr(fe.tableColumns) + ';');
  L.push('');
  L.push('export const FILTER_FIELDS = ' + _arr(fe.filterFields) + ';');
  L.push('');
  L.push('export const ACTION_BUTTONS = ' + _arr(fe.actionButtons) + ';');
  L.push('');
  L.push('export const UI_COMPONENTS = ' + _arr(fe.components) + ';');
  L.push('');
  L.push('export const STATE_MANAGEMENT = ' + _arr(fe.stateManagement) + ';');
  L.push('');
  L.push('export const UX_REQUIREMENTS = ' + JSON.stringify(ux, null, 2) + ';');
  L.push('');
  L.push('export const FRONTEND_PROMPT = `');
  L.push('Bạn là senior frontend developer.');
  L.push('Tech: Next.js 15 + React 19 + TypeScript + Bootstrap 5.');
  L.push('Module: ' + (m.module || '') + ' | Route: ' + (a.screens || []).join(', '));
  L.push('');
  L.push('Layout: ' + (fe.layoutDescription || ''));
  L.push('');
  L.push('Table columns:');
  L.push(colLines);
  L.push('');
  L.push('Filters:');
  L.push(filterLines);
  L.push('');
  L.push('Actions:');
  L.push(actionLines);
  L.push('');
  L.push('Components:');
  L.push(compLines);
  L.push('');
  L.push('UX: Loading=' + (ux.loadingState||'-') + ' | Empty=' + (ux.emptyState||'-') + ' | Error=' + (ux.errorState||'-'));
  L.push('`;');
  return L.join('\n');
}

// ═══════════════════════════════════════
// 4. qa_task.ts
// ═══════════════════════════════════════
function buildQaTask(j) {
  var qa = j.qa || {};
  var m = j.meta || {};
  var del = j.delivery || {};
  var a = j.analysis || {};

  var happyLines = (qa.happyPaths || []).map(function(h) {
    var steps = (h.steps || []).map(function(s, i) { return '  ' + (i+1) + '. ' + s; }).join('\n');
    return '── ' + h.usecase + ' ──\n' + steps + '\n  Expected: ' + h.expected;
  }).join('\n\n');

  var checklistItems = [];
  (qa.happyPaths || []).forEach(function(h) {
    checklistItems.push('  // ── ' + h.usecase + ' ──');
    (h.steps || []).forEach(function(s) { checklistItems.push("  '□ " + s + "',"); });
    checklistItems.push("  '□ Verify: " + h.expected + "',");
  });

  var L = [];
  L.push('/**');
  L.push(' * QA Task: ' + (m.name || ''));
  L.push(' * Module: ' + (m.module || '') + ' | Role: QA Engineer');
  L.push(' */');
  L.push('');
  L.push('export const QA_TARGET = {');
  L.push('  screen: ' + _str(a.screenTitle) + ',');
  L.push('  module: ' + _str(m.module) + ',');
  L.push('  priority: ' + _str(m.priority) + ',');
  L.push('};');
  L.push('');
  L.push('export const HAPPY_PATHS = ' + _arr(qa.happyPaths) + ';');
  L.push('');
  L.push('export const EDGE_CASES = ' + _arr(qa.edgeCases) + ';');
  L.push('');
  L.push('export const VALIDATION_CASES = ' + _arr(qa.validationCases) + ';');
  L.push('');
  L.push('export const REGRESSION_TARGETS = ' + _arr(qa.regressionTargets) + ';');
  L.push('');
  L.push('export const MANUAL_CHECKLIST = [');
  L.push(checklistItems.join('\n'));
  L.push('];');
  L.push('');
  L.push('export const RISKS = ' + _arr(del.risks) + ';');
  L.push('');
  L.push('export const QA_PROMPT = `');
  L.push('Bạn là senior QA engineer.');
  L.push('Màn hình: ' + (a.screenTitle || '') + ' | Module: ' + (m.module || ''));
  L.push('');
  L.push('Happy paths:');
  L.push(happyLines);
  L.push('');
  L.push('Edge cases:');
  L.push((qa.edgeCases || []).map(function(e) { return '- ' + e.input + ' → ' + e.expected; }).join('\n'));
  L.push('');
  L.push('Validation:');
  L.push((qa.validationCases || []).map(function(v) { return '- ' + v.field + ': ' + v.scenario + ' → ' + v.expected; }).join('\n'));
  L.push('`;');
  return L.join('\n');
}

// ═══════════════════════════════════════
// 5. lead_task.ts
// ═══════════════════════════════════════
function buildLeadTask(j) {
  var m = j.meta || {};
  var del = j.delivery || {};
  var a = j.analysis || {};
  var est = del.estimatedEffort || {};

  var L = [];
  L.push('/**');
  L.push(' * Lead Task: ' + (m.name || ''));
  L.push(' * Module: ' + (m.module || '') + ' | Role: Tech Lead / PM');
  L.push(' */');
  L.push('');
  L.push('export const TASK_META = {');
  L.push('  name: ' + _str(m.name) + ',');
  L.push('  module: ' + _str(m.module) + ',');
  L.push('  type: ' + _str(m.type) + ',');
  L.push('  priority: ' + _str(m.priority) + ',');
  L.push('  screenTitle: ' + _str(a.screenTitle) + ',');
  L.push('};');
  L.push('');
  L.push('export const UI_SUMMARY = ' + _str(a.uiSummary) + ';');
  L.push('');
  L.push('export const ASSUMPTIONS = ' + _arr(a.assumptions) + ';');
  L.push('');
  L.push('export const OBSERVED_ISSUES = ' + _arr(a.observedIssues) + ';');
  L.push('');
  L.push('export const AFFECTED_LAYERS = ' + _arr(del.affectedLayers) + ';');
  L.push('');
  L.push('export const RELATED_FILES = ' + JSON.stringify(del.relatedFiles || {}, null, 2) + ';');
  L.push('');
  L.push('export const IMPLEMENTATION_ORDER = ' + _arr(del.implementationOrder) + ';');
  L.push('');
  L.push('export const RISKS = ' + _arr(del.risks) + ';');
  L.push('');
  L.push('export const ROLLBACK_PLAN = ' + _str(del.rollbackPlan) + ';');
  L.push('');
  L.push('export const ESTIMATED_EFFORT = {');
  L.push('  database: ' + _str(est.database) + ',');
  L.push('  backend: ' + _str(est.backend) + ',');
  L.push('  frontend: ' + _str(est.frontend) + ',');
  L.push('  qa: ' + _str(est.qa) + ',');
  L.push('};');
  L.push('');
  L.push('export const ACCEPTANCE_CRITERIA = ' + _arr(a.expectedBehavior) + ';');
  return L.join('\n');
}

// ═══════════════════════════════════════
// 6. backend_senior_task.ts — Senior Backend Dev (10 năm KN)
// ═══════════════════════════════════════
function buildSeniorBackendTask(j) {
  var m = j.meta || {};
  var a = j.analysis || {};
  var db = j.db || {};
  var be = j.backend || {};
  var fe = j.frontend || {};
  var del = j.delivery || {};
  var est = del.estimatedEffort || {};
  var rf = del.relatedFiles || {};

  var L = [];
  L.push('/**');
  L.push(' * Senior Backend Task: ' + (m.name || ''));
  L.push(' * Module: ' + (m.module || '') + ' | Role: Senior Backend Developer (10 năm KN)');
  L.push(' * Screen: ' + (a.screenTitle || ''));
  L.push(' */');
  L.push('');

  // === KỸ THUẬT HIỆN TẠI ===
  L.push('// ════════════════════════════════════════');
  L.push('// KỸ THUẬT HIỆN TẠI');
  L.push('// ════════════════════════════════════════');
  L.push('');
  L.push('export const TECH_STACK = {');
  L.push("  framework: 'Next.js 15.x, App Router, React 19',");
  L.push("  orm: 'Prisma 5.x — schema tại prisma/schema.prisma',");
  L.push("  validation: 'Zod 3.x — infer type từ schema',");
  L.push("  ui: 'Bootstrap 5.3 + Bootstrap Icons 1.11',");
  L.push("  auth: 'JWT httpOnly cookie, middleware.ts guard route',");
  L.push('};');
  L.push('');
  L.push('export const PATTERNS = [');
  L.push("  '3-layer: repository → service → route (route KHÔNG có logic)',");
  L.push("  'Server component load data → props → client component',");
  L.push("  'Client component: use client + dynamic import ssr:false',");
  L.push("  'Submit: fetch API → router.push() + router.refresh()',");
  L.push("  'Error: parseAppError(err) trong route, AppError subclass trong service',");
  L.push('];');
  L.push('');

  // === MODULE LIÊN QUAN ===
  L.push('// ════════════════════════════════════════');
  L.push('// MODULE LIÊN QUAN');
  L.push('// ════════════════════════════════════════');
  L.push('');
  L.push('export const DB_SCHEMA = {');
  L.push('  fields: ' + _arr(db.fields) + ',');
  L.push('  relations: ' + _arr(db.relations) + ',');
  L.push('  indexes: ' + _arr(db.indexes) + ',');
  L.push('};');
  L.push('');
  L.push('export const EXISTING_FILES = {');
  L.push('  filesToRead: ' + _arr(rf.filesToRead) + ',');
  L.push('  filesToModify: ' + _arr(rf.filesToModify) + ',');
  L.push('  referenceModule: ' + _str(rf.referenceModule) + ',');
  L.push('};');
  L.push('');

  // === VẤN ĐỀ KỸ THUẬT ===
  L.push('// ════════════════════════════════════════');
  L.push('// VẤN ĐỀ KỸ THUẬT CỤ THỂ');
  L.push('// ════════════════════════════════════════');
  L.push('');
  L.push('export const OBSERVED_ISSUES = ' + _arr(a.observedIssues) + ';');
  L.push('');
  L.push('export const ERROR_CASES = ' + _arr(be.errorCases) + ';');
  L.push('');
  L.push('export const DB_EDGE_CASES = ' + _arr(db.edgeCases) + ';');
  L.push('');

  // === THAY ĐỔI KỸ THUẬT CẦN LÀM ===
  L.push('// ════════════════════════════════════════');
  L.push('// THAY ĐỔI KỸ THUẬT CẦN LÀM');
  L.push('// ════════════════════════════════════════');
  L.push('');
  L.push('export const AFFECTED_LAYERS = ' + _arr(del.affectedLayers) + ';');
  L.push('');

  // Layer changes
  L.push('export const LAYER_CHANGES = {');
  L.push('  schema: ' + _arr(db.fields) + ',');
  L.push('  validator: ' + _arr(be.validatorRules) + ',');
  L.push('  repository: ' + _arr(be.repositoryMethods) + ',');
  L.push('  service: ' + _arr(be.serviceLogic) + ',');
  L.push('  endpoints: ' + _arr(be.endpoints) + ',');

  // UI changes from frontend section
  var uiChanges = [];
  (fe.tableColumns || []).forEach(function(c) { uiChanges.push('Table: ' + c.header + ' (' + c.field + ') — ' + c.render); });
  (fe.filterFields || []).forEach(function(f) { uiChanges.push('Filter: ' + f.label + ' → ' + f.paramName); });
  (fe.actionButtons || []).forEach(function(b) { uiChanges.push('Action: ' + b.label + ' → ' + b.action); });
  L.push('  uiChanges: ' + _arr(uiChanges) + ',');
  L.push('  components: ' + _arr(fe.components) + ',');
  L.push('};');
  L.push('');

  // === CONSTRAINT KỸ THUẬT ===
  L.push('// ════════════════════════════════════════');
  L.push('// CONSTRAINT KỸ THUẬT');
  L.push('// ════════════════════════════════════════');
  L.push('');
  L.push('export const BUSINESS_RULES = ' + _arr(be.businessRules) + ';');
  L.push('');
  L.push('export const RISKS = ' + _arr(del.risks) + ';');
  L.push('');
  L.push('export const ROLLBACK_PLAN = ' + _str(del.rollbackPlan) + ';');
  L.push('');

  // === PATTERN CẦN FOLLOW ===
  L.push('// ════════════════════════════════════════');
  L.push('// PATTERN CẦN FOLLOW');
  L.push('// ════════════════════════════════════════');
  L.push('');
  L.push('export const REFERENCE = {');
  L.push('  module: ' + _str(rf.referenceModule) + ',');
  L.push('  patterns: [');
  L.push("    'src/server/repositories/category.repository.ts — mẫu select',");
  L.push("    'src/admin/features/category/CategoryFilters.tsx — mẫu filter',");
  L.push("    'src/admin/api/categories/route.ts — mẫu route',");
  L.push('  ],');
  L.push('};');
  L.push('');

  // === IMPLEMENTATION ORDER ===
  L.push('// ════════════════════════════════════════');
  L.push('// IMPLEMENTATION ORDER');
  L.push('// ════════════════════════════════════════');
  L.push('');
  L.push('export const IMPLEMENTATION_ORDER = ' + _arr(del.implementationOrder) + ';');
  L.push('');
  L.push('export const ESTIMATED_EFFORT = {');
  L.push('  database: ' + _str(est.database) + ',');
  L.push('  backend: ' + _str(est.backend) + ',');
  L.push('  frontend: ' + _str(est.frontend) + ',');
  L.push('  qa: ' + _str(est.qa) + ',');
  L.push('};');
  L.push('');

  // === DEFINITION OF DONE ===
  L.push('// ════════════════════════════════════════');
  L.push('// DEFINITION OF DONE');
  L.push('// ════════════════════════════════════════');
  L.push('');
  L.push('export const DEFINITION_OF_DONE = [');
  L.push("  'TypeScript strict — không có any, không có ts-ignore',");
  L.push("  'Zod validate đầu vào service trước khi gọi repository',");
  L.push("  'Select tối giản trong repository — không select *',");
  L.push("  'Transaction khi write nhiều bảng',");
  L.push("  'Unit test: validator + service + repository + route',");
  L.push("  'Không break existing tests',");
  L.push("  'Console.log phải xóa hết trước merge',");
  L.push("  'API response giữ nguyên format: { success, data } | { success, error }',");
  L.push('];');

  return L.join('\n');
}

// ═══════════════════════════════════════
// 7. frontend_senior_task.ts — Senior Frontend Dev (10 năm KN)
// ═══════════════════════════════════════
function buildSeniorFrontendTask(j) {
  var m = j.meta || {};
  var a = j.analysis || {};
  var fe = j.frontend || {};
  var be = j.backend || {};
  var del = j.delivery || {};
  var ux = fe.ux || {};
  var rf = del.relatedFiles || {};

  var L = [];
  L.push('/**');
  L.push(' * Senior Frontend Task: ' + (m.name || ''));
  L.push(' * Module: ' + (m.module || '') + ' | Role: Senior Frontend Developer (10 năm KN)');
  L.push(' * Screen: ' + (a.screenTitle || ''));
  L.push(' */');
  L.push('');

  // === TECH STACK ===
  L.push('// ════════════════════════════════════════');
  L.push('// TECH STACK CHÍNH XÁC');
  L.push('// ════════════════════════════════════════');
  L.push('');
  L.push('export const TECH_STACK = {');
  L.push("  framework: 'Next.js 15.x — App Router, RSC',");
  L.push("  react: '19.x — concurrent features, useTransition, useOptimistic',");
  L.push("  typescript: '5.x — strict mode, no any',");
  L.push("  ui: 'Bootstrap 5.3 + Bootstrap Icons 1.11',");
  L.push("  state: 'useState / useReducer — không Redux/Zustand',");
  L.push("  dataFetch: 'fetch() trong server component — không SWR/React Query',");
  L.push("  form: 'controlled component — không react-hook-form',");
  L.push("  dynamic: 'dynamic import ssr:false cho browser API component',");
  L.push("  navigation: 'useRouter, Link từ next/navigation',");
  L.push('};');
  L.push('');

  // === COMPONENT ARCHITECTURE ===
  L.push('// ════════════════════════════════════════');
  L.push('// COMPONENT ARCHITECTURE');
  L.push('// ════════════════════════════════════════');
  L.push('');
  L.push('export const COMPONENT_PATTERN = {');
  L.push("  serverPage: '[NamePage].tsx — load data, truyền props xuống client',");
  L.push("  clientTable: '[Name]Table.tsx — render bảng, nhận items[] qua props',");
  L.push("  clientFilters: '[Name]Filters.tsx — quản lý filter state, push URL',");
  L.push("  clientForm: '[Name]Form.tsx — form state, submit logic, error handling',");
  L.push("  dynamicWrapper: '[Name]FormWrapper.tsx — dynamic import, loading skeleton',");
  L.push('};');
  L.push('');
  L.push('export const DATA_FLOW = [');
  L.push("  'Server Page → fetch data → pass props to Client components',");
  L.push("  'ClientFilters submit → router.push(?search=X) → server re-render',");
  L.push("  'ClientTable DELETE → fetch API → router.refresh()',");
  L.push("  'ClientTable EDIT → router.push(/edit/[id]) hoặc modal state',");
  L.push('];');
  L.push('');

  // === COMPONENTS CẦN SỬA ===
  L.push('// ════════════════════════════════════════');
  L.push('// COMPONENTS CẦN TẠO / SỬA');
  L.push('// ════════════════════════════════════════');
  L.push('');
  L.push('export const UI_COMPONENTS = ' + _arr(fe.components) + ';');
  L.push('');
  L.push('export const FILES_TO_MODIFY = ' + _arr(rf.filesToModify) + ';');
  L.push('');
  L.push('export const FILES_TO_READ = ' + _arr(rf.filesToRead) + ';');
  L.push('');

  // === UI CHANGES ===
  L.push('// ════════════════════════════════════════');
  L.push('// THAY ĐỔI UI CỤ THỂ');
  L.push('// ════════════════════════════════════════');
  L.push('');
  L.push('export const LAYOUT = ' + _str(fe.layoutDescription) + ';');
  L.push('');
  L.push('export const TABLE_COLUMNS = ' + _arr(fe.tableColumns) + ';');
  L.push('');
  L.push('export const FILTER_FIELDS = ' + _arr(fe.filterFields) + ';');
  L.push('');
  L.push('export const ACTION_BUTTONS = ' + _arr(fe.actionButtons) + ';');
  L.push('');

  // === STATE FLOW ===
  L.push('// ════════════════════════════════════════');
  L.push('// STATE MANAGEMENT & FLOW');
  L.push('// ════════════════════════════════════════');
  L.push('');
  L.push('export const STATE_MANAGEMENT = ' + _arr(fe.stateManagement) + ';');
  L.push('');

  // === RENDER CONDITIONS ===
  L.push('// ════════════════════════════════════════');
  L.push('// RENDER CONDITIONS & BEHAVIOR');
  L.push('// ════════════════════════════════════════');
  L.push('');
  L.push('export const EXPECTED_BEHAVIOR = ' + _arr(a.expectedBehavior) + ';');
  L.push('');
  L.push('export const OBSERVED_ISSUES = ' + _arr(a.observedIssues) + ';');
  L.push('');

  // === API INTEGRATION ===
  L.push('// ════════════════════════════════════════');
  L.push('// API INTEGRATION');
  L.push('// ════════════════════════════════════════');
  L.push('');
  var apiLines = (be.endpoints || []).map(function(e) {
    return '  ' + _str(e.method + ' ' + e.path + ' — ' + e.description) + ',';
  });
  L.push('export const API_ENDPOINTS = [');
  L.push(apiLines.join('\n'));
  L.push('];');
  L.push('');

  // === UX DETAIL ===
  L.push('// ════════════════════════════════════════');
  L.push('// UX / INTERACTION DETAIL');
  L.push('// ════════════════════════════════════════');
  L.push('');
  L.push('export const UX = {');
  L.push('  loading: {');
  L.push('    pageLoad: ' + _str(ux.loadingState) + ',');
  L.push("    buttonClick: 'disable + spinner trong button',");
  L.push("    tableAction: 'loading per row',");
  L.push('  },');
  L.push('  error: {');
  L.push("    fieldError: 'class is-invalid + div.invalid-feedback dưới input',");
  L.push("    globalError: 'alert-danger trên đầu form',");
  L.push('    apiError: ' + _str(ux.errorState) + ',');
  L.push('  },');
  L.push('  empty: {');
  L.push('    table: ' + _str(ux.emptyState) + ',');
  L.push('  },');
  L.push('  success: {');
  L.push('    feedback: ' + _str(ux.successFeedback) + ',');
  L.push("    create: 'toast + router.push(list)',");
  L.push("    update: 'toast + router.refresh()',");
  L.push("    delete: 'toast + router.refresh()',");
  L.push('  },');
  L.push('  confirm: {');
  L.push('    beforeDelete: ' + (ux.confirmBeforeDelete ? 'true' : 'false') + ',');
  L.push('    message: ' + _str(ux.confirmMessage) + ',');
  L.push('  },');
  L.push('};');
  L.push('');

  // === CONVENTION ===
  L.push('// ════════════════════════════════════════');
  L.push('// CONVENTION PROJECT');
  L.push('// ════════════════════════════════════════');
  L.push('');
  L.push('export const CONVENTIONS = {');
  L.push("  className: 'Bootstrap 5 utility — không custom CSS trừ khi cần',");
  L.push("  icon: 'Bootstrap Icons — bi-[name]',");
  L.push("  button: 'primary=xanh, success=xanh lá, danger=đỏ, warning=vàng, secondary=xám',");
  L.push("  spacing: 'mb-3, mt-2, gap-2 — không inline style',");
  L.push("  table: 'table table-hover table-bordered align-middle',");
  L.push("  formInput: 'form-control, form-select, form-check-input',");
  L.push("  fileNaming: 'PascalCase — MenuTable.tsx',");
  L.push("  exportStyle: 'named export — export function MenuTable()',");
  L.push("  propsType: 'interface [Name]Props — khai báo trước function',");
  L.push("  eventHandler: 'handle[Event][Target] — handleClickDelete, handleChangeSearch',");
  L.push('};');
  L.push('');

  // === PERFORMANCE ===
  L.push('// ════════════════════════════════════════');
  L.push('// PERFORMANCE CONCERN');
  L.push('// ════════════════════════════════════════');
  L.push('');
  L.push('export const PERFORMANCE = [');
  L.push("  'Memo component nếu nhận props lớn và re-render nhiều',");
  L.push("  'useCallback cho handler truyền vào child',");
  L.push("  'Key dùng id — không dùng index nếu list reorder',");
  L.push("  'Dynamic import cho thư viện nặng',");
  L.push('];');
  L.push('');

  // === DEFINITION OF DONE ===
  L.push('// ════════════════════════════════════════');
  L.push('// DEFINITION OF DONE');
  L.push('// ════════════════════════════════════════');
  L.push('');
  L.push('export const DEFINITION_OF_DONE = [');
  L.push("  'Không có any type — strict TypeScript',");
  L.push("  'Không có console.log còn sót',");
  L.push("  'Không có useEffect dùng sai dependency array',");
  L.push("  'Props đều có type rõ ràng',");
  L.push("  'Key trong list dùng id, không dùng index',");
  L.push("  'Loading state đúng — button disabled khi submit',");
  L.push("  'Error state hiển thị đúng vị trí',");
  L.push("  'router.refresh() sau mỗi mutation',");
  L.push("  'Dynamic import ssr:false cho window/document component',");
  L.push("  'Không inline style — chỉ Bootstrap class',");
  L.push("  'Responsive không vỡ ở 375px',");
  L.push("  'aria-label cho icon-only button',");
  L.push('];');

  return L.join('\n');
}
