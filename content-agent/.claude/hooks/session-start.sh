#!/bin/bash
# Hook: SessionStart
# Chạy khi bắt đầu phiên Claude Code mới
# Mục đích: load context, kiểm tra môi trường

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🤖 Content Marketing Agent — Session Start"
echo "📅 $(date '+%A, %d/%m/%Y %H:%M')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ============================================
# Kiểm tra .env
# ============================================
if [ ! -f ".env" ]; then
  echo "⚠️  Chưa có file .env"
  echo "   Chạy: cp .env.example .env và điền API keys"
fi

# Kiểm tra từng API key cần thiết
check_env() {
  if grep -q "^$1=" .env 2>/dev/null && [ -n "$(grep "^$1=" .env | cut -d= -f2)" ]; then
    echo "✅ $1"
  else
    echo "❌ $1 — chưa cấu hình"
  fi
}

echo ""
echo "📋 API Keys:"
check_env "ANTHROPIC_API_KEY"
check_env "TAVILY_API_KEY"
check_env "WORDPRESS_URL"
check_env "WORDPRESS_USERNAME"
check_env "WORDPRESS_APP_PASSWORD"

# ============================================
# Đọc và hiển thị Memory
# ============================================
echo ""
echo "🧠 Project Memory:"
if [ -f ".claude/memory.md" ]; then
  # Hiển thị section "Việc đang làm dở"
  sed -n '/## Việc đang làm dở/,/^## /p' .claude/memory.md | head -15
else
  echo "   Chưa có memory.md"
fi

# ============================================
# Thống kê nhanh
# ============================================
echo ""
echo "📊 Stats:"
if [ -d "logs" ]; then
  TOTAL_LOGS=$(find logs -name "*.log" | wc -l | tr -d ' ')
  echo "   Tổng số lần chạy pipeline: $TOTAL_LOGS"
fi

if [ -d "output" ]; then
  TOTAL_OUTPUT=$(find output -name "*.json" | wc -l | tr -d ' ')
  echo "   Bài đã tạo: $TOTAL_OUTPUT"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💬 Nhập từ khóa để bắt đầu pipeline:"
echo "   VD: viết bài về 'cà phê giảm cân'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
