#!/bin/bash
# Hook: PostToolUse
# Chạy SAU mỗi tool call của Claude
# Mục đích: tự động hóa các việc lặp lại

TOOL_NAME=$1
TOOL_OUTPUT=$2
EXIT_CODE=$3

# ============================================
# AUTO-LINT: Sau khi write file .js hoặc .ts
# ============================================
if [[ "$TOOL_NAME" == "write_file" ]]; then
  WRITTEN_FILE=$(echo "$TOOL_OUTPUT" | grep -o '"path":"[^"]*"' | cut -d'"' -f4)

  if [[ "$WRITTEN_FILE" =~ \.(js|ts|jsx|tsx)$ ]]; then
    echo "🔍 Auto-lint: $WRITTEN_FILE"
    npx eslint "$WRITTEN_FILE" --fix --quiet 2>/dev/null
    if [ $? -eq 0 ]; then
      echo "✅ Lint passed"
    else
      echo "⚠️  Lint warnings — kiểm tra file trước khi commit"
    fi
  fi
fi

# ============================================
# AUTO-LOG: Ghi log sau mỗi agent hoàn thành
# ============================================
if [[ "$TOOL_NAME" == "bash" ]] && [[ "$EXIT_CODE" == "0" ]]; then
  LOG_DIR="logs/$(date +%Y-%m-%d)"
  mkdir -p "$LOG_DIR"
  echo "[$(date +%H:%M:%S)] Tool: $TOOL_NAME | Status: SUCCESS" >> "$LOG_DIR/pipeline.log"
fi

# ============================================
# NOTIFY: Slack khi pipeline hoàn thành
# ============================================
if echo "$TOOL_OUTPUT" | grep -q '"agent":"publisher"'; then
  if echo "$TOOL_OUTPUT" | grep -q '"status":"success"'; then
    POST_URL=$(echo "$TOOL_OUTPUT" | grep -o '"post_url":"[^"]*"' | cut -d'"' -f4)

    # Gửi Slack notification nếu có SLACK_WEBHOOK_URL
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
      curl -s -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-type: application/json' \
        -d "{\"text\":\"✅ Bài mới đã publish: $POST_URL\"}" > /dev/null
      echo "📨 Slack notification sent"
    fi
  fi
fi

exit 0
