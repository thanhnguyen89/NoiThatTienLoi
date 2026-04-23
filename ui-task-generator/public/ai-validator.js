/**
 * AI JSON Validator — validate output từ Claude (new schema)
 */
function validateUiTaskJson(d) {
  const e = [];
  if (!d || typeof d !== 'object') { e.push('Data không hợp lệ'); return e; }
  // meta
  if (!d.meta) e.push('Thiếu meta');
  else {
    if (!d.meta.name) e.push('Thiếu meta.name');
    if (!d.meta.module) e.push('Thiếu meta.module');
  }
  // analysis
  if (!d.analysis) e.push('Thiếu analysis');
  else {
    if (typeof d.analysis.uiSummary !== 'string') e.push('analysis.uiSummary phải là string');
  }
  // db
  if (!d.db) e.push('Thiếu db');
  else {
    if (!Array.isArray(d.db.fields)) e.push('db.fields phải là array');
  }
  // backend
  if (!d.backend) e.push('Thiếu backend');
  else {
    if (!Array.isArray(d.backend.endpoints)) e.push('backend.endpoints phải là array');
  }
  // frontend
  if (!d.frontend) e.push('Thiếu frontend');
  // qa
  if (!d.qa) e.push('Thiếu qa');
  // delivery
  if (!d.delivery) e.push('Thiếu delivery');
  else {
    if (typeof d.delivery.rollbackPlan !== 'string') e.push('delivery.rollbackPlan phải là string');
  }
  return e;
}
