#!/bin/bash
# Hook: PreToolUse
# Chạy TRƯỚC mỗi tool call của Claude
# Mục đích: chặn các hành động nguy hiểm

TOOL_NAME=$1
TOOL_INPUT=$2

# ============================================
# CHẶN: rm -rf
# ============================================
if [[ "$TOOL_NAME" == "bash" ]]; then
  if echo "$TOOL_INPUT" | grep -qE "rm\s+-rf|rm\s+-r\s+-f"; then
    echo "❌ BLOCKED: 'rm -rf' không được phép. Dùng archive thay thế."
    echo "   Hướng dẫn: mv [file] /archive/[file]-$(date +%Y%m%d)"
    exit 1
  fi
fi

# ============================================
# CHẶN: git push thẳng lên main
# ============================================
if [[ "$TOOL_NAME" == "bash" ]]; then
  if echo "$TOOL_INPUT" | grep -qE "git push.*origin main|git push.*main"; then
    echo "❌ BLOCKED: Không được push thẳng lên main."
    echo "   Hướng dẫn: Tạo branch mới → PR → merge"
    exit 1
  fi
fi

# ============================================
# CHẶN: Ghi đè file .env
# ============================================
if [[ "$TOOL_NAME" == "write_file" ]]; then
  if echo "$TOOL_INPUT" | grep -q '".env"'; then
    echo "❌ BLOCKED: Không được ghi vào .env trực tiếp."
    echo "   Hướng dẫn: Chỉnh sửa thủ công hoặc dùng .env.example"
    exit 1
  fi
fi

# ============================================
# WARNING: Publish lên production
# ============================================
if [[ "$TOOL_NAME" == "bash" ]]; then
  if echo "$TOOL_INPUT" | grep -qE "NODE_ENV=production|--env=production"; then
    echo "⚠️  WARNING: Bạn sắp chạy lệnh trên môi trường production."
    echo "   Xác nhận bằng cách chạy lại với flag --confirm-production"
    # Không exit — chỉ cảnh báo, để Claude quyết định
  fi
fi

exit 0
