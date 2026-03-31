import { NextRequest, NextResponse } from 'next/server';
import { adminActivityLogRepository } from '@/server/repositories/admin-activity-log.repository';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');
    const userId = searchParams.get('userId') || undefined;

    if (userId) {
      const logs = await adminActivityLogRepository.findByUser(userId, limit);
      return NextResponse.json({ success: true, data: logs });
    }

    const result = await adminActivityLogRepository.findAll(limit, offset);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('GET /admin/api/activity-logs error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi lấy nhật ký' }, { status: 500 });
  }
}
