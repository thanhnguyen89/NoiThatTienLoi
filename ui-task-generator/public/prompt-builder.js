/**
 * Prompt Builder — build user prompt gửi Claude
 * Hỗ trợ 2 mode: có ảnh hoặc chỉ text
 */
function buildUiAnalysisPrompt({ extraDesc, selectedModule, taskType, priority, hasImage }) {
  var parts = [];
  if (hasImage) {
    parts.push('Phân tích ảnh UI này kết hợp mô tả bên dưới.');
  } else {
    parts.push('Phân tích yêu cầu UI từ mô tả text bên dưới (không có ảnh).');
    parts.push('Hãy suy luận UI hợp lý từ thông tin được cung cấp.');
  }
  if (selectedModule) parts.push('Module: ' + selectedModule);
  if (taskType) parts.push('Loại task: ' + taskType);
  if (priority) parts.push('Priority: ' + priority);
  if (extraDesc) parts.push('=== MÔ TẢ TỪ DEVELOPER (ưu tiên cao) ===\n' + extraDesc);
  parts.push('Trả về DUY NHẤT JSON hợp lệ. Không markdown. Không code fence.');
  return parts.join('\n');
}
