#!/bin/bash
# Hook: SubagentStop
# Chạy khi một subagent hoàn thành
# Mục đích: validate output, log, cập nhật state

AGENT_NAME=$1
AGENT_OUTPUT=$2
AGENT_STATUS=$3

LOG_DIR="logs/$(date +%Y-%m-%d)"
mkdir -p "$LOG_DIR"
STATE_FILE="/tmp/pipeline-state.json"

# ============================================
# Validate JSON output của agent
# ============================================
if ! echo "$AGENT_OUTPUT" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
  echo "❌ $AGENT_NAME trả về JSON không hợp lệ"
  echo "[$(date +%H:%M:%S)] INVALID JSON from $AGENT_NAME" >> "$LOG_DIR/pipeline.log"
  exit 1
fi

# ============================================
# Lưu output vào pipeline state
# ============================================
if [ ! -f "$STATE_FILE" ]; then
  echo '{"steps":{}}' > "$STATE_FILE"
fi

# Cập nhật state (dùng python vì bash không xử lý JSON tốt)
python3 - <<EOF
import json, sys

with open('$STATE_FILE', 'r') as f:
    state = json.load(f)

state['steps']['$AGENT_NAME'] = {
    'status': '$AGENT_STATUS',
    'timestamp': '$(date -u +%Y-%m-%dT%H:%M:%SZ)',
    'completed': True
}

with open('$STATE_FILE', 'w') as f:
    json.dump(state, f, indent=2)

print(f"✅ State updated: $AGENT_NAME completed")
EOF

# ============================================
# Log
# ============================================
echo "[$(date +%H:%M:%S)] AGENT STOP: $AGENT_NAME | Status: $AGENT_STATUS" >> "$LOG_DIR/pipeline.log"

# ============================================
# Check điểm quan trọng: Editor/QC result
# ============================================
if [[ "$AGENT_NAME" == "editor-qc" ]]; then
  DECISION=$(echo "$AGENT_OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('decision',''))" 2>/dev/null)
  SCORE=$(echo "$AGENT_OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('humanness_score',0))" 2>/dev/null)

  echo "📊 Humanness Score: $SCORE/100 → Decision: $DECISION"

  if [[ "$DECISION" == "REWRITE" ]]; then
    echo "🔄 Score thấp — tự động gửi về Writer Agent"
    echo "[$(date +%H:%M:%S)] REWRITE triggered (score: $SCORE)" >> "$LOG_DIR/pipeline.log"
  fi
fi

exit 0
